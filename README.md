# dsh-ego-browser

把 ego-browser skill（ego-lite Windows 预览版浏览器自动化）改写为 DeepSeek Harness 原生插件：
agent 通过 `ego_browser_run` 在 ego-browser nodejs 运行时中执行一段 JavaScript 完成整个浏览器任务，
通过 `ego_browser_help` 随时查阅 API 指南，通过 `ego_browser_status` 体检浏览器宿主。

## 功能特性

- **真实浏览器**：驱动本机已装的 Edge / Chrome（CDP 连接），不是无头抓取器；
  相比 Playwright MCP / webfetch 更泛用——任何网页交互、搜索、截图、表单、登录态会话都能做。
- **登录态复用**：浏览器宿主使用独立 profile，登录一次（经 `taskSpaces.handOff` 人工确认）后
  跨任务、跨会话保持。
- **一次脚本一任务**：`ego_browser_run` 一段 JavaScript 内完成导航、交互、等待、抽取、验证与
  分支，符合 ego-lite 的运行时设计；任务空间（taskSpaces）与登录态跨调用持久。
- **内置 API 指南**：`ego_browser_help` 按 topic 返回完整指南（guide / runtime / rules /
  taskspaces / handoff / caveats / install），agent 无需记忆 API。
- **宿主体检**：`ego_browser_status` 运行 `--doctor`，报告浏览器路径、CDP 端点（9522）、
  状态目录、任务空间，定位启动失败。
- **零源码侵入**：host-only cordis 插件，经 `cordis.patch.yml` + profile 挂载，不改 DSH 源码。

## 工具

| 工具 | 说明 |
| --- | --- |
| `ego_browser_run` | 在 ego-browser nodejs 运行时执行一段 JavaScript（page / page.locator / browser / taskSpaces / fetch / cdp facade，`console.log` 为输出通道）。一次浏览器任务写一段脚本、调用一次；运行时内自行等待、抽取、验证与分支。首个调用自动启动常驻浏览器宿主（端口 9522）。 |
| `ego_browser_help` | 返回 API 指南。topic: `guide`（完整 SKILL.md，默认）/ `runtime` / `rules` / `taskspaces` / `handoff` / `caveats` / `install`。 |
| `ego_browser_status` | 运行 CLI `--doctor`，报告浏览器路径、CDP 端点、状态目录、任务空间。 |

示例脚本（与 skill 的 heredoc 完全一致）：

```js
const task = await taskSpaces.useOrCreate('inspect example page')
await browser.openOrReuseTab('https://example.com', { wait: true, timeout: 20000 })
const heading = await page.getByRole('heading').first().innerText()
const info = await page.info()
console.log(JSON.stringify({ taskSpaceId: task.id, heading, url: info.url }))
```

## 前置条件

- 本机 PATH 中有 `ego-browser` 可执行入口（Windows 上为指向
  `ego-windows-host` 的 shim：`ego-browser.cmd` → `node <ego-lite>/package/ego-windows-host/bin/ego-windows-host.mjs`）。
- ego-windows-host 需要检测到 Edge 或 Chrome；可用环境变量 `EGO_HOST_BROWSER_PATH`、
  `EGO_HOST_DEBUG_PORT`（默认 9522）、`EGO_HOST_STATE_DIR`、`EGO_HOST_HEADLESS=1` 覆盖默认行为。
- 安装/连接问题排查见 `assets/ego-browser-install.md`（或 `ego_browser_help` topic `install`）。

## 安装（挂载）

### 方式 A：GitHub 直装（推荐，无需构建）

仓库自带构建产物（`lib/`），克隆即用：

```powershell
dsh plugin --profile web add -w `
  --registry=https://registry.npmmirror.com `
  github:Da1dr1em/dsh-ego-browser
