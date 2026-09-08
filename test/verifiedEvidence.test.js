import test from 'node:test'
import assert from 'node:assert/strict'
import {
  buildEvidenceSnapshot,
  buildVerifiedResponse,
  selectFactsHeuristically,
  verifyClaimManifest,
} from '../src/data/verifiedEvidence.js'
import { formatTimestamp24 } from '../src/utils/time24.js'

test('formats model-facing timestamps as Singapore 24-hour minute values', () => {
  assert.equal(formatTimestamp24('2026-08-06T02:30:59.999Z'), '2026-08-06 10:30')
})

test('builds a patient-scoped snapshot with stable provenance', () => {
  const snapshot = buildEvidenceSnapshot('PT-003', [7, 11], [7, 8, 9, 10, 11])
  const repeated = buildEvidenceSnapshot('PT-003', [7, 11], [7, 8, 9, 10, 11])
  assert.equal(snapshot.patient.id, 'PT-003')
  assert.deepEqual(snapshot.scope.selectedDays, [7, 8, 9, 10, 11])
  assert.ok(snapshot.sources.length > 0)
  assert.ok(snapshot.sources.every(source => source.patientId === 'PT-003'))
  assert.ok(snapshot.facts.every(fact => fact.sourceRecordIds.length > 0))
  assert.deepEqual(snapshot.sourceRecordIds, repeated.sourceRecordIds)
  assert.equal(new Set(snapshot.sourceRecordIds).size, snapshot.sourceRecordIds.length)
})

test('assigns resolvable IDs to location, activity, interaction and clinical source records', () => {
  const snapshot = buildEvidenceSnapshot('PT-001', [6, 10], [6, 7, 8, 9, 10])
  assert.deepEqual([...new Set(snapshot.sources.map(source => source.kind))].sort(), ['activity', 'clinical', 'interaction', 'location'])
  assert.ok(snapshot.sources.every(source => /^source:(location|clinical|activity|interaction):PT-001:[a-f0-9]{8}$/.test(source.id)))
  const result = buildVerifiedResponse('What clinical and activity records were documented?', snapshot, { factIds: selectFactsHeuristically('clinical activity records', snapshot) }, 'psychiatry')
  assert.ok(result.citedSources.length > 0)
  assert.ok(result.evidenceRows.filter(row => row.status === 'used').every(row => row.sourceRecords.length > 0))
})

test('selects the family-session evidence without letting the model write values', () => {
  const snapshot = buildEvidenceSnapshot('PT-003', [7, 11], [7, 8, 9, 10, 11])
  const factIds = selectFactsHeuristically('I have a family session soon. Based on the latest days, how has the patient been?', snapshot)
  assert.deepEqual(factIds.slice(0, 3), ['fact:endpoint:overnightRestProxyMins', 'fact:endpoint:otherCubicleMins', 'fact:comparison:visitorMins'])
  assert.ok(factIds.slice(3).every(id => /^fact:source:clinical:PT-003:[a-f0-9]{8}$/.test(id)))
  const result = buildVerifiedResponse('family progress', snapshot, { factIds }, 'psychiatry')
  assert.equal(result.verification.status, 'pass')
  assert.match(result.answer, /2h 20m on Day 7 to 5h 50m on Day 11/)
  assert.match(result.answer, /3h 30m on Day 7 to 1h 10m on Day 11/)
  assert.ok(result.evidenceRows.some(row => row.status === 'unused'))
})

test('rejects an unknown or cross-patient fact ID', () => {
  const snapshot = buildEvidenceSnapshot('PT-003', [7, 11], [7, 8, 9, 10, 11])
  const result = verifyClaimManifest(snapshot, {
    factIds: ['fact:day-7:overnightRestProxyMins', 'fact:clinical:PT-001:1'],
  })
  assert.equal(result.status, 'warning')
  assert.equal(result.usedFacts.length, 1)
  assert.equal(result.rejected.length, 1)
})
