/**
 * dsh-ego-browser — host-only plugin. Mounts the ego-browser (ego-lite
 * Windows preview) CLI as DSH agent tools: ego_browser_run executes one
 * JavaScript script per browser task in the ego-browser nodejs runtime,
 * ego_browser_help serves the API guide (shipped SKILL.md assets),
 * ego_browser_status preflights the browser host. A system-prompt
 * announcement tells every agent the plugin exists. Everything rides the
 * official NPM SDK packages — no dsh source changes.
 */
import z from 'schemastery';
import { EgoBrowserEngine } from './engine.js';
import { egoBrowserHelpTool, egoBrowserRunTool, egoBrowserStatusTool } from './tools.js';
/** Stable cordis plugin name. */
export const name = 'ego-browser';
/** Services required before the tools can mount. */
export const inject = ['tools', 'systemPrompt'];
export const Config = z.object({
    enabled: z.boolean().default(true),
    announceToAgent: z.boolean().default(true),
    executable: z.string().default('ego-browser'),
    shell: z.boolean(),
    timeoutMs: z.number().default(600000),
    maxOutputBytes: z.number().default(1048576),
    env: z.dict(z.string()),
});
/** Order of the announcement section within the tool-guidance band. */
const SECTION_ORDER = 160;
/** Model-facing announcement: plugin presence, capabilities, and limits. */
export const EGO_BROWSER_GUIDANCE = '本机已安装 dsh-ego-browser 插件（ego-lite Windows 预览版浏览器自动化，ego-browser skill 的 DSH 原生移植）：' +
    'ego_browser_run 在 ego-browser nodejs 运行时中执行一段 JavaScript 完成整个浏览器任务（page / page.locator / browser / taskSpaces / fetch / cdp facade，console.log 为输出通道；' +
    '一次浏览器任务写一段脚本一次调用，运行时内自行等待、抽取、验证与分支）；' +
    'ego_browser_help 返回 API 指南（topic: guide/runtime/rules/taskspaces/handoff/caveats/install）；' +
    'ego_browser_status 体检宿主（浏览器路径、CDP 端点 9522、状态目录、任务空间）。' +
    '机制：首次调用自动启动常驻的独立浏览器宿主（detached，复用用户登录态），任务空间与登录态跨调用持久；' +
    '涉及登录/验证码等人工步骤时脚本应 taskSpaces.handOff 交还控制权并等待用户确认。' +
    '限制：驱动真实 Edge/Chrome，继承用户登录态，消耗真实资源；长任务注意 timeoutMs；宿主未启动或端口 9522 被占用时先跑 ego_browser_status。' +
    '用户提到「上网 / 浏览器 / 打开网页 / 网页搜索 / 网页操作 / 网页截图 / 抓取网页数据」时即指本插件，请据此协作。';
/**
 * Mount the engine, tools, and announcement.
 * @param ctx - host plugin context carrying tools/systemPrompt.
 * @param config - resolved plugin config (schema defaults applied by the loader).
 */
export function apply(ctx, config) {
    const enabled = config?.enabled ?? true;
    if (!enabled)
        return;
    const engine = new EgoBrowserEngine({
        executable: config?.executable,
        shell: config?.shell,
        timeoutMs: config?.timeoutMs,
        maxOutputBytes: config?.maxOutputBytes,
        env: config?.env,
    });
    const tools = [
        egoBrowserRunTool(engine),
        egoBrowserHelpTool(),
        egoBrowserStatusTool(engine),
    ];
    ctx.effect(() => {
        const disposers = tools.map((tool) => ctx.tools.register(tool));
        return () => { for (const dispose of disposers)
            dispose(); };
    }, 'dsh-ego-browser: tools');
    if (config?.announceToAgent ?? true) {
        ctx.effect(() => ctx.systemPrompt.section({
            name: 'plugin:dsh-ego-browser',
            order: SECTION_ORDER,
            text: EGO_BROWSER_GUIDANCE,
        }), 'dsh-ego-browser: announcement');
    }
}
