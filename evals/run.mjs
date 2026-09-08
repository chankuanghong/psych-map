// Opt-in live evaluation. Only existing synthetic fixtures; all DB writes isolated.
import { readFileSync, writeFileSync, mkdirSync, mkdtempSync, copyFileSync, existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { spawnSync, execFileSync } from 'node:child_process'
import { DatabaseSync } from 'node:sqlite'
import { buildEvidenceSnapshot, buildVerifiedResponse } from '../src/data/verifiedEvidence.js'
import { runEvidencePlanner, callStructuredCodeBuddy } from '../server/evidencePlanner.js'
import { logQuestion } from '../simulation/question-store.mjs'
import { importQuestions } from '../simulation/question-learning.mjs'
import { runWeeklyResearch, getReviewDashboard, decideReviewItem } from '../simulation/review-engine.mjs'

if (!process.argv.includes('--live')) throw new Error('Use --live to authorise CodeBuddy calls')
const selectedIds=process.argv.find(a=>a.startsWith('--cases='))?.slice(8).split(',')
const cases=JSON.parse(readFileSync(new URL('./cases.json',import.meta.url),'utf8')).filter(c=>!selectedIds||selectedIds.includes(c.id))
const out=new URL(`./results/${new Date().toISOString().replaceAll(':','-')}/`,import.meta.url)
mkdirSync(out,{recursive:true})
const save=(name,data)=>writeFileSync(new URL(name,out),typeof data==='string'?data:JSON.stringify(data,null,2))
const results=[]
const metadata={startedAt:new Date().toISOString(),commit:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),workingTree:'dirty; inspect input packets for exact prompts',model:'fast-model',mode:'live CodeBuddy, synthetic fixtures; no clinical validation',scope:'Engine 1 planner/tools/synthesis/rendering, NOT HTTP/browser or second AI reviewer. Engines 2/3 real job functions in isolated stores.'}
save('metadata.json',metadata)
console.log(`Results: ${out.pathname}`)
const check=(checks,name,condition)=>checks.push({name,passed:Boolean(condition)})
async function questionCase(c) {
  const days=c.days||Array.from({length:14},(_,i)=>i+1)
  let snapshot=buildEvidenceSnapshot(c.patientId||'PT-001',[days[0],days.at(-1)],days)
  const trace={case:c,inputSnapshot:snapshot,calls:[],stages:[],checks:[]}
  try {
    const answer=await runEvidencePlanner({question:c.question,snapshot,professionId:'psychiatry',audit:s=>trace.stages.push(s),call:async input=>{
      const call={input,startedAt:new Date().toISOString()};trace.calls.push(call)
      try {call.output=await callStructuredCodeBuddy(input);return call.output} catch(e){call.error=e.message;throw e} finally {call.finishedAt=new Date().toISOString()}
    }})
    trace.agentOutput=answer
    if(c.expected==='clarification') check(trace.checks,'planner asks clarification',answer.clarification&&answer.trace.length===0)
    else {
      check(trace.checks,'clear question gets answer or explicit evidence gap, not clarification',!answer.clarification)
      if(c.expected==='partial_or_insufficient') {
        check(trace.checks,'does not claim complete evidence', ['partial','insufficient'].includes(answer.answerability))
        check(trace.checks,'identifies additional information',answer.missingInformation?.length>0)
      } else check(trace.checks,'returns relevant evidence',answer.factIds?.length>0)
      snapshot={...snapshot,facts:[...snapshot.facts,...(answer.facts||[]).filter(f=>!snapshot.facts.some(s=>s.id===f.id))]}
      trace.verified=buildVerifiedResponse(c.question,snapshot,{factIds:answer.factIds||[]},'psychiatry')
      check(trace.checks,'selected facts have resolvable sources',trace.verified.verification.rejected.length===0)
      if(c.requiredSourceText) check(trace.checks,'selects family feedback source',trace.verified.verification.usedFacts.some(f=>f.statement.includes(c.requiredSourceText)))
      if(c.metric) {
        check(trace.checks,'fixture endpoints equal expected values',c.values.every((v,i)=>snapshot.facts.some(f=>f.kind==='daily_metric'&&f.metricId===c.metric&&f.day===[7,11][i]&&f.value===v)))
        check(trace.checks,'agent actually selects endpoint comparison',trace.verified.verification.usedFacts.some(f=>f.metricId===c.metric&&f.value?.first===140&&f.value?.second===350)||c.values.every(v=>trace.verified.verification.usedFacts.some(f=>f.metricId===c.metric&&f.value===v)))
      }
    }
    trace.status=trace.checks.every(c=>c.passed)?'pass':'fail'
    trace.semanticReview='Human review required; automatic checks do not validate all meaning.'
  } catch(e) {trace.status=/timed out|exited|ENOENT/.test(e.message)?'error':'fail';trace.error=e.message;trace.safeOutcome='No planner result returned; invalid output withheld.'}
  save(`${c.id}.json`,trace);results.push({id:c.id,status:trace.status,checks:trace.checks,error:trace.error})
  console.log(`${c.id}: ${trace.status}`)
  save('summary.json',{...metadata,results})
}
// Bounded concurrency, no retries hidden from the report.
let next=0
await Promise.all(Array.from({length:3},async()=>{while(next<cases.length) await questionCase(cases[next++])}))
if(process.argv.includes('--questions-only')) {
  save('summary.json',{...metadata,finishedAt:new Date().toISOString(),results})
  process.exit(results.some(r=>r.status!=='pass')?1:0)
}

