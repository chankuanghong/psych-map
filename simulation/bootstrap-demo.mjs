import { existsSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { join } from 'node:path'
import { openPsychMapDatabase } from '../server/database.js'
const root=fileURLToPath(new URL('../',import.meta.url))
const fixtures=['simulation/registry.sqlite',...['pf_7f3a1c','pf_91bd42','pf_c84e57'].map(f=>`simulation/patients/${f}/clinical.sqlite`)]
const count=fixtures.filter(f=>existsSync(join(root,f))).length
function run(script){const r=spawnSync(process.execPath,[script],{cwd:root,stdio:'inherit'});if(r.status!==0)throw new Error(`Bootstrap failed: ${script}`)}
if(count!==0&&count!==fixtures.length)throw new Error('Partial existing fixtures: refusing to overwrite. Use a fresh clone or restore the missing fixture files.')
if(!count)run('simulation/build-simulation.mjs')
const {db}=openPsychMapDatabase();db.close()
run('simulation/migrate-questions.mjs')
console.log('Synthetic demo stores ready. Existing complete fixtures were preserved; no runtime DB is distributed.')
