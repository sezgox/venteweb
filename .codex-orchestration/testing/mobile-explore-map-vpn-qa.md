# Mobile Explore: "Buscar aquí", VPN / API origin, filter QA

This document is the operational checklist for closing manual verification of the Ionic Explore feature set. It complements [README.md](./README.md).

## Code references (Ionic)

| Concern | Location |
|--------|----------|
| Map bounds capture + pending viewport | `vente-mobile/src/app/components/map/map.component.ts` |
| "Search here" flow + **error recovery** (freezes cleared, retry enabled) | `vente-mobile/src/app/pages/explore/explore.page.ts` |
| Filter merge, `applyMapBounds`, mocks on page 1 | `vente-mobile/src/app/core/services/explore-events.service.ts` |
| HTTP base URL | `vente-mobile/src/app/core/services/api.service.ts` (uses `environment.apiUrl`) |
| Socket.IO (same origin as API host) | `vente-mobile/src/app/core/services/notifications-socket.service.ts` (`httpOriginFromApiUrl` strips `/api`) |
| Backend filter semantics | `venteweb/src/event/event.service.ts` (`findAll`, `getBaseWhere`, collaboration post-filter) |

## 1. "Buscar aquí" — device checklist

**Expected flow**

1. Open **Explore** → switch to **Map**.
2. Wait until the map is ready (loading overlay clears). The **Search here** button stays **disabled** until the user **pans or zooms** (avoids spamming the API on idle map). This differs from ventewebf, where the button is not gated on "pending" movement.
3. Pan or zoom → button becomes enabled.
4. Tap **Search here** → feed reloads with `latMin`, `latMax`, `lngMin`, `lngMax` from the visible bounds; map markers update on success.

**On API error**

- An error message should appear (Explore error state).
- The user should **not** be stuck: map internal freeze flags are reset, **Search here** can be used again after the next pan/zoom (pending is restored for retry). Fixed in `ExplorePage.searchThisArea` + `MapComponent.resetPostSearchViewportFlags`.

**Record results**

| Step | Pass/Fail | Notes |
|------|-----------|-------|
| Map → pan → Search here → results match viewport | | |
| Button disabled before first interaction | | |
| Error path (e.g. airplane mode) → can recover | | |

## 2. VPN / single API origin checklist

**Rule:** All REST calls use `environment.apiUrl`. Socket.IO connects to the **same host and port** as that URL, with path `/notifications` (see `httpOriginFromApiUrl`).

**Before testing**

1. Set `apiUrl` in `vente-mobile/src/environments/environment.ts` (dev) or `environment.prod.ts` (release build) to a host reachable from the device (e.g. Tailscale IP `:3000/api`, or `http://10.0.2.2:3000/api` for Android emulator → host loopback).
2. Rebuild/sync the app after changing `apiUrl`.

**Checklist**

| Step | Pass/Fail | Notes |
|------|-----------|-------|
| Phone on VPN / same LAN as API | | |
| Smoke: `GET {{baseUrl}}` or health (see Postman **Health - API root**) | | |
| Explore list loads | | |
| Map + Search here (section 1) | | |
| Login → `access_token` stored → socket connects (DevTools / proxy: WS or polling to same origin) | | |
| No hardcoded API host in app other than `environment` | | |

**CORS / cookies:** `ApiService` uses `withCredentials: true`. Ensure Nest CORS allows the Capacitor/WebView origin if you use cookies.

## 3. Filter matrix (manual) — `GET /api/events`

Use the same logged-in user as on mobile when comparing to **ventewebf**. Remember: **page 1** of the mobile feed may **prepend curated mocks** (`MOCK_EXPLORE_*`); compare from page 2+ or temporarily account for mock IDs.

