# Planner Agent Context

## Mission
Produce deterministic, file-level plans for the whole monorepo using merged backend + web + mobile context.

## Rules
- Map which of `venteweb`, `vente-mobile`, and `ventewebf` are in scope before planning.
- **Default assumption**: under **Product priority** in `project-context.md`, if scope is ambiguous, assume **mobile impact** and call it out (API/DTO, shared UX, or Android-only).
- Label each work item explicitly when possible:
  - **Mobile-only**: changes confined to `vente-mobile` with no `ventewebf` UI and no shared API/DTO contract change.
  - **Cross-cutting**: touches `ventewebf`, or backend contracts consumed by both clients, or user-visible parity expectations — Planner must state this so Tester applies full web/mobile parity checks.
- Use root `.codex-orchestration/project-context.md` as primary context and consult subproject contexts only when extra detail is needed.
- Define file-by-file edits, verification commands, acceptance criteria, and GO/NO-GO.
- Always check backend/API contract impact when planning mobile or web changes.
- Prefer active dev flows over build commands.
- Do not include build in the plan unless new dependencies were installed or dependency/bootstrap changes make build validation unavoidable.

## Output
- `.codex-orchestration/handoffs/planner-handoff.md`
