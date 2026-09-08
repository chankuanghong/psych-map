import { execFileSync, spawn } from 'node:child_process'
import { lstatSync, realpathSync } from 'node:fs'
import { dirname } from 'node:path'
import { resolvePatientDatabase } from '../simulation/patient-gate.mjs'
import { buildCodeBuddyArgs } from './codebuddySelector.js'

export const READONLY_SQL_SCHEMA_VERSION = 'psychmap.readonly-sql.v1'
export const MAX_QUERY_ROWS = 200

export const READONLY_TABLES = Object.freeze({
  daily_metrics: Object.freeze([
    'day',
    'assigned_cubicle_overnight_minutes',
    'other_cubicle_minutes',
    'visitor_minutes',
    'structured_activity_minutes',
    'shower_area_minutes',
    'zone_transitions',
  ]),
  clinical_events: Object.freeze([
    'event_id',
    'day',
    'discipline',
    'event_type',
    'title',
    'description',
  ]),
})

const MANIFEST_KEYS = Object.freeze([
  'schemaVersion', 'patientId', 'folderId', 'table', 'columns',
  'fromDay', 'toDay', 'order', 'limit', 'sql',
])

function parseJsonOutput(output) {
  const unfence = value => String(value).trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '')
  const outer = JSON.parse(unfence(output))
  const envelope = Array.isArray(outer) ? [...outer].reverse().find(item => item?.type === 'result') : outer
  const result = envelope?.result ?? envelope
  return typeof result === 'string' ? JSON.parse(unfence(result)) : result
}

function assertExactKeys(manifest) {
  if (!manifest || Array.isArray(manifest) || typeof manifest !== 'object') throw new Error('SQL manifest must be an object')
  const keys = Object.keys(manifest).sort()
  const expected = [...MANIFEST_KEYS].sort()
  if (keys.length !== expected.length || keys.some((key, index) => key !== expected[index])) {
    throw new Error('SQL manifest has missing or unexpected fields')
  }
}

export function buildCanonicalReadOnlySql({ patientId, table, columns, fromDay, toDay, order, limit }) {
  const ordering = table === 'clinical_events' ? `day ${order}, event_id ${order}` : `day ${order}`
  return `SELECT ${columns.join(', ')} FROM ${table} WHERE patient_id = '${patientId}' AND day BETWEEN ${fromDay} AND ${toDay} ORDER BY ${ordering} LIMIT ${limit}`
}

export function validateReadOnlySqlManifest(manifest, scope) {
  assertExactKeys(manifest)
  if (manifest.schemaVersion !== READONLY_SQL_SCHEMA_VERSION) throw new Error('Unsupported SQL manifest schema')
  if (manifest.patientId !== scope.patientId || manifest.folderId !== scope.folderId) throw new Error('SQL manifest crossed the authorized patient scope')

  const allowedColumns = READONLY_TABLES[manifest.table]
  if (!allowedColumns) throw new Error('SQL table is not allowlisted')
  if (!Array.isArray(manifest.columns) || manifest.columns.length < 1 || manifest.columns.length > allowedColumns.length) throw new Error('SQL columns are invalid')
  if (new Set(manifest.columns).size !== manifest.columns.length || !manifest.columns.includes('day') || manifest.columns.some(column => !allowedColumns.includes(column))) {
    throw new Error('SQL column is not allowlisted or day is missing')
  }

  const availableDays = new Set(scope.availableDays)
  if (!Number.isInteger(manifest.fromDay) || !Number.isInteger(manifest.toDay) || manifest.fromDay > manifest.toDay || !availableDays.has(manifest.fromDay) || !availableDays.has(manifest.toDay)) {
    throw new Error('SQL day range is outside the authorized scope')
  }
  if (manifest.fromDay !== scope.fromDay || manifest.toDay !== scope.toDay) throw new Error('SQL day range does not match the server-resolved period')
  if (!['ASC', 'DESC'].includes(manifest.order)) throw new Error('SQL order is invalid')
  if (!Number.isInteger(manifest.limit) || manifest.limit < 1 || manifest.limit > MAX_QUERY_ROWS) throw new Error('SQL limit is invalid')

  const sql = buildCanonicalReadOnlySql(manifest)
  if (manifest.sql.trim().replace(/\s+/g, ' ') !== sql) throw new Error('Proposed SQL does not match the canonical read-only query')
  return Object.freeze({ ...manifest, columns: Object.freeze([...manifest.columns]), sql })
}

