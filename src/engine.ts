/**
 * EgoBrowserEngine — spawns the `ego-browser nodejs` CLI (on Windows the
 * ego-windows-host bridge shim) with a JavaScript script piped to stdin and
 * captures stdout/stderr/exit code. Each invocation is one execution round;
 * the browser host is launched detached by the CLI on first use and stays
 * alive between calls, so task spaces and login state persist across runs.
 *
 * The spawn happens in the DSH host process (this module runs in the plugin
 * host half), so it is NOT confined by the session file sandbox: the browser
 * host may write its profile under %LOCALAPPDATA% regardless of the agent
 * session's sandbox mode.
 */

import { spawn, type ChildProcess } from 'node:child_process'

/** Resolved engine options (schema defaults applied by the plugin entry). */
export interface EngineOptions {
  /** CLI executable; default `ego-browser` (resolved through PATH). */
  executable?: string
  /**
   * Spawn through the platform shell. Defaults to true on Windows, where the
   * ego-browser shim is a `.cmd` file that only `cmd.exe` can execute.
   */
  shell?: boolean
  /** Per-run timeout in milliseconds; default 600000 (10 min). */
  timeoutMs?: number
  /** Per-stream capture cap in bytes; default 1 MiB (tail-kept). */
  maxOutputBytes?: number
  /** Extra environment variables merged over process.env for the child. */
  env?: Partial<Record<string, string>>
}

/** One CLI run outcome, shaped for direct tool rendering. */
export interface RunResult {
  /** Child exit code; null when timed out or the spawn itself failed. */
  exitCode: number | null
  /** True when the run was killed by the timeout. */
  timedOut: boolean
  /** True when stdout or stderr exceeded the capture cap and was trimmed. */
  truncated: boolean
  stdout: string
  stderr: string
  durationMs: number
  /** Spawn/transport error message (ENOENT, EPIPE, ...); absent on success. */
  error?: string
}

const DEFAULT_EXECUTABLE = 'ego-browser'
const DEFAULT_TIMEOUT_MS = 600_000
const DEFAULT_MAX_OUTPUT = 1_048_576

export class EgoBrowserEngine {
  constructor(private readonly options: EngineOptions = {}) {}

  /** Run one JavaScript script in the ego-browser nodejs runtime. */
  runScript(script: string, timeoutMs?: number): Promise<RunResult> {
    return this.run(['nodejs'], script, timeoutMs)
  }

  /** Run the host diagnostics command (`--doctor`). */
  runDoctor(timeoutMs?: number): Promise<RunResult> {
    return this.run(['--doctor'], undefined, timeoutMs)
  }

  private run(args: string[], stdinScript: string | undefined, timeoutMs?: number): Promise<RunResult> {
    const executable = this.options.executable ?? DEFAULT_EXECUTABLE
    const shell = this.options.shell ?? process.platform === 'win32'
    const timeout = timeoutMs ?? this.options.timeoutMs ?? DEFAULT_TIMEOUT_MS
    const maxOutputBytes = this.options.maxOutputBytes ?? DEFAULT_MAX_OUTPUT
    const started = Date.now()

    return new Promise<RunResult>((resolve) => {
      let child: ChildProcess
      try {
        if (shell) {
          // Command-string form (no args array) so Node does not emit the
          // shell-args deprecation warning. Args are static and never user
          // input; a custom executable containing whitespace is quoted.
          const exe = /\s/.test(executable)
            ? process.platform === 'win32' ? `"${executable}"` : `'${executable}'`
            : executable
          child = spawn([exe, ...args].join(' '), [], {
            shell,
            windowsHide: true,
            stdio: ['pipe', 'pipe', 'pipe'],
            env: this.options.env ? { ...process.env, ...this.options.env } : undefined,
          })
        } else {
          child = spawn(executable, args, {
            windowsHide: true,
            stdio: ['pipe', 'pipe', 'pipe'],
            env: this.options.env ? { ...process.env, ...this.options.env } : undefined,
          })
        }
      } catch (error) {
        resolve({
          exitCode: null,
          timedOut: false,
          truncated: false,
          stdout: '',
          stderr: '',
          durationMs: 0,
          error: error instanceof Error ? error.message : String(error),
        })
        return
      }

      let stdout = ''
      let stderr = ''
      let truncated = false
      const capture = (target: () => string, set: (value: string) => void) => (chunk: Buffer) => {
        if (truncated) return
        const text = chunk.toString('utf8')
        if (target().length + text.length > maxOutputBytes) {
          truncated = true
          set(target().slice(0, maxOutputBytes) + `\n[output truncated at ${maxOutputBytes} bytes]`)
          return
        }
        set(target() + text)
      }
      child.stdout?.setEncoding('utf8')
      child.stdout?.on('data', capture(() => stdout, (value) => { stdout = value }))
      child.stderr?.setEncoding('utf8')
      child.stderr?.on('data', capture(() => stderr, (value) => { stderr = value }))

      let settled = false
      const settle = (result: RunResult): void => {
        if (settled) return
        settled = true
        clearTimeout(timer)
        resolve(result)
      }

      const timer = setTimeout(() => {
        // Kill the whole tree: on Windows the shell wrapper's children
        // (node + the browser host) would otherwise survive the shell.
        if (child.pid === undefined) {
          settle({
            exitCode: null,
            timedOut: true,
            truncated,
            stdout,
            stderr,
            durationMs: Date.now() - started,
          })
          return
        }
        if (process.platform === 'win32') {
          try {
            spawn('taskkill', ['/pid', String(child.pid), '/T', '/F'], { stdio: 'ignore' })
          } catch {
            child.kill()
          }
        } else {
          try { process.kill(-child.pid, 'SIGKILL') } catch { child.kill('SIGKILL') }
        }
        settle({
          exitCode: null,
          timedOut: true,
          truncated,
          stdout,
          stderr,
          durationMs: Date.now() - started,
        })
      }, timeout)

      child.on('error', (error) => {
        settle({
          exitCode: null,
          timedOut: false,
          truncated,
          stdout,
          stderr,
          durationMs: Date.now() - started,
          error: error instanceof Error ? error.message : String(error),
        })
      })
      child.on('close', (code) => {
        settle({
          exitCode: code,
          timedOut: false,
          truncated,
          stdout,
          stderr,
          durationMs: Date.now() - started,
        })
      })

      // EPIPE on stdin is normal when the CLI fails before reading; ignore.
      child.stdin?.on('error', () => {})
      if (stdinScript !== undefined) {
        child.stdin?.end(stdinScript)
      } else {
        child.stdin?.end()
      }
    })
  }
}