| ID | Filter | What to verify | Pass/Fail | Notes / bug file |
|----|--------|----------------|-----------|------------------|
| F1 | Search text | Matches name, description, location, tags, category name | | |
| F2 | Radius | Geo box from `lat`/`lng`/`radius` (no bbox) | | |
| F3 | Date presets | `date` / `endDate` vs mobile presets (any, today, week, month) | | |
| F4 | Visibility | Public / private / any vs `getVisibilityWhere` + friends | | |
| F5 | Collaboration | Only events still needing volunteers | | `event.service.ts` |
| F6 | Category | Single category chip | | |
| F7 | Search here (map) | Four bounds; list within bbox | | `explore-events.service.ts` |
| F8 | Pagination | Infinite scroll; `hasNextPage` / totals | | |

**Open bugs** (fill when found)

| Bug | Files to touch |
|-----|----------------|
| | |

## 4. Automation note

- Unit tests: `vente-mobile` — `explore.page.spec.ts` (Search here success + **error path**), `explore-events.service.spec.ts` (`applyMapBounds`).
- Full F1–F8 still require device or emulator (e.g. Redmi 13C profile / AVD) and a seeded backend.

## 5. Seed data

See [scripts/seed-explore-filter-events.mjs](./scripts/seed-explore-filter-events.mjs) for creating diverse events via `POST /api/events` (requires JWT and `VENTE_ORGANIZER_ID`).

## 6. Session log — 2026-04-23 (local API + ADB, agent run)

**Scope:** Seed DB, verify `GET /api/events` filter semantics, device attach. **MCP `mobile_next`:** the coding agent’s tool bridge does not expose the Cursor `mobile_next` server; **UI tap-through on the real WebView** must be done in **Cursor with MCP `mobile_next` connected** (after fixing `npx` path; see [mcp-mobile-next-capability.md](../mcp-mobile-next-capability.md)), or with Chrome `chrome://inspect` + WebView debugging.

**Data seed (localhost:3000)**

1. `POST /api/users` — created `venteqa_aa161cc6` (id `cmobl1arw0000kcdwle7z57ob`).
2. `POST /api/auth/login` — JWT for organizer.
3. `node .codex-orchestration/testing/scripts/seed-explore-filter-events.mjs` with `VENTE_API_URL=http://127.0.0.1:3000/api` — **4** events (3 public + 1 private; names include `QASEED*`).

**Public API checks (unauthenticated) — results**

| ID | Check | Result |
|----|--------|--------|
| F1 | `search=QASEED` | **PASS** — `total: 3` (3 public; private not listed as anon) |
| F5 | `collaboration=true` | **PASS** — `total: 2` (Art A: `maxCollab` 2; Meetup C: 3; Music B with `maxCollaborators: 0` excluded) |
| F6 | `category=Art` | **PASS** — `total: 1` (id `d7d27d88-…`) |
| — | default list, no bbox | `total: 3` |

**ADB**

- Device: `X8INQ87TQSP75DNR` (physical; not emulator in this run).
- `am start com.vente.mobile/.MainActivity` — OK. UI hierarchy = single `WebView` (inner DOM not visible to `uiautomator` without Mobile-Next or WebView devtools).

**On-device app against this same DB**

- Point `vente-mobile` `environment.apiUrl` to the same host the phone can reach (e.g. your LAN or Tailscale IP + `/api` where **this** Nest instance is running), rebuild/sync, then log in and run the manual rows (map F7, filters F2–F4, F8) using the QA user created above. If the phone still targets another API host, re-run the **seed** against that base URL and login there.

**Matrix fill (API-backed only for this run)**

| ID | Pass/Fail | Notes |
|----|-----------|--------|
| F1 | **PASS** | `search=QASEED` |
| F2 | (pending device) | |
| F3 | (pending device) | |
| F4 | **PASS (anon)** | private event not in public `GET` (expected); friend rules need logged-in + friendship |
| F5 | **PASS** | see above |
| F6 | **PASS** | `category=Art` |
| F7 | (pending device) | needs map + "Search here" on app |
| F8 | (pending device) | |
