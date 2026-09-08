import { parentPort, workerData } from 'node:worker_threads'
import { DatabaseSync } from 'node:sqlite'
import { runLockedQuestionImport } from './question-job-lock.mjs'
import { runWeeklyResearch } from './review-engine.mjs'
if (parentPort) {
  let db
  try {
    const {kind,env,root,databasePath,now}=workerData
    const options={env,...(root?{root}:{}),...(now?{now:new Date(now)}:{})}
    let result
    if(kind==='questions')result=runLockedQuestionImport(options)
    else if(kind==='research'){db=new DatabaseSync(databasePath,{readOnly:true});result=runWeeklyResearch(db,options)}
    else throw new Error('Unknown worker job')
    parentPort.postMessage({result})
  } catch(error){parentPort.postMessage({error:error.message})} finally{db?.close()}
}