const root=mkdtempSync(join(tmpdir(),'psychmap-evaluation-'))
copyFileSync('simulation/registry.sqlite',join(root,'registry.sqlite'))
for(const folder of ['pf_7f3a1c','pf_91bd42','pf_c84e57']){mkdirSync(join(root,'patients',folder),{recursive:true});copyFileSync(join('simulation/patients',folder,'clinical.sqlite'),join(root,'patients',folder,'clinical.sqlite'))}
const env={CODEBUDDY_ENABLED:'true'}
const tracedRun=trace=>(command,args,options)=>{
  const entry={command,arguments:args,startedAt:new Date().toISOString()};trace.calls.push(entry)
  const result=spawnSync(command,args,options)
  Object.assign(entry,{finishedAt:new Date().toISOString(),exitCode:result.status,stdout:result.stdout,stderr:result.stderr,error:result.error?.message})
  return result
}
const learning={engine:2,calls:[],checks:[],inputs:[]}
try {
  for(const professionId of ['nursing','psychology']) {
    const input={patientId:'PT-003',folderId:'pf_c84e57',question:'How much time was recorded in the corridor compared with the assigned cubicle?',professionId,range:[7,11],selectedDays:[7,8,9,10,11]}
    learning.inputs.push(input);logQuestion(input,{root})
  }
  learning.job=importQuestions({root,env,run:tracedRun(learning)})
  learning.repeat=importQuestions({root,env,run:tracedRun(learning)})
  const db=new DatabaseSync(join(root,'organization/question-learning.sqlite'),{readOnly:true})
  learning.catalog=db.prepare('SELECT * FROM intents').all();learning.decisions=db.prepare('SELECT * FROM question_decisions').all();db.close()
  learning.review=getReviewDashboard(root)
  check(learning.checks,'real model no fallback',learning.job.codeBuddyReviews>0&&learning.job.codeBuddyFallbacks===0)
  check(learning.checks,'correct clustering and category',learning.catalog.length===1&&learning.catalog[0].category==='location_roaming'&&learning.catalog[0].total_count===2)
  check(learning.checks,'idempotent second scan',learning.repeat.imported===0)
  const pending=learning.review.items.find(i=>i.kind==='blind_spot'&&i.status==='pending')
  check(learning.checks,'new class pending human approval',!!pending)
  if(pending){decideReviewItem(pending.review_id,'accepted','Synthetic evaluation approval',root);learning.afterApproval=getReviewDashboard(root);decideReviewItem(pending.review_id,'ignored','Synthetic evaluation revocation',root);learning.afterRevocation=getReviewDashboard(root);check(learning.checks,'approval activates policy',learning.afterApproval.policies.some(p=>p.category===pending.category&&p.profession_id===pending.profession_id&&p.active===1));check(learning.checks,'revocation deactivates policy',learning.afterRevocation.policies.some(p=>p.category===pending.category&&p.profession_id===pending.profession_id&&p.active===0))}
  learning.status=learning.checks.every(c=>c.passed)?'pass':'fail'
} catch(e){learning.status='error';learning.error=e.message}
save('engine-2.json',learning);results.push({id:'engine-2',status:learning.status,checks:learning.checks,error:learning.error});console.log(`engine-2: ${learning.status}`)
if(process.argv.includes('--learning-only')) { save('summary.json',{...metadata,finishedAt:new Date().toISOString(),results});process.exit(learning.status==='pass'?0:1) }

