import test from 'node:test'
import assert from 'node:assert/strict'
import { buildEvidenceSnapshot } from '../src/data/verifiedEvidence.js'
import { executeEvidencePlan, runEvidencePlanner, validatePlannedAnswer } from '../server/evidencePlanner.js'

const questions = [
  ['How has the patient been sleeping?', 'sleep observations'],
  ['Has the patient been eating?', 'meal-intake documentation'],
  ['Has the patient been taking medication?', 'medication administration record'],
  ['Has the patient’s mood improved?', 'dated mood assessments'],
  ['Has the patient’s anxiety improved?', 'dated anxiety assessments'],
  ['Have the patient’s psychotic symptoms improved?', 'dated symptom assessments'],
  ['Has the patient reported any suicidal thoughts?', 'explicit dated thoughts assessment'],
  ['Has the patient experienced any medication side effects?', 'tolerability assessment'],
  ['How was the outings or home leave?', 'leave debrief'],
  ['What feedback has the family provided after visiting?', 'attributed family feedback'],
  ["What's the discharge plan?", 'documented discharge plan'],
  ['Suitable for Stepdown care?', 'MDT assessment and service criteria'],
  ['Who will take care of patient after discharge?', 'agreed caregiver arrangements'],
  ['Is the patient willing to continue taking medication after discharge?', 'documented patient preference'],
]

// Stubbed contract evaluations, NOT evidence of live model semantic performance.
for (const [question, needed] of questions) test(`doctor question missing-evidence contract: ${question}`, async () => {
  const snapshot = buildEvidenceSnapshot('PT-001', [1,14], Array.from({length:14},(_,i)=>i+1))
  const packets = []
  const result = await runEvidencePlanner({ question, snapshot, professionId:'psychiatry', call: async packet => {
    packets.push(packet)
    if (packets.length === 1) return {schemaVersion:'psychmap.plan.v1',intent:'Review relevant notes',clarification:null,steps:[{tool:'read_events',kinds:['clinical_event'],days:[1,12]}]}
    return {factIds:[],interpretations:[],answerability:'insufficient',actions:[],missingInformation:[needed]}
  } })
  assert.equal(result.answerability,'insufficient')
  assert.deepEqual(result.missingInformation,[needed])
  assert.deepEqual(result.factIds,[])
  assert.match(packets[0].guardrails,/Denial of intent is not denial of thoughts/)
})

test('existing family note sections are retrievable with exact provenance and patient/date isolation', () => {
  const snapshot = buildEvidenceSnapshot('PT-001',[12,12],[12])
  const plan = {schemaVersion:'psychmap.plan.v1',intent:'Read family feedback',clarification:null,steps:[{tool:'read_events',kinds:['clinical_event'],days:[12]}]}
  const {facts} = executeEvidencePlan(plan,snapshot)
  const feedback = facts.find(f=>f.statement.includes('Sister reported'))
  assert.ok(feedback)
  const source = snapshot.sources.find(s=>s.id===feedback.sourceRecordIds[0])
  assert.equal(source.patientId,'PT-001')
  assert.equal(source.day,12)
  assert.ok(feedback.statement.includes(source.description))
  assert.ok(!buildEvidenceSnapshot('PT-001',[1,1],[1]).sources.some(s=>s.id===source.id))
  assert.ok(!buildEvidenceSnapshot('PT-003',[12,12],[12]).sources.some(s=>s.id===source.id))
})

test('missing information field is bounded, not an arbitrary output object', () => {
  assert.throws(()=>validatePlannedAnswer({factIds:[],interpretations:[],actions:[],answerability:'insufficient',missingInformation:[{claim:'fabricated'}]},[],[1]))
})

test('a redundant contract envelope is normalized without relaxing fact validation', () => {
  const answer={factIds:[],interpretations:[],actions:[],answerability:'insufficient',missingInformation:['Direct clinical observations']}
  assert.deepEqual(validatePlannedAnswer({contract:answer},[],[1]).factIds,[])
  assert.throws(()=>validatePlannedAnswer({contract:{...answer,factIds:['invented'],answerability:'partial'}},[],[1]))
  assert.throws(()=>validatePlannedAnswer({contract:answer,extra:'not allowed'},[],[1]))
})
