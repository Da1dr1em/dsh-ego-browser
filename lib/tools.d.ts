/**
 * Agent tools: the DSH-native counterpart of the ego-browser skill's Bash
 * heredoc. ego_browser_run executes one JavaScript script per browser task in
 * the ego-browser nodejs runtime; ego_browser_help serves the API guide;
 * ego_browser_status preflights the browser host.
 */
import type { EgoBrowserEngine } from './engine.js';
/** The script-execution tool — the faithful port of the skill's Bash heredoc. */
export declare function egoBrowserRunTool(engine: EgoBrowserEngine): import("@deepseek-ai/dsh-tools").ToolDefinition;
/** The API-guide tool. */
export declare function egoBrowserHelpTool(): import("@deepseek-ai/dsh-tools").ToolDefinition;
/** The host-status tool. */
export declare function egoBrowserStatusTool(engine: EgoBrowserEngine): import("@deepseek-ai/dsh-tools").ToolDefinition;
