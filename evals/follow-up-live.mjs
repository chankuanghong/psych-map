// Controlled synthetic eval: only the first plan is fixed; all synthesis is live.
import { mkdirSync, writeFileSync } from 'node:fs'
import { runEvidencePlanner, callStructuredCodeBuddy } from '../server/evidencePlanner.js'
import { buildEvidenceSnapshot } from '../src/data/verifiedEvidence.js'

const snapshot = buildEvidenceSnapshot('PT-001',[1,14],Array.from({length:14},(_,i)=>i+1))
const report = { fixture:'Existing fictional PT-001, Days 1–14',
  mode:'Controlled test: initial plan fixed to Day 1; subsequent synthesis and follow-up selection use real CodeBuddy. Not an end-to-end autonomous planning test.',
  question:'What feedback has the family provided after visiting?', stages:[], calls:[] }
let first=true
try {
  report.output=await runEvidencePlanner({question:report.question,snapshot,professionId:'psychiatry',audit:stage=>report.stages.push(stage),call:async packet=>{
    if(first){first=false;return {schemaVersion:'psychmap.plan.v1',intent:'Read initial clinical notes',clarification:null,steps:[{tool:'read_events',kinds:['clinical_event'],days:[1]}]}}
    const call={input:packet};report.calls.push(call);call.output=await callStructuredCodeBuddy(packet);return call.output
  }})
  report.checks={oneFollowUp:report.output.retrievalAttempts.length===2,
    correctFamilyEvidence:report.output.factIds.some(id=>report.output.facts.find(f=>f.id===id)?.statement.includes('Sister reported')),
    atMostTwoLiveCalls:report.calls.length<=2}
  report.status=Object.values(report.checks).every(Boolean)?'pass':'fail'
} catch(error){report.status='error';report.error=error.message}
mkdirSync(new URL('./results/',import.meta.url),{recursive:true})
const output=new URL(`./results/follow-up-${new Date().toISOString().replaceAll(':','-')}.json`,import.meta.url)
writeFileSync(output,JSON.stringify(report,null,2)+'\n')
console.log(JSON.stringify({status:report.status,checks:report.checks,error:report.error,output:output.pathname}))
if(report.status!=='pass')process.exitCode=1
