import fs from 'node:fs'
import path from 'node:path'
const base=new URL('./',import.meta.url)
const results=new URL('./results/',base)
const out=new URL('./published/',base)
fs.mkdirSync(out,{recursive:true})
const clean=s=>s.replace(/\/Users\/[^/]+\/Desktop\/Scanner\/psychmap/g,'<PROJECT_ROOT>').replace(/\/Users\/[^/]+\/Desktop\/Scanner/g,'<WORKSPACE_ROOT>').replace(/\/(?:private\/)?(?:var\/folders\/[^"\s]+|tmp\/psychmap-evaluation-[^/"\s]+)/g,'<ISOLATED_STORE>')
const save=(name,data)=>{const file=new URL(name,out);fs.mkdirSync(path.dirname(file.pathname),{recursive:true});fs.writeFileSync(file,clean(typeof data==='string'?data:JSON.stringify(data,null,2)))}
const cases=JSON.parse(fs.readFileSync(new URL('cases.json',base)))
const latest=new Map(), attempts=[]
for(const run of fs.readdirSync(results).sort()) {
  const root=new URL(run+'/',results)
  if(!fs.existsSync(new URL('summary.json',root)))continue
  const summary=JSON.parse(fs.readFileSync(new URL('summary.json',root)))
  if(fs.existsSync(new URL('INTERRUPTED.md',root)))continue
  for(const r of summary.results) {
    const trace=JSON.parse(fs.readFileSync(new URL(r.id+'.json',root)))
    latest.set(r.id,{run,trace});attempts.push({run,id:r.id,status:r.status,error:r.error,checks:r.checks})
    save(`attempts/${run}/${r.id}.json`,trace)
  }
}
const lines=['# Actual CodeBuddy responses to the 14 doctor questions','',
 'Existing fictional Patient A (PT-001), Days 1–14. These are actual returned source facts and model interpretations from the latest explicitly recorded attempt per case. They are not invented sample answers. Source facts use the deterministic renderer. AI wording is reproduced verbatim. Missing-information requests are suggestions, not patient findings. The eval did not exercise the browser or second reviewer.','']
for(const c of cases.slice(0,14)){
  const {run,trace}=latest.get(c.id);const a=trace.agentOutput
  lines.push(`## ${c.question}`,'',`Result: **${trace.status}**. Coverage: **${a?.answerability||'withheld'}**. Run: ${run}.`,'')
  if(trace.error)lines.push(`Withheld: ${trace.error}`,'')
  if(a?.clarification)lines.push(a.clarification,'')
  const facts=trace.verified?.verification.usedFacts||[]
  if(facts.length){lines.push('### Recorded evidence','');for(const f of facts)lines.push(`- ${f.statement} Sources: \`${f.sourceRecordIds.join('`, `')}\``);lines.push('')}
  if(a?.interpretations?.length){lines.push('### CodeBuddy interpretation','');for(const i of a.interpretations)lines.push(`> ${i.text}`,'')}
  else if(a?.answerability==='insufficient')lines.push('**No supported clinical answer was established from the retrieved evidence.**','')
  if(a?.missingInformation?.length){lines.push('### Additional information requested','',...a.missingInformation.map(i=>`- ${i}`),'')}
  lines.push(`Full input/plan/tool/output: [JSON](attempts/${run}/${c.id}.json).`,'')
}
save('DOCTOR_ANSWERS.md',lines.join('\n'))
const judge={judge:'Codex source-by-source review, not a clinician validation',
 findings:[
 'Initial suicidal-thoughts wording conflated a direct reference to ideation with denial of intent. Refined guidance; latest output explicitly distinguishes intent from thoughts.',
 'Mood and leave plans exceeded field length limits. Explicit concise planning instructions fixed the observed cases.',
 'Side-effects response mixed insufficient with selected facts and contained a range not supported by its cited statements. Refined output contract and numeric guidance.',
 'Some responses wrapped valid objects inside contract. Parser normalizes only that single redundant envelope, then validates all facts and inner fields. It does not repair invented values.',
 'Weekly aligned plus unclear clinician direction passed the initial allowlist but was semantically inconsistent. Added consistency gate and supplied existing shower-change signal. Latest weekly output is unclear with no threshold change.',
 'A repeated nightly test returned string null, triggering fallback and the wrong category. Exact string-null normalization preserves the allowlist and corrected the observed transport error.',
 'Latest selected answers preserve major distinctions: activation is not mood, food preparation is not intake, transport support is not a caregiving agreement, prescription is not taking medication.',
 'Residual limits: model-selected windows can be sparse and biased; statements about missing documentation apply only to retrieved records. Scale examples in missing-information requests are model suggestions, not requirements or validated clinical recommendations.',
 'Latest successes combine targeted runs; this is not a claim that a new full run or every paraphrase will succeed.'
 ]}
save('JUDGE_REVIEW.json',judge)
save('attempt-history.json',attempts)
for(const [id,name] of [['spatial','engine-1'],['engine-2','engine-2'],['engine-3','engine-3']]){
  const {run,trace}=latest.get(id)
  const intro=id==='spatial'?'Question → JSON plan → validated application tools → cited synthesis. The requested endpoint comparison is 140 versus 350 minutes.':id==='engine-2'?'Two synthetic questions → CodeBuddy category → SQLite intent counts → pending review → isolated approval/revocation. Exact-repeat matching and all DB operations are application code.':'Existing PT-002 records → model-selected windows → code-calculated spatial means → bounded alignment review → SQLite recommendation. No live threshold changes.'
  save(name+'.json',trace)
  save(name+'.md',`# ${name}: full execution example\n\n${intro}\n\nActual run: ${run}. Status: **${trace.status}**. This is an observable execution trace, not private internal reasoning. Synthetic inputs, full prompts, model outputs, tool results and checks follow.\n\n\`\`\`json\n${JSON.stringify(trace,null,2)}\n\`\`\`\n`)
}
save('REPORT.md',`# CodeBuddy evaluation and refinement\n\n8 September 2026. Existing synthetic data only.\n\n## Results\n\n70 JavaScript tests and 35 RFID software tests pass locally. Build and dependency checks are documented in the repository publication notes.\n\n|Case|Latest result|Run|\n|---|---|---|\n${[...latest].map(([id,{run,trace}])=>`|${id}|${trace.status}|${run}|`).join('\n')}\n\nLatest results aggregate targeted retests, not a single 100% run. Initial full run had four structured-output failures. A later nightly repeat exposed a string-null transport error. All attempts are retained in [attempt history](attempt-history.json). An earlier sandbox run timed out before answering and is excluded from semantic scoring.\n\n## Human-readable outputs\n\n- [Actual doctor answers](DOCTOR_ANSWERS.md)\n- [Engine 1 full trace](engine-1.md)\n- [Engine 2 full trace](engine-2.md)\n- [Engine 3 full trace](engine-3.md)\n- [Codex judge review and changes](JUDGE_REVIEW.json)\n\n## Limits\n\nEngine 1 live checks cover planner, deterministic retrieval, synthesis and factual rendering, not the HTTP/browser path or second reviewer. Engines 2/3 execute real job functions against isolated stores. Clock triggers and new physical RFID reads were not tested. Automatic checks validate specific contracts; source-based Codex review is fallible and is not clinical validation. A successful source link does not establish clinical truth. No literature access or optimum threshold estimation is claimed.\n`)
console.log(`Published reviewed synthetic results to ${out.pathname}`)
