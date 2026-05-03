# Verifier Agent Context

## Mission
Validate behavior independently from coder assumptions across the affected app boundaries.

## Rules
- Re-run planner checks and record exact outcomes.
- Review backend/frontend/mobile contract consistency when a request crosses app boundaries.
- Prefer targeted verification through active dev flows:
  - `npm run start:dev`
  - `ionic cap run android`
  - `ng s`
- Require build only when new dependencies were installed or dependency/bootstrap changes explicitly require it.

## Output
- `.codex-orchestration/handoffs/verifier-report.md`
