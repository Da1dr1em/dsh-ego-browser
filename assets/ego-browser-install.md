# Install ego lite (Windows)

Read this file only when the `ego-browser` command isn't working, or when the user asks to install ego lite. For day-to-day browser work, go back to `SKILL.md`.

On this Windows machine, `ego-browser` is provided by **ego-windows-host** — a community preview host (PR citrolabs/ego-lite#228) that runs the unmodified `ego-browser` runtime against the stock Microsoft Edge or Chrome already installed, over loopback CDP. The official native Windows ego lite app is still under evaluation (issue citrolabs/ego-lite#203).

## Check the command is available

```bash
ego-browser --doctor
```

It should report the detected browser (Edge first), the CDP endpoint, the state dir, and task spaces. If PowerShell says the command is not recognized, the shim is missing; see below.

## Run browser work

The CLI accepts three input forms, and a leading `nodejs` argument is accepted so `ego-browser nodejs` invocations work as documented in SKILL.md:

```bash
ego-browser nodejs <<'EOF'        # stdin (works in Git Bash; PowerShell has no heredoc)
console.log('ego-browser ready')
EOF

ego-browser -e "console.log('ego-browser ready')"   # inline

ego-browser task.js               # script file
```

If `ego-browser` is missing, recreate the shim as a `.cmd` on the PATH that runs the host entrypoint, e.g.:

```
node "<ego-lite-repo>\package\ego-windows-host\bin\ego-windows-host.mjs" %*
```

## Known limitations vs the real ego lite app

- Snapshot quality is a plain projection of Chromium's accessibility tree (fine for ordinary DOM pages; weaker for deeply nested iframes and canvas-heavy surfaces).
- The hosted browser uses its own dedicated profile; logins accumulate there (log in once via `taskSpaces.handOff`), but it does not import the user's daily browser cookies.
- No Spaces UI; ownership is enforced at the bridge.
- The browser exposes CDP on a loopback port — any local process can connect.

## Troubleshooting

- **`ego-browser` not found**: recreate the shim (see above) or run `node "<ego-lite-repo>\package\ego-windows-host\bin\ego-windows-host.mjs"` directly.
- **Browser not found**: `EGO_HOST_BROWSER_PATH` can point at a specific `msedge.exe` / `chrome.exe`.
- **Port conflict**: change `EGO_HOST_DEBUG_PORT` (default 9522).
- **Headless run**: set `EGO_HOST_HEADLESS=1`.
