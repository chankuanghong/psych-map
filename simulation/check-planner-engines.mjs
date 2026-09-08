// Opt-in live CodeBuddy checks. Writes only a temporary synthetic test store.
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, copyFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { DatabaseSync } from 'node:sqlite'
import { logQuestion } from './question-store.mjs'
import { importQuestions } from './question-learning.mjs'
import { runWeeklyResearch, getReviewDashboard } from './review-engine.mjs'
import { buildEvidenceSnapshot, buildVerifiedResponse } from '../src/data/verifiedEvidence.js'
import { runEvidencePlanner } from '../server/evidencePlanner.js'
import { askCodeBuddyForEvidenceReview } from '../server/codebuddySelector.js'

const source=dirname(fileURLToPath(import.meta.url))
const root=mkdtempSync(join(tmpdir(),'psychmap-planner-live-'))
copyFileSync(join(source,'registry.sqlite'),join(root,'registry.sqlite'))
for(const folder of ['pf_7f3a1c','pf_91bd42','pf_c84e57']) {
  mkdirSync(join(root,'patients',folder),{recursive:true})
  copyFileSync(join(source,'patients',folder,'clinical.sqlite'),join(root,'patients',folder,'clinical.sqlite'))
}
const env={CODEBUDDY_ENABLED:'true'}
const question='Compare overnight assigned-cubicle presence on Day 7 and Day 11. What remains uncertain?'
let snapshot=buildEvidenceSnapshot('PT-003',[7,11],[7,8,9,10,11])
const audit=[]
const answer=await runEvidencePlanner({question,snapshot,professionId:'psychiatry',audit:stage=>audit.push(stage)})
assert.ok(answer.factIds?.length,'Expected source-backed spatial answer')
snapshot={...snapshot,facts:[...snapshot.facts,...answer.facts.filter(f=>!snapshot.facts.some(existing=>existing.id===f.id))]}
const verified=buildVerifiedResponse(question,snapshot,{factIds:answer.factIds},'psychiatry')
assert.equal(verified.verification.status,'pass')
const review=await askCodeBuddyForEvidenceReview({question,snapshot,verifiedResponse:verified,interpretations:answer.interpretations})
assert.equal(review.status,'pass','Independent AI evidence review must pass')
assert.equal(snapshot.facts.find(f=>f.kind==='daily_metric'&&f.day===7&&f.metricId==='overnightRestProxyMins').value,140)
assert.equal(snapshot.facts.find(f=>f.kind==='daily_metric'&&f.day===11&&f.metricId==='overnightRestProxyMins').value,350)
console.log('Question real CLI planner + spatial facts + independent evidence review: PASS')
logQuestion({patientId:'PT-003',folderId:'pf_c84e57',question:'What changed in participation alongside the overnight routine?',professionId:'psychiatry',range:[7,11],selectedDays:[7,8,9,10,11]},{root})
const imported=importQuestions({root,env})
assert.equal(imported.imported,1); assert.equal(imported.codeBuddyReviews,1); assert.equal(imported.failures,0)
assert.equal(importQuestions({root,env}).imported,0)
console.log('Nightly real CLI + SQLite import + repeat-run idempotency: PASS')

const original=new DatabaseSync(join(source,'../data/psych-map.sqlite'),{readOnly:true})
const memory=new DatabaseSync(':memory:')
memory.exec('CREATE TABLE patients(id TEXT,diagnosis TEXT); CREATE TABLE daily_metrics(patient_id TEXT,day INTEGER,payload_json TEXT); CREATE TABLE clinical_events(id INTEGER,patient_id TEXT,day INTEGER,discipline TEXT,title TEXT,description TEXT); CREATE TABLE assessments(patient_id TEXT);')
const patient=original.prepare('SELECT id,diagnosis FROM patients WHERE id=?').get('PT-002')
memory.prepare('INSERT INTO patients VALUES (?,?)').run(patient.id,patient.diagnosis)
for(const row of original.prepare('SELECT patient_id,day,payload_json FROM daily_metrics WHERE patient_id=?').all(patient.id)) memory.prepare('INSERT INTO daily_metrics VALUES (?,?,?)').run(row.patient_id,row.day,row.payload_json)
for(const row of original.prepare('SELECT id,patient_id,day,discipline,title,description FROM clinical_events WHERE patient_id=?').all(patient.id)) memory.prepare('INSERT INTO clinical_events VALUES (?,?,?,?,?,?)').run(row.id,row.patient_id,row.day,row.discipline,row.title,row.description)
memory.prepare('INSERT INTO assessments VALUES (?)').run(patient.id)
original.close()
const research=runWeeklyResearch(memory,{root,env})
assert.equal(research.codeBuddyReviews,1);assert.equal(research.codeBuddyFallbacks,0)
const item=getReviewDashboard(root).items.find(x=>x.kind==='threshold_review')
assert.ok(item.evidence.comparisonPlan)
assert.ok(item.evidence.clinicianAssessment.description)
assert.equal(item.evidence.thresholdProposal,undefined)
console.log('Weekly real CLI plan + deterministic comparison + review SQLite: PASS')
const report={testedAt:new Date().toISOString(),dataMode:'Existing synthetic patient records; real CodeBuddy CLI; isolated test databases',root,question:{text:question,patientId:'PT-003',plan:answer.plan,trace:answer.trace,facts:verified.verification.usedFacts,interpretations:answer.interpretations,review,audit},imported,research,weekly:item.evidence}
writeFileSync(join(root,'engine-results.json'),JSON.stringify(report,null,2))
console.log(JSON.stringify(report,null,2))
memory.close()
