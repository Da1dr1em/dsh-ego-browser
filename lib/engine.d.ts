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
/** Resolved engine options (schema defaults applied by the plugin entry). */
export interface EngineOptions {
    /** CLI executable; default `ego-browser` (resolved through PATH). */
    executable?: string;
    /**
     * Spawn through the platform shell. Defaults to true on Windows, where the
     * ego-browser shim is a `.cmd` file that only `cmd.exe` can execute.
     */
    shell?: boolean;
    /** Per-run timeout in milliseconds; default 600000 (10 min). */
    timeoutMs?: number;
    /** Per-stream capture cap in bytes; default 1 MiB (tail-kept). */
    maxOutputBytes?: number;
    /** Extra environment variables merged over process.env for the child. */
    env?: Partial<Record<string, string>>;
}
/** One CLI run outcome, shaped for direct tool rendering. */
export interface RunResult {
    /** Child exit code; null when timed out or the spawn itself failed. */
    exitCode: number | null;
    /** True when the run was killed by the timeout. */
    timedOut: boolean;
    /** True when stdout or stderr exceeded the capture cap and was trimmed. */
    truncated: boolean;
    stdout: string;
    stderr: string;
    durationMs: number;
    /** Spawn/transport error message (ENOENT, EPIPE, ...); absent on success. */
    error?: string;
}
export declare class EgoBrowserEngine {
    private readonly options;
    constructor(options?: EngineOptions);
    /** Run one JavaScript script in the ego-browser nodejs runtime. */
    runScript(script: string, timeoutMs?: number): Promise<RunResult>;
    /** Run the host diagnostics command (`--doctor`). */
    runDoctor(timeoutMs?: number): Promise<RunResult>;
    private run;
}
