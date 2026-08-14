/**
 * Agent tools: the DSH-native counterpart of the ego-browser skill's Bash
 * heredoc. ego_browser_run executes one JavaScript script per browser task in
 * the ego-browser nodejs runtime; ego_browser_help serves the API guide;
 * ego_browser_status preflights the browser host.
 */
import { defineTool } from '@deepseek-ai/dsh-tools';
import { GUIDE_TOPICS, parseTopic, topicText } from './guidance.js';
/** One text content block (the only render shape these tools emit). */
function text(value) {
    return [{ type: 'text', text: value }];
}
/** Render one CLI run (mirrors the bash-tool exit-code convention). */
function renderRun(result) {
    const marker = result.timedOut
        ? '[timed out]'
        : `[exit code: ${result.exitCode ?? 'null'}]`;
    const parts = [marker];
    if (result.stdout !== '')
        parts.push('stdout:\n' + result.stdout);
    if (result.stderr !== '')
        parts.push('stderr:\n' + result.stderr);
    if (result.truncated)
        parts.push('(output was truncated by the capture cap)');
    if (result.error !== undefined)
        parts.push('error: ' + result.error);
    parts.push(`duration: ${result.durationMs} ms`);
    return parts.join('\n');
}
/** The run-output schema shared by run and status tools. */
const RUN_OUTPUT = {
    schema: {
        type: 'object',
        additionalProperties: false,
        properties: {
            exitCode: { oneOf: [{ type: 'integer' }, { type: 'null' }], required: true },
            timedOut: { type: 'boolean', required: true },
            truncated: { type: 'boolean', required: true },
            stdout: { type: 'string', required: true },
            stderr: { type: 'string', required: true },
            durationMs: { type: 'integer', required: true },
            error: { type: 'string' },
        },
    },
    render: (_args, value) => text(renderRun(value)),
};
/** The script-execution tool — the faithful port of the skill's Bash heredoc. */
export function egoBrowserRunTool(engine) {
    return defineTool({
        name: 'ego_browser_run',
        description: 'Execute one JavaScript script in the ego-browser (ego-lite Windows preview) nodejs runtime and return its output. ' +
            'The script runs in Node.js with preloaded facades: page (goto/reload/url/title/info/snapshot/screenshot/screencast/evaluate/keyboard/mouse/downloads), ' +
            'page.locator(...) (click/hover/fill/type/upload/state-read/collection/wait), browser (listTabs/currentTab/switchTab/openOrReuseTab/closeTab/ensureRealTab), ' +
            'taskSpaces (useOrCreate/list/switch/claim/complete/handOff/takeOver/waitForAgentControl), fetch.server/fetch.browser, and cdp. ' +
            'console.log(...) is the output channel. Encode the WHOLE browser task in one script (navigate, interact, wait, extract, verify, in-process adaptation) — ' +
            'one invocation is one execution round; the browser host stays alive between calls, so task spaces and login state persist. ' +
            'The first call launches a persistent detached browser host on port 9522. Consult ego_browser_help for the full API guide (topics: guide/runtime/rules/taskspaces/handoff/caveats/install) ' +
            'and ego_browser_status to check the host first. Triggers: browse the web, open a website, web search, click/fill/scroll a page, take a screenshot, extract page data, ' +
            'automate a logged-in session, verify a web page, any browser interaction.',
        parameters: {
            script: { type: 'string', required: true, description: 'JavaScript source for the ego-browser nodejs runtime (same API and rules as the ego-browser skill heredoc).' },
            timeoutMs: { type: 'integer', description: 'Per-run timeout in milliseconds (default from plugin config, 600000).' },
        },
        output: RUN_OUTPUT,
        async execute(args) {
            try {
                return await engine.runScript(args.script, args.timeoutMs);
            }
            catch (error) {
                return {
                    exitCode: null,
                    timedOut: false,
                    truncated: false,
                    stdout: '',
                    stderr: '',
                    durationMs: 0,
                    error: error instanceof Error ? error.message : String(error),
                };
            }
        },
    });
}
/** The API-guide tool. */
export function egoBrowserHelpTool() {
    return defineTool({
        name: 'ego_browser_help',
        description: 'Return the ego-browser API guide for writing ego_browser_run scripts. ' +
            'topic selects a section: guide (full SKILL.md, default), runtime (facades map), rules (execution rules), taskspaces (task-space lifecycle), ' +
            'handoff (user-control handoff), caveats (timeout units, snapshot refs, evaluate context), install (setup/troubleshooting). ' +
            'Call this before a complex browser task or when a run fails with an unknown API error.',
        parameters: {
            topic: { type: 'string', enum: [...GUIDE_TOPICS], description: 'Guide section to return; omitted returns the full guide.' },
        },
        output: {
            schema: {
                type: 'object',
                additionalProperties: false,
                properties: {
                    topic: { type: 'string', required: true },
                    text: { type: 'string', required: true },
                },
            },
            render: (_args, value) => text(value.text),
        },
        async execute(args) {
            return topicText(parseTopic(args.topic));
        },
    });
}
/** The host-status tool. */
export function egoBrowserStatusTool(engine) {
    return defineTool({
        name: 'ego_browser_status',
        description: 'Report the ego-browser host state: detected browser, CDP endpoint on port 9522, state dir, and task spaces. ' +
            'Runs the CLI `--doctor` diagnostics. The browser host launches detached on the first ego_browser_run and stays running; ' +
            'run this first when the host may be down (browser update, reboot, port conflict) or before a long session.',
        parameters: {
            timeoutMs: { type: 'integer', description: 'Timeout in milliseconds (default from plugin config).' },
        },
        output: RUN_OUTPUT,
        async execute(args) {
            try {
                return await engine.runDoctor(args.timeoutMs);
            }
            catch (error) {
                return {
                    exitCode: null,
                    timedOut: false,
                    truncated: false,
                    stdout: '',
                    stderr: '',
                    durationMs: 0,
                    error: error instanceof Error ? error.message : String(error),
                };
            }
        },
    });
}
