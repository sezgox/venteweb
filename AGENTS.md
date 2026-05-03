# Codex / OpenAI Codex — Vente monorepo

This file is loaded by **Codex CLI** for this workspace. It **extends** global Codex instructions (e.g. `%USERPROFILE%\.codex\AGENTS.md`) and **must** be read together with **`RTK.md`** (shell token savings). Upstream behavioral baseline: [forrestchang/andrej-karpathy-skills](https://github.com/forrestchang/andrej-karpathy-skills).

@RTK.md

---

## 1. Karpathy-inspired behavior (priority)

Adapted from [andrej-karpathy-skills / CLAUDE.md](https://github.com/forrestchang/andrej-karpathy-skills/blob/main/CLAUDE.md). **Apply these first;** the Vente section below adds policy and references.

**Tradeoff:** favor caution over speed; for trivial edits, use judgment.

### 1.1 Think before coding

Do not assume or hide confusion. Surface tradeoffs. State assumptions; ask when uncertain; present multiple interpretations instead of picking silently; push back when a simpler approach exists; stop and name what is unclear.

### 1.2 Simplicity first

Minimum code that solves the problem—no speculative features, single-use abstractions, unrequested flexibility, or impossible-scenario handling. If it is overcomplicated, simplify.

### 1.3 Surgical changes

Touch only what the task requires; match existing style. Do not “clean up” unrelated code or comments. Remove only orphans **your** edits created. Every changed line should trace to the user’s request.

### 1.4 Goal-driven execution

Define verifiable success criteria (tests, reproduction steps, or agreed checks). Use a short plan with verify steps for multi-step work.

**Working well** means fewer unnecessary diffs, fewer overcomplicated rewrites, and questions **before** implementation when ambiguous.

---

## 2. Vente project (source of truth and scope)

- **Canonical context:** `.codex-orchestration/project-context.md` — architecture, **Run & Verify**, tests, constraints, security, upgrade notes, and cross-package rules. **Do not** invent stack or process details that contradict it.
- **Mobile phases / backlog:** `.codex-orchestration/mobile-roadmap.md`.
- **Orchestration roles (only):** Planner, Coder, Verifier, Tester — `.codex-orchestration/agents/*.md`.
- **Handoffs:** `.codex-orchestration/handoffs/` (`planner-handoff.md`, `coder-notes.md`, `verifier-report.md`, `tester-report.md`).
- **Bootstrap script (orchestration workspace):** `codex-bootstrap.ps1` (repo root).
- **Per-package AGENTS** (when working mainly in one package): `venteweb/AGENTS.md`, `ventewebf/AGENTS.md`, `vente-mobile/AGENTS.md` (Ionic), `vente-mobile-flutter/AGENTS.md`. Use each package `README.md` with `project-context.md` as needed.

### Product priority

- **MOBILE APP FIRST:** ship and harden the **Android** MVP in `vente-mobile`; **iOS** later. **`venteweb`** / **`ventewebf`:** API stability, DTO alignment with mobile, small targeted web fixes; avoid large web-only refactors unless explicitly scoped.

### Run, build, tests (summary)

Full detail: `project-context.md` → **Run & Verify** and **Constraints**.

- **Dev:** `npm run start:dev` in `venteweb`; `ionic cap run android` or `npm run android:live` in `vente-mobile` (see `vente-mobile/README.md`); `ng s` in `ventewebf`.
- **Build policy:** avoid production `build` unless dependencies or bootstrap changes require it.
- **Tests:** backend `venteweb` (`npm run test`, `npm run test:e2e`); mobile `npm test` / `npm run lint`; web `npm test`.

### Tools and integrations

| Area | Where to look |
|------|----------------|
| **RTK** (prefix noisy shell) | `RTK.md` (this repo); [rtk-ai/rtk](https://github.com/rtk-ai/rtk); `project-context.md` → Run & Verify |
| **Codex MCP** | `.codex/config.toml` |
| **Cursor MCP (this repo)** | `.cursor/mcp.json` (may be empty; merge with user-level Cursor MCP) |
| **MCP capability notes** | `.codex-orchestration/mcp-browser-capability.md`, `.codex-orchestration/mcp-mobile-next-capability.md` |
| **Shared testing / API collections** | `.codex-orchestration/testing/` |
| **APK + user self-test on device** | Global policy (`~/.codex/AGENTS.md` → Android emulator vs physical device); **Vente** steps: `.codex-orchestration/testing/mobile-apk-self-test.md` |

### Language

Code, comments, and commit messages in **English**.

### Conflicts between “Vente policy” and Karpathy principles

The four principles (section 1) stay the baseline. Vente rules (API contracts, paths, orchestration, build policy) **constrain what and where** you change; they do not override surgical edits, simplicity, or verification.
