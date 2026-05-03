# API Testing Assets

This directory stores reusable test clients and flow documentation for the Tester agent.

## Mobile APK (user self-test / SFTP)

- Procedure: [mobile-apk-self-test.md](./mobile-apk-self-test.md) — build debug APK, copy to `vente-mobile/artifacts/apk/`, verify Postgres + Nest first.

## Mobile Explore: map, VPN, filter QA

- Checklist, VPN/socket origin, filter matrix: [mobile-explore-map-vpn-qa.md](./mobile-explore-map-vpn-qa.md)
- Optional seed script (creates public/private/categorized events for filter tests): [scripts/seed-explore-filter-events.mjs](./scripts/seed-explore-filter-events.mjs) — set `VENTE_ACCESS_TOKEN` and `VENTE_ORGANIZER_ID` (and optionally `VENTE_API_URL`)

## Local Environment
- Dev server command: `npm run start:dev`
- Base URL: `http://localhost:3000/api`

## Storage Conventions
- Postman collections/environments: `postman/`
- Thunder Client exports: `thunder-client/`
- Keep flows grouped by domain (auth, user, event, participation, notifications).

## Minimum Flow Coverage
1. Authentication login flow and token reuse.
2. Event create/update/delete flow.
   - Event create must validate both variants:
     - with `poster` file.
     - without `poster` file.
   - Postman template includes `Events - Create (poster optional)`.
3. Participation request/accept/reject flow.
4. Notification retrieval flow.
5. External invitation flow:
   - create external invitation (`POST /events/:id/invitations/external`)
   - accept invitation through canonical participation endpoint (`POST /events/:id/participations`)

## UI Smoke Coverage (Tester + MCP Browser)
- Tester must traverse all major frontend screens on each significant backend/frontend flow update:
  - authentication/login
  - dashboard/home
  - events listing/explore
  - event detail
  - user profile/settings
  - critical creation/edit forms
- For each screen, tester report must include:
  - navigation path,
  - expected result,
  - actual result (`PASS`/`FAIL`),
  - reproducible failure steps when failing.
- If user requests a specific path, execute it first (example: Google login `elias.szg2000` and open one owned event detail view).

## Postman Variables For Event Create
- `organizerId`: set automatically from login test script (`results.user.id`) when available.
- `eventPosterFile`: optional file path for poster upload (`.codex-orchestration/testing/fixtures/event-poster.png`).
- `eventStartDate` / `eventEndDate` / `eventName`: generated automatically by request pre-script.

## Handoff Requirement
When Planner/Verifier requires flow validation, Tester must:
- update or create collection requests,
- document execution order,
- record sample payloads and expected status codes,
- reference the artifacts in `handoffs/tester-report.md`.

## Mandatory Rule
- Every new backend flow or endpoint change must be documented and added to Postman/Thunder collections in this folder in the same change set.
