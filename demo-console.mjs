import { existsSync } from 'node:fs'
import { randomUUID } from 'node:crypto'
import net from 'node:net'
import { networkInterfaces } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawn, spawnSync } from 'node:child_process'

const psychMapRoot = dirname(fileURLToPath(import.meta.url))
const workspaceRoot = dirname(psychMapRoot)
const rfidRoot = existsSync(join(psychMapRoot, 'rfid-scanner')) ? join(psychMapRoot, 'rfid-scanner') : join(workspaceRoot, 'RFID Scanner')
const psychMapDb = join(psychMapRoot, 'data', 'psych-map.sqlite')
const noOpen = process.argv.includes('--no-open')
const exitAfterCheck = process.argv.includes('--exit-after-check')
const children = []

const heading = title => console.log(`\n=== ${title} ===`)
const pass = message => console.log(`✓ ${message}`)
const info = message => console.log(`• ${message}`)

function getLanAddress() {
  const interfaces = networkInterfaces()
  const candidates = Object.entries(interfaces).flatMap(([name, addresses]) =>
    (addresses || []).filter(address => address.family === 'IPv4' && !address.internal).map(address => ({ name, address: address.address })),
  )
  return candidates.find(candidate => candidate.name === 'en0')?.address || candidates[0]?.address || null
}

function canListen(port, host = '127.0.0.1') {
  return new Promise(resolve => {
    const server = net.createServer()
    server.once('error', () => resolve(false))
    server.listen(port, host, () => server.close(() => resolve(true)))
  })
}

async function choosePort(preferred) {
  for (let port = preferred; port < preferred + 20; port += 1) {
    if (await canListen(port, '0.0.0.0')) return port
  }
  throw new Error(`No free local port available from ${preferred} to ${preferred + 19}`)
}

async function readJson(url, timeoutMs = 2_000) {
  const response = await fetch(url, { signal: AbortSignal.timeout(timeoutMs), cache: 'no-store' })
  const payload = await response.json()
  if (!response.ok) throw new Error(`${url} returned ${response.status}: ${payload.error || payload.status || 'unhealthy'}`)
  return payload
}

async function waitForJson(url, predicate, timeoutMs = 20_000) {
  const deadline = Date.now() + timeoutMs
  let lastError
  while (Date.now() < deadline) {
    try {
      const payload = await readJson(url)
      if (predicate(payload)) return payload
      lastError = new Error(`${url} returned an unexpected readiness response`)
    } catch (error) { lastError = error }
    await new Promise(resolve => setTimeout(resolve, 400))
  }
  throw lastError || new Error(`Timed out waiting for ${url}`)
}

function startService(name, command, args, cwd, env = process.env) {
  const child = spawn(command, args, { cwd, env, stdio: 'inherit' })
  child.once('error', error => console.error(`${name} failed to start: ${error.message}`))
  children.push({ name, child })
  info(`${name} started as PID ${child.pid}`)
  return child
}

function waitForServiceProcess(child, readiness) {
  const exited = new Promise((_, reject) => {
    if (child.exitCode !== null) return reject(new Error(`Service exited during startup with code ${child.exitCode}`))
    child.once('exit', code => reject(new Error(`Service exited during startup with code ${code}`)))
  })
  return Promise.race([readiness, exited])
}

function findSqliteNode() {
  const candidates = [process.env.PSYCHMAP_NODE, '/opt/homebrew/bin/node', '/usr/local/bin/node', 'node'].filter(Boolean)
  for (const candidate of [...new Set(candidates)]) {
    const probe = spawnSync(candidate, ['-e', "import('node:sqlite')"], { stdio: 'ignore' })
    if (probe.status === 0) return candidate
  }
  throw new Error('Psych-MAP requires Node.js 22 or newer (with node:sqlite). Install or select a current Node.js release and relaunch.')
}

async function ensurePsychMap() {
  let existing = null
  try { existing = await readJson('http://127.0.0.1:5175/api/health') } catch {}
  if (existing?.status === 'healthy' && existing.instanceId && existing.database?.path === psychMapDb && existing.codebuddy?.enabled && existing.questionWorker?.enabled && existing.researchWorker?.enabled) {
    pass('Reusing the current Psych-MAP app, nightly scanner and weekly researcher on port 5175')
    return 5175
  }
  const viteCli = join(psychMapRoot, 'node_modules', 'vite', 'bin', 'vite.js')
  const nodeExecutable = findSqliteNode()
  let lastError
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const port = await choosePort(5175)
    if (port !== 5175) info(`Port 5175 is already in use; starting a fresh current-UI demo instance on port ${port}`)
    const instanceId = randomUUID()
    const child = startService('Psych-MAP + question worker', nodeExecutable, [viteCli, '--host', '0.0.0.0', '--port', String(port), '--strictPort'], psychMapRoot, {
      ...process.env,
      PSYCHMAP_DB: psychMapDb,
      CODEBUDDY_ENABLED: 'true',
      CODEBUDDY_QUESTION_SCAN_ENABLED: 'true',
      CODEBUDDY_RESEARCH_ENABLED: 'true',
      QUESTION_CRON_ENABLED: 'true',
      RESEARCH_CRON_ENABLED: 'true',
      PSYCHMAP_INSTANCE_ID: instanceId,
    })
    try {
      await waitForServiceProcess(child, waitForJson(`http://127.0.0.1:${port}/api/health`, payload => payload.status === 'healthy' && payload.instanceId === instanceId && payload.codebuddy?.enabled && payload.questionWorker?.enabled && payload.researchWorker?.enabled && payload.database?.path === psychMapDb))
      pass(`Psych-MAP backend, nightly scanner and weekly researcher are healthy on port ${port}`)
      return port
    } catch (error) {
      lastError = error
      if (!child.killed && child.exitCode === null) child.kill('SIGTERM')
      info(`Psych-MAP startup attempt was interrupted; trying the next available port`)
    }
  }
  throw lastError || new Error('Psych-MAP could not start')
}

