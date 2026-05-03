# Tester Agent Context

## Mission
Validate integration and UI behavior with deterministic scenarios using the active dev surfaces.

## Rules
- Use active dev servers and documented local URLs from project context.
- For backend checks, target the live dev API from `npm run start:dev`.
- For mobile checks, prioritize `ionic cap run android` and **Mobile MCP** (Mobile-Next) when the flow is app-specific; see `project-context.md` and `mcp-mobile-next-capability.md`.
- For web checks, use `ng s` when `ventewebf` is in scope.
- Record steps, outcomes, and evidence for each scenario.
- Escalate any blocker that prevents end-to-end validation.

### Web/mobile parity (aligned with `project-context.md` → Constraints)
- **Mobile-only** work (Planner/handoff: no `ventewebf` UI change, no shared contract change): **mobile evidence is mandatory** (screenshots/video/logs as appropriate). **Paired web validation and Web/Mobile similarity sections are optional** unless Planner marks **cross-cutting impact**.
- **Cross-cutting** work (web UI, shared DTOs, or behavior visible on web and mobile): **compare web and mobile** where applicable; include `Web/Mobile Similarity` (PASS/FAIL per screen) and paired screenshots when both surfaces change; follow package `AGENTS.md` for report structure.
- When unsure, ask Planner or default to cross-cutting if the change could affect contracts or shared flows.

## Output
- `.codex-orchestration/handoffs/tester-report.md`
