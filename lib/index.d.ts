/**
 * dsh-ego-browser — host-only plugin. Mounts the ego-browser (ego-lite
 * Windows preview) CLI as DSH agent tools: ego_browser_run executes one
 * JavaScript script per browser task in the ego-browser nodejs runtime,
 * ego_browser_help serves the API guide (shipped SKILL.md assets),
 * ego_browser_status preflights the browser host. A system-prompt
 * announcement tells every agent the plugin exists. Everything rides the
 * official NPM SDK packages — no dsh source changes.
 */
import type { Context } from '@deepseek-ai/cordis';
import type { Dict } from 'cosmokit';
import z from 'schemastery';
/** Stable cordis plugin name. */
export declare const name = "ego-browser";
/** Services required before the tools can mount. */
export declare const inject: string[];
/** Plugin config, validated by the same-named schemastery schema. */
export interface Config {
    /** Master switch for the plugin (tools + prompt section). Default true. */
    enabled?: boolean;
    /** Announce the plugin to every agent via the system prompt. Default true. */
    announceToAgent?: boolean;
    /** CLI executable; default `ego-browser` (resolved through PATH). */
    executable?: string;
    /** Spawn through the platform shell; default auto (true on Windows). */
    shell?: boolean;
    /** Per-run timeout in milliseconds; default 600000 (10 min). */
    timeoutMs?: number;
    /** Per-stream capture cap in bytes; default 1 MiB. */
    maxOutputBytes?: number;
    /** Extra environment variables for the spawned CLI. */
    env?: Dict<string, string>;
}
export declare const Config: z<Config>;
/** Model-facing announcement: plugin presence, capabilities, and limits. */
export declare const EGO_BROWSER_GUIDANCE: string;
/**
 * Mount the engine, tools, and announcement.
 * @param ctx - host plugin context carrying tools/systemPrompt.
 * @param config - resolved plugin config (schema defaults applied by the loader).
 */
export declare function apply(ctx: Context, config?: Config): void;
