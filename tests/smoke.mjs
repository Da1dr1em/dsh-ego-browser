/**
 * End-to-end smoke test for dsh-ego-browser.
 *
 * Stage 1: load the built plugin module and check its exports.
 * Stage 2: guide assets load and section extraction works.
 * Stage 3: ego_browser_status path (--doctor) — does not need the browser host.
 * Stage 4: ego_browser_run path — launches the persistent browser host and
 *          runs a trivial script through the real CLI.
 *
 * Stage 4 spawns a real Edge/Chrome instance (writes its profile under
 * %LOCALAPPDATA%), so it must run outside the session file sandbox.
 */

import { EgoBrowserEngine } from '../lib/engine.js'
import { topicText } from '../lib/guidance.js'
import * as plugin from '../lib/index.js'

const failures = []
const check = (name, ok, detail = '') => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  -- ' + detail : ''}`)
  if (!ok) failures.push(name)
}

// Stage 1: module surface
check('plugin exports', plugin.name === 'ego-browser' && Array.isArray(plugin.inject) && typeof plugin.apply === 'function' && typeof plugin.Config === 'function', `name=${plugin.name} inject=${JSON.stringify(plugin.inject)}`)
check('announcement text present', typeof plugin.EGO_BROWSER_GUIDANCE === 'string' && plugin.EGO_BROWSER_GUIDANCE.length > 100)

// Stage 2: guide assets
const guide = topicText('guide')
check('guide loads', guide.text.includes('# ego-browser') && guide.text.length > 10000, `${guide.text.length} chars`)
const runtime = topicText('runtime')
check('runtime section', runtime.text.includes('Runtime map') && runtime.text.includes('taskSpaces'), `${runtime.text.length} chars`)
const install = topicText('install')
check('install notes', install.text.length > 100, `${install.text.length} chars`)

// Stage 3: doctor (no browser launch)
const engine = new EgoBrowserEngine()
const doctor = await engine.runDoctor(60_000)
check('doctor exit 0', doctor.exitCode === 0, `exit=${doctor.exitCode} err=${doctor.error ?? ''}`)
console.log('--- doctor stdout ---\n' + doctor.stdout.trim())

// Stage 4: real script through the CLI (needs the browser host)
const script = [
  'const task = await taskSpaces.useOrCreate("dsh-ego-browser smoke test")',
  'console.log(JSON.stringify({ runtime: "ok", node: process.version, taskSpaceId: task.id }))',
].join('\n')
const run = await engine.runScript(script, 120_000)
check('run exit 0', run.exitCode === 0, `exit=${run.exitCode} err=${run.error ?? ''} timedOut=${run.timedOut}`)
console.log('--- run stdout ---\n' + run.stdout.trim())
if (run.stderr.trim() !== '') console.log('--- run stderr ---\n' + run.stderr.trim())
const parsed = /runtime":\s*"ok"/.test(run.stdout)
check('script executed', parsed)

if (failures.length > 0) {
  console.error(`\nSMOKE FAILED: ${failures.join(', ')}`)
  process.exit(1)
}
console.log('\nSMOKE OK')
