import test from 'node:test'
import assert from 'node:assert/strict'
import { buildEvidenceSnapshot, buildVerifiedResponse } from '../src/data/verifiedEvidence.js'
import { validateEvidencePlan, executeEvidencePlan, validatePlannedAnswer, runEvidencePlanner } from '../server/evidencePlanner.js'
import { planAdaptiveComparison } from '../simulation/review-engine.mjs'
import { openReviewStore, getReviewDashboard, decideReviewItem, refreshQuestionReviewQueue } from '../simulation/review-engine.mjs'
import { migrateLearningStore } from '../simulation/question-learning.mjs'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { runBackgroundJob } from '../server/backgroundJobs.js'

const snapshot = buildEvidenceSnapshot('PT-003',[7,11],[7,8,9,10,11])
const plan = {schemaVersion:'psychmap.plan.v1',intent:'Compare overnight endpoints',clarification:null,steps:[{tool:'compare_periods',metrics:['overnightRestProxyMins'],beforeDays:[7],afterDays:[11]}]}
test('planner calculates requested windows from source facts, not model numbers',()=>{
  const result=executeEvidencePlan(plan,snapshot)
  assert.deepEqual(result.facts[0].value,{first:140,second:350})
  assert.equal(result.facts[0].sourceRecordIds.length,2)
  assert.equal(result.trace[0].returned,1)
})
test('planner rejects tools, extra fields, metrics and out-of-scope or overlapping days',()=>{
  for(const step of [{tool:'sql',query:'DROP TABLE patients'}, {tool:'read_metrics',metrics:['diagnosis'],days:[7]}, {tool:'read_events',kinds:['clinical_event'],days:[99]}, {...plan.steps[0],afterDays:[7]}, {...plan.steps[0],patientId:'PT-001'}]) assert.throws(()=>validateEvidencePlan({...plan,steps:[step]},snapshot))
})
test('planner distinguishes clarification from executing tools',()=>{
  const clarify={...plan,clarification:'Which recorded medication change?',steps:[]}
  assert.equal(validateEvidencePlan(clarify,snapshot),clarify)
  assert.throws(()=>validateEvidencePlan({...clarify,steps:plan.steps},snapshot))
})
test('synthesis must cite retrieved facts, not another available snapshot fact',()=>{
  const {facts}=executeEvidencePlan(plan,snapshot)
  const answer={factIds:[facts[0].id],interpretations:[{text:'The location pattern changed; this does not establish sleep.',factIds:[facts[0].id]}],answerability:'partial',actions:[]}
  assert.deepEqual(validatePlannedAnswer(answer,facts,[7,11]),answer)
})
test('synthesis rejects invented references, numbers and unsupported sufficient answers',()=>{
  const {facts}=executeEvidencePlan(plan,snapshot)
  const base={factIds:[facts[0].id],interpretations:[],answerability:'sufficient',actions:[]}
  assert.throws(()=>validatePlannedAnswer({...base,factIds:['fact:day-7:activityMins']},facts,[7,11]))
  assert.throws(()=>validatePlannedAnswer({...base,interpretations:[{text:'Recovered in 999 days',factIds:[facts[0].id]}]},facts,[7,11]))
  assert.throws(()=>validatePlannedAnswer({...base,factIds:[]},facts,[7,11]))
})
test('planner orchestration executes structured tools and records stages',async()=>{
  const audit=[];let count=0
  const result=await runEvidencePlanner({question:'What changed overnight?',snapshot,professionId:'psychiatry',audit:s=>audit.push(s.status),call:async packet=>{
    count++
    if(count===1)return plan
    assert.equal(packet.facts[0].id,'fact:planned:0:overnightRestProxyMins')
    return {factIds:[packet.facts[0].id],interpretations:[],answerability:'sufficient',actions:[]}
  }})
  assert.equal(count,2);assert.deepEqual(audit,['planning','plan_proposed','retrieved','answer_proposed','synthesized']);assert.equal(result.facts.length,1)
})
test('explicit empty selection does not silently select unrelated fallback facts',()=>{
  const result=buildVerifiedResponse('Unanswerable question',snapshot,{factIds:[]},'psychiatry')
  assert.equal(result.verification.status,'fail');assert.equal(result.verification.usedFacts.length,0)
})
test('weekly planner chooses allowed non-overlapping windows and clinician reference',()=>{
  const rows=[1,2,3,4,5,6].map(day=>({day}));const clinical=[{id:42,day:6,title:'Review'}]
  const env={CODEBUDDY_RESEARCH_ENABLED:'true'}
  const result=planAdaptiveComparison(rows,clinical,{env,run:()=>({status:0,stdout:JSON.stringify({beforeDays:[1,2],afterDays:[5,6],clinicalEventId:42})})})
  assert.equal(result.tool,'compare_spatial_periods')
  assert.throws(()=>planAdaptiveComparison(rows,clinical,{env,run:()=>({status:0,stdout:JSON.stringify({beforeDays:[1,2],afterDays:[2,3],clinicalEventId:42})})}))
})
test('multiple cases with the same diagnosis remain separate in review and decisions',()=>{
  const root=mkdtempSync(join(tmpdir(),'psychmap-case-test-'));const db=openReviewStore(root)
  for(const id of ['a','b']) db.prepare("INSERT INTO review_items(review_id,kind,status,category,diagnosis,title,summary,recommendation,evidence_json,created_at_utc) VALUES (?,'threshold_review','pending','longitudinal_change','same diagnosis','Review','Summary','Keep unchanged',?,'2026-09-07')").run(id,JSON.stringify({caseRef:id}))
  db.close();assert.equal(getReviewDashboard(root).items.filter(i=>i.kind==='threshold_review').length,2)
  decideReviewItem('a','accepted','reviewed',root)
  assert.equal(getReviewDashboard(root).items.find(i=>i.review_id==='b').status,'pending')
})
test('ignoring a previously accepted topic actually deactivates its policy',()=>{
  const root=mkdtempSync(join(tmpdir(),'psychmap-revoke-test-'))
  const db=openReviewStore(root);db.close()
  decideReviewItem('demo_history_psychiatry_routines','ignored','Disable for review',root)
  assert.equal(getReviewDashboard(root).policies.find(p=>p.profession_id==='psychiatry'&&p.category==='routine_self_care_proxy').active,0)
})
test('review question totals do not multiply across profession joins',()=>{
  const root=mkdtempSync(join(tmpdir(),'psychmap-count-test-'));migrateLearningStore(root)
  const db=openReviewStore(root)
  db.prepare("INSERT INTO intents VALUES ('x','Question','location_roaming',5,'2026-09-07','2026-09-07','covered','2026-09-07')").run()
  db.prepare("INSERT INTO intent_professions VALUES ('x','nursing',2,'2026-09-07'),('x','psychology',3,'2026-09-07')").run()
  db.close();refreshQuestionReviewQueue(root)
  const item=getReviewDashboard(root).items.find(i=>i.kind==='blind_spot'&&i.status==='pending'&&i.category==='location_roaming')
  assert.equal(item.evidence.totalCount,5)
})
test('weekly background worker reads the application DB and writes only its review store',async()=>{
  const root=mkdtempSync(join(tmpdir(),'psychmap-worker-test-'))
  const result=await runBackgroundJob('research',{root,env:{CODEBUDDY_ENABLED:'false'},databasePath:fileURLToPath(new URL('../data/psych-map.sqlite',import.meta.url))})
  assert.equal(result.status,'completed');assert.ok(result.patientCount>0)
  assert.ok(getReviewDashboard(root).items.some(i=>i.kind==='threshold_review'))
})