const research={engine:3,calls:[],checks:[]}
const original=new DatabaseSync('data/psych-map.sqlite',{readOnly:true});const memory=new DatabaseSync(':memory:')
try {
  memory.exec('CREATE TABLE patients(id TEXT,diagnosis TEXT); CREATE TABLE daily_metrics(patient_id TEXT,day INTEGER,payload_json TEXT); CREATE TABLE clinical_events(id INTEGER,patient_id TEXT,day INTEGER,discipline TEXT,title TEXT,description TEXT); CREATE TABLE assessments(patient_id TEXT);')
  research.input={}
  for(const [table,fields] of [['patients','id,diagnosis'],['daily_metrics','patient_id,day,payload_json'],['clinical_events','id,patient_id,day,discipline,title,description'],['assessments','patient_id']]) {
    const rows=original.prepare(`SELECT ${fields} FROM ${table} WHERE ${table==='patients'?'id':'patient_id'}=?`).all('PT-002');research.input[table]=rows
    const insert=memory.prepare(`INSERT INTO ${table} VALUES (${fields.split(',').map(()=>'?').join(',')})`)
    for(const row of rows)insert.run(...fields.split(',').map(f=>row[f]))
  }
  const before=memory.prepare('SELECT payload_json FROM daily_metrics ORDER BY day').all()
  research.job=runWeeklyResearch(memory,{root,env,run:tracedRun(research)})
  research.output=getReviewDashboard(root).items.filter(i=>i.kind!=='blind_spot')
  check(research.checks,'real model planning and review without fallback',research.job.codeBuddyReviews===1&&research.job.codeBuddyFallbacks===0)
  const item=research.output.find(i=>i.kind==='threshold_review')
  check(research.checks,'cited clinician and comparison plan',item?.evidence?.comparisonPlan&&item?.evidence?.clinicianAssessment?.description)
  if(item){decideReviewItem(item.review_id,'accepted','Retain suggestion only; no threshold change',root);research.afterReview=getReviewDashboard(root).items.find(i=>i.review_id===item.review_id);check(research.checks,'review recorded',research.afterReview.status==='accepted');check(research.checks,'no numerical threshold proposal',item.evidence.thresholdProposal===undefined)}
  check(research.checks,'patient data unchanged',JSON.stringify(before)===JSON.stringify(memory.prepare('SELECT payload_json FROM daily_metrics ORDER BY day').all()))
  research.status=research.checks.every(c=>c.passed)?'pass':'fail'
}catch(e){research.status='error';research.error=e.message}finally{memory.close();original.close()}
save('engine-3.json',research);results.push({id:'engine-3',status:research.status,checks:research.checks,error:research.error});console.log(`engine-3: ${research.status}`)
save('summary.json',{...metadata,finishedAt:new Date().toISOString(),results,isolatedStore:root})
for(const [name,file,description] of [['Engine 1','spatial.json','Question → model plan → validated tools → source-backed synthesis'],['Engine 2','engine-2.json','Questions → model classification → SQLite catalog → pending review → isolated approval/revocation'],['Engine 3','engine-3.json','Existing spatial/clinical records → model windows → code calculations → model alignment → review suggestion']]) {
  if(!existsSync(new URL(file,out))) continue
  const trace=JSON.parse(readFileSync(new URL(file,out),'utf8'))
  save(`${file.replace('.json','.md')}`,`# ${name}: actual execution trace\n\n${description}.\n\nStatus: **${trace.status}**. This contains observable inputs/outputs, not private reasoning. Tool calls are application-controlled; model built-in tools are disabled. Full records below are synthetic.\n\n\`\`\`json\n${JSON.stringify(trace,null,2)}\n\`\`\`\n`)
}
save('REPORT.md',`# Live CodeBuddy evaluation\n\n${metadata.startedAt}\n\n${metadata.scope}\n\n|Case|Result|\n|---|---|\n${results.map(r=>`|${r.id}|${r.status}|`).join('\n')}\n\nFailures are retained; no silent retries. Passing contracts is not clinical correctness. Review each case's expected review criteria and source-linked statements manually. See spatial.md, engine-2.md and engine-3.md for full observable execution traces.\n`)
process.exitCode=results.some(r=>r.status!=='pass')?1:0