export function executeReadOnlySql(manifest, scope, { root } = {}) {
  const validated = validateReadOnlySqlManifest(manifest, scope)
  const gated = resolvePatientDatabase(scope.patientId, scope.folderId, root)
  if (lstatSync(gated.databasePath).isSymbolicLink() || !lstatSync(gated.databasePath).isFile()) throw new Error('Clinical database must be a regular non-symlink file')
  if (dirname(realpathSync(gated.databasePath)) !== gated.patientDirectory) throw new Error('Clinical database escaped the authorized patient folder')
  const identityRows = execFileSync('sqlite3', ['-readonly', '-json', gated.databasePath, 'SELECT patient_id FROM patient_profile LIMIT 1'], { encoding: 'utf8' }).trim()
  if (JSON.parse(identityRows || '[]')[0]?.patient_id !== scope.patientId) throw new Error('Clinical database identity mismatch')
  const output = execFileSync('sqlite3', ['-readonly', '-json', gated.databasePath, validated.sql], { encoding: 'utf8' }).trim()
  return {
    schemaVersion: READONLY_SQL_SCHEMA_VERSION,
    scope: { patientId: scope.patientId, folderId: scope.folderId, fromDay: validated.fromDay, toDay: validated.toDay },
    query: validated.sql,
    columns: validated.columns,
    rows: output ? JSON.parse(output) : [],
  }
}

export function askCodeBuddyForReadOnlySql({ question, patientId, folderId, availableDays, fromDay, toDay, timeoutMs = 30_000 }) {
  const prompt = JSON.stringify({
    task: 'Translate the user request into exactly one allowlisted SQLite SELECT manifest. Return JSON only. Copy the exact patientId and folderId. Do not use paths, joins, subqueries, functions, expressions, aliases, comments, semicolons, PRAGMA, WITH, UNION, ATTACH, or any write operation. The sql field must exactly match the canonicalTemplate after substituting fields.',
    schemaVersion: READONLY_SQL_SCHEMA_VERSION,
    userRequest: String(question).slice(0, 1000),
    authorizedScope: { patientId, folderId, availableDays, requiredDayRange: { fromDay, toDay } },
    allowlistedTables: READONLY_TABLES,
    requiredFields: MANIFEST_KEYS,
    rules: {
      columns: 'One or more unique allowlisted columns; day is required.',
      range: 'Copy requiredDayRange exactly. The application has already resolved the user wording and UI selection.',
      order: ['ASC', 'DESC'],
      limit: `integer 1 through ${MAX_QUERY_ROWS}`,
    },
    canonicalTemplate: "SELECT {columns joined by comma-space} FROM {table} WHERE patient_id = '{patientId}' AND day BETWEEN {fromDay} AND {toDay} ORDER BY day {order}{clinical_events only: comma-space event_id space order} LIMIT {limit}",
  })

  return new Promise((resolve, reject) => {
    const child = spawn('codebuddy', buildCodeBuddyArgs(prompt), { stdio: ['ignore', 'pipe', 'pipe'] })
    let stdout = ''; let stderr = ''
    const timer = setTimeout(() => { child.kill('SIGTERM'); reject(new Error('CodeBuddy SQL generation timed out')) }, timeoutMs)
    child.stdout.on('data', chunk => { if (stdout.length < 100_000) stdout += chunk })
    child.stderr.on('data', chunk => { if (stderr.length < 10_000) stderr += chunk })
    child.on('error', error => { clearTimeout(timer); reject(error) })
    child.on('close', code => {
      clearTimeout(timer)
      if (code !== 0) return reject(new Error(stderr.trim() || `CodeBuddy exited ${code}`))
      try { resolve(parseJsonOutput(stdout)) } catch (error) { reject(error) }
    })
  })
}
