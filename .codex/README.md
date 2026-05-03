# Codex CLI (project scope)

- **`config.toml`**: committed template paths for MCP servers. **No API tokens** belong in this file.
- **Playwright MCP token**: export `PLAYWRIGHT_MCP_EXTENSION_TOKEN` in your shell before running Codex, or maintain a **local** `config.local.toml` (gitignored) if your Codex build supports includes.
- **`hooks.json`**: often machine-specific (RTK path). The repo ships `hooks.example.json`; copy to `hooks.json` locally or point Codex at your hook command.
