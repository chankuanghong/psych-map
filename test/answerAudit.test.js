import test from 'node:test'
import assert from 'node:assert/strict'
import { DatabaseSync } from 'node:sqlite'
import { createAnswerAudit } from '../server/answerAudit.js'
import { buildEvidenceSnapshot, buildVerifiedResponse } from '../src/data/verifiedEvidence.js'

test('answer audit retains original sources, accepted facts, and withheld fabricated IDs', () => {
  const db = new DatabaseSync(':memory:')
  try {
    const record = createAnswerAudit(db)
    const snapshot = buildEvidenceSnapshot('PT-001', [1, 14], Array.from({length:14}, (_,i)=>i+1))
    const manifest = { factIds: [snapshot.facts[0].id, 'invented-fact'] }
    const response = { ...buildVerifiedResponse('What changed?', snapshot, manifest, 'psychiatry'), status:'answered' }
    const input = { questionUuid:'question-1', request:{question:'What changed?'}, snapshot, proposal:{manifest}, response }
    const auditId = record(input)
    const saved = db.prepare('SELECT * FROM answer_audit WHERE audit_id = ?').get(auditId)
    assert.deepEqual(JSON.parse(saved.snapshot_json), JSON.parse(JSON.stringify(snapshot)))
    assert.equal(JSON.parse(saved.response_json).verification.rejected[0].id, 'invented-fact')
    assert.equal(db.prepare('SELECT count(*) AS n FROM answer_audit_claims WHERE audit_id = ?').get(auditId).n, 1)
    snapshot.sources[0].title = 'Changed later'
    assert.notEqual(JSON.parse(saved.snapshot_json).sources[0].title, 'Changed later')
    assert.notEqual(record(input), auditId) // Follow-up/retry never overwrites history.
    createAnswerAudit(db) // Safe on application restart.
    assert.equal(db.prepare('SELECT count(*) AS n FROM answer_audit').get().n, 2)
    db.exec('DROP TABLE answer_audit')
    assert.throws(() => record(input)) // Caller must not deliver an unaudited answer.
  } finally { db.close() }
})

test('a fact pointing to an absent source is withheld', () => {
  const snapshot = buildEvidenceSnapshot('PT-001', [1, 1], [1])
  snapshot.facts[0].sourceRecordIds = ['nonexistent-source']
  const result = buildVerifiedResponse('What changed?', snapshot, {factIds:[snapshot.facts[0].id]}, 'psychiatry')
  assert.equal(result.verification.usedFacts.length, 0)
  assert.match(result.verification.rejected[0].reason, /absent/)
})
