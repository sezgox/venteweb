# MCP Mobile-Next Capability Check

## Purpose
Track evidence of Mobile MCP (Mobile-Next) usage for emulator-based mobile testing.

## How to Enable (Codex CLI)
This repo expects **Mobile MCP (Mobile-Next)** to be available for Android emulator UI validation.

### 1) Add the MCP server to Codex config
Edit `%USERPROFILE%\.codex\config.toml` (or use the repo’s project-scoped `.codex/config.toml` at the monorepo root). Ensure these tables exist (or run `codex mcp add` equivalents):

```toml
[mcp_servers.mobile_next]
command = "npx"
args = ["-y", "--package", "@mobilenext/mobile-mcp@0.0.50", "mcp-server-mobile", "--stdio"]
```

Notes:
- `--stdio` is the default transport; Codex connects to MCP servers via stdio.
- The `192.168.1.143:8100` address is the **Ionic live reload dev server** and is **not** the Mobile-Next MCP server.
- If you want SSE transport for debugging, `mcp-server-mobile` supports `--port <port>`, but that is optional and **must not** conflict with Ionic’s `8100`.

### 2) Restart Codex session
Codex loads MCP servers on startup. After editing `config.toml`, restart Codex so `mcp__mobile_next__*` tools are available.

### Windows + nvm / Cursor: `npx` not found
If the MCP log shows `npx` is not recognized (or connection closes immediately), the Cursor process **does not inherit the same `PATH` as a terminal** where nvm is loaded. **Fix:** in `.cursor/mcp.json` and `.codex/config.toml`, set `command` to the **full path** to `npx.cmd`, e.g. `C:\\nvm4w\\nodejs\\npx.cmd` (run `where npx` in PowerShell to confirm on your machine). The repo’s checked-in config uses that pattern for the common nvm4w layout; adjust the path if your Node lives elsewhere.

## How to Enable (Cursor IDE)

Codex and Cursor use different config files. **Cursor does not read `config.toml`.** Use **Settings → MCP**, user `~/.cursor/mcp.json`, or this repo’s **`.cursor/mcp.json`**, then restart Cursor. The monorepo keeps **`.cursor/mcp.json`** and **`.codex/config.toml`** in sync with the snippets below for checkout portability.

Example `mcp.json` fragment:

```json
{
  "mcpServers": {
    "mobile_next": {
      "command": "npx",
      "args": [
        "-y",
        "--package",
        "@mobilenext/mobile-mcp@0.0.50",
        "mcp-server-mobile",
        "--stdio"
      ]
    }
  }
}
```

Until `mobile_next` appears in the agent tool list, agents cannot drive the real emulator UI; use Playwright (below) or ADB as fallback.

## Playwright MCP — mobile-sized checks (not a substitute for Mobile-Next)

Use **`@playwright/mcp`** (Codex/Cursor server name `playwright` → tool prefix `mcp__playwright__*`) for **viewport + touch-oriented layout** against the dev server on loopback (e.g. `http://127.0.0.1:8100`). This validates responsive UI and copy without opening the LAN URL you use for device live reload. A second Codex server alias (e.g. `navegador`) is optional and only duplicates the same Playwright MCP under another prefix.

Suggested flow:

1. `browser_resize` to a phone size (e.g. **390×844** or **393×851**).
2. Optional: `browser_run_code` to call `page.setUserAgent(...)` with a **Chrome Android** mobile UA for closer behavior.
3. `browser_navigate` to `http://127.0.0.1:8100/...` (only if `ng serve` / Ionic listens on loopback — `ionic cap run android -l --external` usually does).

**Chrome + physical emulator mirror:** If you start Chrome with remote debugging (e.g. port **9222**) and attach to the WebView of the running emulator, Playwright MCP can target that instance via a **CDP endpoint** (configure `@playwright/mcp` with a config file that sets `browser.cdpEndpoint`, or use a dedicated Chrome DevTools MCP). What you automate then applies to the same session Chrome is mirroring — that is separate from loading a “normal” web URL.

### 3) Preconditions (Android)
- Android emulator is running.
- `adb devices` shows the emulator (e.g. `emulator-5554`).
- App under test installed (e.g. `com.vente.mobile`).

## Status
- First emulator check executed on March 15, 2026.
- Mobile-Next MCP tool was not exposed in the runtime toolset for that pass, so it used an ADB fallback on the emulator.

## Recorded Check
- Check date: March 15, 2026
- Emulator target: `emulator-5554` (`Pixel_3a_API_34_extension_level_7_x86_64`)
- App/package: `com.vente.mobile`
- Executed scenario:
  - Open app and land on `Profile` tab while authenticated.
  - Tap `Log out`.
  - Verify unauthenticated profile prompt appears.
  - Tap `SIGN IN`.
  - Verify auth screen is displayed.
- Result: PASS (ADB fallback)

## Artifacts
- Historical XML dumps from the original mobile-local orchestration workspace were not migrated into the global workspace.
- Keep future Mobile-Next evidence directly under `C:\dev\vente\.codex-orchestration\` or its `handoffs/` subtree.
