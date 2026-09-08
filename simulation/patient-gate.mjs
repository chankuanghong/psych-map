import { execFileSync } from 'node:child_process'
import { lstatSync, realpathSync } from 'node:fs'
import { dirname, join, relative, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

const simulationRoot = dirname(fileURLToPath(import.meta.url))
const patientsRoot = realpathSync(join(simulationRoot, 'patients'))
const registryPath = join(simulationRoot, 'registry.sqlite')

const sqlString = value => `'${String(value).replaceAll("'", "''")}'`

export function queryJson(databasePath, sql) {
  const output = execFileSync('sqlite3', ['-json', databasePath, sql], { encoding: 'utf8' }).trim()
  return output ? JSON.parse(output) : []
}

export function resolvePatientDatabase(patientId, folderId, root = simulationRoot) {
  if (!/^PT-\d{3}$/.test(patientId) || !/^pf_[a-f0-9]{6}$/.test(folderId)) {
    throw new Error('Invalid patient or folder identifier format')
  }

  const resolvedRegistryPath = join(root, 'registry.sqlite')
  const resolvedPatientsRoot = realpathSync(join(root, 'patients'))
  const rows = queryJson(
    resolvedRegistryPath,
    `SELECT patient_id, folder_id, display_name, synthetic FROM patients WHERE patient_id = ${sqlString(patientId)}`,
  )
  const registryPatient = rows[0]
  if (!registryPatient || registryPatient.folder_id !== folderId) {
    throw new Error('Patient/folder mismatch: access denied before opening a clinical database')
  }

  const requestedDirectory = join(resolvedPatientsRoot, folderId)
  if (lstatSync(requestedDirectory).isSymbolicLink()) throw new Error('Symlinked patient folders are not allowed')
  const realDirectory = realpathSync(requestedDirectory)
  const pathFromRoot = relative(resolvedPatientsRoot, realDirectory)
  if (pathFromRoot.startsWith(`..${sep}`) || pathFromRoot === '..' || pathFromRoot === '') {
    throw new Error('Resolved patient folder is outside the allowed patient root')
  }

  return {
    registryPatient,
    patientDirectory: realDirectory,
    databasePath: join(realDirectory, 'clinical.sqlite'),
    questionsPath: join(realDirectory, 'questions.sqlite'),
  }
}

export function listRegisteredPatients(root = simulationRoot) {
  return queryJson(join(root, 'registry.sqlite'), 'SELECT patient_id, folder_id, synthetic FROM patients WHERE synthetic = 1 ORDER BY patient_id')
}

const average = (rows, field) => rows.length
  ? Math.round(rows.reduce((sum, row) => sum + row[field], 0) / rows.length)
  : 0

export function buildPatientEvidence({ patientId, folderId, fromDay = 7, toDay = 11 }) {
  if (!Number.isInteger(fromDay) || !Number.isInteger(toDay) || fromDay < 1 || toDay < fromDay) {
    throw new Error('Invalid day range')
  }

  const { registryPatient, databasePath } = resolvePatientDatabase(patientId, folderId)
  const profile = queryJson(databasePath, 'SELECT * FROM patient_profile LIMIT 1')[0]
  if (!profile || profile.patient_id !== patientId) throw new Error('Clinical database identity mismatch')

  const metrics = queryJson(
    databasePath,
    `SELECT * FROM daily_metrics WHERE patient_id = ${sqlString(patientId)} AND day BETWEEN ${fromDay} AND ${toDay} ORDER BY day`,
  )
  const contextualEvents = queryJson(
    databasePath,
    `SELECT day, discipline, event_type, title, description FROM clinical_events WHERE patient_id = ${sqlString(patientId)} AND day BETWEEN ${Math.max(1, fromDay - 1)} AND ${toDay} ORDER BY day, event_id`,
  )
  if (!metrics.length) throw new Error('No metrics exist for the selected patient and period')

  const splitAt = Math.ceil(metrics.length / 2)
  const firstHalf = metrics.slice(0, splitAt)
  const secondHalf = metrics.slice(splitAt)

  return {
    accessScope: {
      patientId,
      folderId,
      registryMatched: true,
      clinicalDatabaseIdentityMatched: true,
      synthetic: registryPatient.synthetic === 1,
    },
    patient: profile,
    selectedPeriod: { fromDay, toDay, days: metrics.length },
    dailyMetrics: metrics,
    deterministicSummary: {
      assignedCubicleOvernight: {
        firstDayMinutes: metrics[0].assigned_cubicle_overnight_minutes,
        lastDayMinutes: metrics.at(-1).assigned_cubicle_overnight_minutes,
      },
      otherCubiclePresence: {
        firstDayMinutes: metrics[0].other_cubicle_minutes,
        lastDayMinutes: metrics.at(-1).other_cubicle_minutes,
      },
      averageVisitorMinutes: {
        firstHalf: average(firstHalf, 'visitor_minutes'),
        secondHalf: average(secondHalf, 'visitor_minutes'),
      },
    },
    contextualClinicalEvents: contextualEvents,
    interpretationRules: [
      'All records are synthetic hackathon data.',
      'Location is presence only and does not prove sleep, interaction, consent or friendship.',
      'Describe chronology and association, never medication causality.',
      'A DAV episode is reported only when explicitly documented by nursing.',
      'Clinical decisions remain with the treating MDT.',
    ],
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const [patientId = 'PT-003', folderId = 'pf_c84e57', from = '7', to = '11'] = process.argv.slice(2)
  try {
    console.log(JSON.stringify(buildPatientEvidence({
      patientId,
      folderId,
      fromDay: Number(from),
      toDay: Number(to),
    }), null, 2))
  } catch (error) {
    console.error(`Access denied: ${error.message}`)
    process.exit(1)
  }
}
