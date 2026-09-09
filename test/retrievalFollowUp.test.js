import test from 'node:test'
import assert from 'node:assert/strict'
import { buildEvidenceSnapshot } from '../src/data/verifiedEvidence.js'
import { runEvidencePlanner, executeEvidencePlan, validateFollowUp } from '../server/evidencePlanner.js'

const snapshot = buildEvidenceSnapshot('PT-001',[1,14],Array.from({length:14},(_,i)=>i+1))
const events = days => ({tool:'read_events',kinds:['clinical_event'],days})
const plan = {schemaVersion:'psychmap.plan.v1',intent:'Read available notes',clarification:null,steps:[events([1])]}
const missing = followUp => ({factIds:[],interpretations:[],answerability:'insufficient',actions:[],missingInformation:['Direct family feedback is needed.'],followUp})
const followUp = {reason:'Check the recorded family meeting',steps:[events([12])]}
const run = async answers => {
  let calls=0; const packets=[]; const audit=[]
  const result=await runEvidencePlanner({question:'What did the family report?',snapshot,professionId:'psychiatry',audit:s=>audit.push(s),call:async packet=>{
    packets.push(packet); const next=answers[calls++]; assert.ok(next,'Unexpected extra model call');return typeof next==='function'?next(packet):next
  }})
  return {result,calls,packets,audit}
}
test('follow-up retrieves useful evidence once and records the complete attempt',async()=>{
  const {result,calls,audit}=await run([plan,missing(followUp),packet=>{
    const fact=packet.facts.find(f=>f.statement.includes('Sister reported'))
    assert.ok(fact)
    return {factIds:[fact.id],interpretations:[],answerability:'sufficient',actions:[],followUp:null}
  }])
  assert.equal(calls,3)
  assert.equal(result.retrievalAttempts.length,2)
  assert.ok(result.retrievalAttempts[1].newFactIds.includes(result.factIds[0]))
  assert.equal(result.facts.length,new Set(result.facts.map(f=>f.id)).size)
  assert.ok(audit.some(s=>s.status==='follow_up_proposed'))
  assert.ok(audit.some(s=>s.status==='follow_up_retrieved'))
})
test('genuinely missing evidence stops after one follow-up with information request',async()=>{
  const {result,calls}=await run([plan,missing(followUp),missing(null)])
  assert.equal(calls,3); assert.equal(result.answerability,'insufficient');assert.equal(result.factIds.length,0)
  assert.ok(result.missingInformation.length)
})
test('duplicate, regrouped and out-of-scope follow-ups are blocked',()=>{
  const previous={...plan,steps:[events([1,2])]}
  for(const steps of [[events([2,1])],[events([1]),events([2])],[events([99])],[{...events([12]),patientId:'PT-002'}]]) {
    assert.throws(()=>validateFollowUp({...followUp,steps},previous,snapshot))
  }
})
test('a third retrieval is rejected instead of chasing a passing answer',async()=>{
  await assert.rejects(run([plan,missing(followUp),missing({reason:'Try again',steps:[events([13])]})]),/limit reached/)
})
test('a sufficient first answer makes no extra model call',async()=>{
  const {calls,result}=await run([plan,packet=>({factIds:[packet.facts[0].id],interpretations:[],answerability:'sufficient',actions:[]})])
  assert.equal(calls,2);assert.equal(result.retrievalAttempts.length,1)
})
test('empty initial retrieval can recover through a different allowed source',async()=>{
  const empty={...plan,steps:[{tool:'read_events',kinds:['interaction_event'],days:[1]}]}
  // Use an empty permitted event kind without changing any patient records.
  const fixture={...snapshot,facts:snapshot.facts.filter(f=>f.kind!=='interaction_event')}
  let calls=0
  const result=await runEvidencePlanner({question:'Family feedback?',snapshot:fixture,professionId:'psychiatry',call:async packet=>{
    calls++; if(calls===1)return empty;if(calls===2){assert.equal(packet.facts.length,0);return missing(followUp)}
    return {factIds:[packet.facts[0].id],interpretations:[],answerability:'sufficient',actions:[]}
  }})
  assert.equal(calls,3);assert.ok(result.facts.length)
})
test('new comparison results cannot overwrite original comparison IDs',()=>{
  const compare=days=>({...plan,steps:[{tool:'compare_periods',metrics:['overnightRestProxyMins'],beforeDays:[days[0]],afterDays:[days[1]]}]})
  const first=executeEvidencePlan(compare([1,2]),snapshot)
  const second=executeEvidencePlan(compare([12,13]),snapshot,1)
  assert.notEqual(first.facts[0].id,second.facts[0].id)
})