# 然后重启 dsh web 使插件生效
dsh plugin --profile web list   # 确认依赖树含 dsh-ego-browser，且 bundles 花名册已登记
```

说明：

- `-w`：profile 是 pnpm workspace 根，pnpm 11 的 `add` 不带 `-w` 会报
  `ERR_PNPM_ADDING_TO_ROOT`；`dsh plugin` 是 pnpm 的薄转发器，参数原样透传。
- `--registry` 可选：直连 registry.npmjs.org 批量下载偶发 `UND_ERR_DESTROYED`
  （连接被重置）时，换 npmmirror 镜像并加 `--network-concurrency=2 --fetch-retries=5
  --fetch-retry-mintimeout=1000 --fetch-retry-maxtimeout=4000` 可稳定完成；
  `dsh` 启动器不读取 npm_config_* 环境变量，必须用命令行参数。
- 运行时依赖（`schemastery`）会随安装自动拉取；`@deepseek-ai/dsh-tools`、
  `@deepseek-ai/dsh-system-prompt` 为 peer 依赖，由 DSH 核心自带满足。
- 安装中途失败可能把 profile node_modules 修剪到不一致状态，重跑同一命令即可恢复
  （pnpm 以锁文件为准自愈）。

### 方式 B：本地 link（开发调试）

```powershell
git clone https://github.com/Da1dr1em/dsh-ego-browser.git
cd dsh-ego-browser
npm install --cache .\.npm-cache
npm run build
dsh plugin --profile web add -w --ignore-scripts --registry=https://registry.npmmirror.com `
  --network-concurrency=2 --fetch-retries=5 `
  --fetch-retry-mintimeout=1000 --fetch-retry-maxtimeout=4000 `
  link:<plugin-directory>
# 重启 dsh web 生效
```

> 若本机同时挂着 dsh-web-ui 全家桶仓库（profile workspace 含其包），`link:` 安装会触发
> 它们的 `prepare`（tsdown 构建）——失败时加 `--ignore-scripts` 跳过（插件 lib 已构建好）。

### 卸载

```powershell
dsh plugin --profile web remove -w @deepseek-ai/dsh-ego-browser
# 或直接改 profile 的 package.json / cordis.patch.yml
```

## 配置

插件 Config（schemastery 校验，可在 profile 的 `cordis.patch.yml` 中按 bundle 覆盖，或经
patch 层 `config` 注入）：

| 字段 | 默认 | 说明 |
| --- | --- | --- |
| `enabled` | `true` | 插件总开关 |
| `announceToAgent` | `true` | 是否在系统提示中向 agent 公告插件 |
| `executable` | `ego-browser` | CLI 可执行入口（含空格的完整路径会自动加引号） |
| `shell` | Windows 为 `true` | 是否经平台 shell 启动（Windows 的 .cmd shim 需要） |
| `timeoutMs` | `600000` | 单次运行超时（毫秒），超时 kill 整棵进程树 |
| `maxOutputBytes` | `1048576` | 单流输出捕获上限（超出截断并标注） |
| `env` | 无 | 追加到子进程的环境变量（如 `EGO_HOST_HEADLESS: "1"`） |

## 实现说明与边界

- 引擎在 **DSH 宿主进程** 中 `spawn` ego-browser CLI（stdin 传脚本、管道收输出），
  不受 agent 会话文件沙箱限制——浏览器宿主可将 profile 写入 `%LOCALAPPDATA%`，与
  会话的 workspace-write / full-access 模式无关。
- 超时清理：Windows 下用 `taskkill /pid <pid> /T /F` 杀整个进程树，避免 shell 包装层
  之后的 node 与浏览器进程残留。
- 指南资产随包分发（`assets/ego-browser-guide.md` 与 `assets/ego-browser-install.md`），
  `ego_browser_help` 按 topic 切片返回。
- 已知边界：浏览器宿主端口 9522 被占用、浏览器无法启动时 `ego_browser_run` 会以非零
  退出并输出错误，先跑 `ego_browser_status` 定位；涉及登录/验证码的人工步骤，脚本应
  调用 `taskSpaces.handOff` 交还控制权并等待用户确认后 `takeOver`。

## 开发

```powershell
npm install --cache .\.npm-cache   # 依赖（含 SDK 类型）
npm run build                      # tsc 产出 lib/
npm run smoke                      # 端到端冒烟（需要 full access：会启动真实浏览器）
```

**注意**：仓库自带构建产物（`lib/` 已提交，供方式 A 直装）；修改 `src/` 后必须
`npm run build` 并把新的 `lib/` 一并提交。

`smoke` 覆盖：模块导出、指南资产与切片、`--doctor`、真实脚本执行（创建/复用任务空间）。
