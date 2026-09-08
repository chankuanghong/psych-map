import test from 'node:test'
import assert from 'node:assert/strict'
import { EventEmitter } from 'node:events'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import { psychMapInsightPlugin } from '../server/insightApi.js'

test('normal API answers persist their full audit before delivery; audit failure blocks delivery', async () => {
  const dbPath = join(mkdtempSync(join(tmpdir(), 'psychmap-delivery-')), 'app.sqlite')
  let handler
  psychMapInsightPlugin({ PSYCHMAP_DB: dbPath, CODEBUDDY_ENABLED: 'false', QUESTION_CRON_ENABLED: 'false', RESEARCH_CRON_ENABLED: 'false' })
    .configureServer({ middlewares: { use(fn) { handler = fn } } })
  const requestAnswer = async () => {
    const request = new EventEmitter()
    Object.assign(request, { url: '/api/insight', method: 'POST', socket: { remoteAddress: '127.0.0.1' } })
    let payload
    const response = { setHeader() {}, end(value) { payload = JSON.parse(value) } }
    const pending = handler(request, response, () => assert.fail('Unexpected routing'))
    request.emit('data', JSON.stringify({ patientId: 'PT-001', folderId: 'pf_7f3a1c', conversationId: 'audit-regression', question: 'What feedback has the family provided after visiting?', range: [1,14], selectedDays: Array.from({length:14},(_,i)=>i+1), professionId:'psychiatry' }))
    request.emit('end')
    await pending
    return { status: response.statusCode, payload }
  }
  const result = await requestAnswer()
  assert.equal(result.status, 200, JSON.stringify(result.payload))
  assert.equal(result.payload.status, 'answered')
  assert.ok(result.payload.auditId)
  const db = new DatabaseSync(dbPath)
  try {
    const row = db.prepare('SELECT * FROM answer_audit WHERE audit_id=?').get(result.payload.auditId)
    assert.equal(row.patient_id, 'PT-001')
    assert.equal(JSON.parse(row.response_json).answer, result.payload.answer)
    assert.ok(JSON.parse(row.snapshot_json).sources.length)
    db.exec('DROP TABLE answer_audit')
    const failed = await requestAnswer()
    assert.equal(failed.status, 500)
    assert.equal(failed.payload.answer, undefined)
  } finally { db.close() }
})
