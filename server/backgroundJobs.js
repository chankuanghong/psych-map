import { Worker } from 'node:worker_threads'
let active = false
export function runBackgroundJob(kind, options) {
  if (!['questions','research'].includes(kind)) return Promise.reject(new Error('Unknown background job'))
  if (active) return Promise.reject(new Error('A learning job is already running; wait for it to finish.'))
  active = true
  return new Promise((resolve,reject)=>{
    const worker = new Worker(new URL('../simulation/job-worker.mjs',import.meta.url),{workerData:{kind,...options}})
    let settled=false
    const finish=(error,value)=>{if(settled)return;settled=true;active=false;error?reject(error):resolve(value)}
    worker.once('message',message=>message.error?finish(new Error(message.error)):finish(null,message.result))
    worker.once('error',error=>finish(error))
    worker.once('exit',code=>{if(!settled)finish(new Error(`Learning worker exited without a result (${code})`))})
  })
}