async function verifyCodeBuddy(port) {
  const url = `http://127.0.0.1:${port}/api/health/codebuddy`
  try {
    return await readJson(url, 130_000)
  } catch (error) {
    info('The first CodeBuddy health request was interrupted; confirming the backend and retrying once')
    await waitForJson(`http://127.0.0.1:${port}/api/health`, payload => payload.status === 'healthy', 10_000)
    return readJson(url, 130_000)
  }
}

async function ensureRfid() {
  let existingStatus = null
  try {
    existingStatus = await readJson('http://127.0.0.1:8765/api/status')
  } catch {}
  if (existingStatus) {
    if (existingStatus.database?.path === psychMapDb) {
      pass('Reusing the RFID dashboard and shared SQLite database on port 8765')
      if (existingStatus.reader.connected) pass('YRM100 reader is connected')
      else info('The existing RFID worker is reconnecting; no duplicate reader will be started')
      return 8765
    }
    if (existingStatus.reader.connected) {
      throw new Error(`RFID service on port 8765 is using ${existingStatus.database?.path || 'an unknown database'}, not ${psychMapDb}`)
    }
    info(`Port 8765 has a disconnected RFID worker; starting an auto-detecting demo instance (${existingStatus.reader.error || 'waiting for reader'})`)
  }
  const port = await choosePort(8765)
  const args = ['dashboard.py', '--host', '127.0.0.1', '--http-port', String(port), '--allow-missing-reader']
  if (process.env.RFID_PORT) args.push('--port', process.env.RFID_PORT)
  startService('RFID dashboard + reader worker', 'python3', args, rfidRoot, { ...process.env, PSYCHMAP_DB: psychMapDb })
  const status = await waitForJson(
    `http://127.0.0.1:${port}/api/status`,
    payload => payload.scanner_id && payload.reader && payload.database?.path === psychMapDb,
  )
  pass(`RFID service and shared SQLite database are healthy on port ${port}`)
  if (status.reader.connected) pass('YRM100 reader is connected')
  else info(`YRM100 is not connected yet; the worker will keep retrying (${status.reader.error || 'waiting for reader'})`)
  return port
}

function openPage(url) {
  if (noOpen) return info(`Browser opening skipped: ${url}`)
  const result = existsSync('/Applications/Google Chrome.app')
    ? spawnSync('open', ['-na', 'Google Chrome', '--args', '--new-window', url])
    : spawnSync('open', [url])
  if (result.status !== 0) throw new Error(`Could not open ${url}`)
}

function stopChildren() {
  for (const { child } of children) {
    if (!child.killed) child.kill('SIGTERM')
  }
}

async function main() {
  console.log('Psych-MAP one-click demo launcher')
  console.log('De-identified demonstration data — no direct patient identifiers')
  const lanAddress = getLanAddress()

  heading('1. Start local services')
  const [psychMapPort, rfidPort] = await Promise.all([ensurePsychMap(), ensureRfid()])

  heading('2. Verify CodeBuddy')
  const codebuddy = await verifyCodeBuddy(psychMapPort)
  if (codebuddy.status !== 'healthy' || codebuddy.mode !== 'full' || codebuddy.verification?.status !== 'pass' || codebuddy.evidenceReview?.status !== 'pass') throw new Error('CodeBuddy did not pass the two-pass startup check')
  pass(`CodeBuddy selected ${codebuddy.selectedFactCount} evidence fact${codebuddy.selectedFactCount === 1 ? '' : 's'} and passed deterministic plus second-pass verification`)

  const pages = [
    ['RFID map', `http://127.0.0.1:${rfidPort}/`],
    ['Questions admin console', `http://127.0.0.1:${psychMapPort}/admin`],
    ['Tablet experience', `http://127.0.0.1:${psychMapPort}/`],
  ]
  heading('3. Open demo views')
  for (const [name, url] of pages) { info(`${name}: ${url}`); openPage(url) }

  heading('4. Phone / tablet on the same Wi-Fi')
  if (lanAddress) {
    console.log(`Open this address on the device: http://${lanAddress}:${psychMapPort}/`)
    console.log('The laptop and device must be on the same Wi-Fi network. Keep this Terminal window open.')
  } else {
    console.log('No active Wi-Fi/LAN IPv4 address was detected. Connect the laptop to Wi-Fi and relaunch.')
  }

  heading('Demo ready')
  console.log('All three views are ready. Keep this window open while demonstrating.')
  console.log('Press Control-C to stop services started by this launcher.')
  if (children.length && !exitAfterCheck) await new Promise(resolve => process.once('SIGINT', resolve))
}

process.on('SIGTERM', () => { stopChildren(); process.exit(0) })
process.on('exit', stopChildren)

main().then(stopChildren).catch(error => {
  console.error(`\n✗ Demo launch failed: ${error.message}`)
  stopChildren()
  process.exitCode = 1
})
