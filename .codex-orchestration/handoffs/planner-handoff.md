# Planner Handoff — Phase 1 Notifications + Feed API (mobile)

## Objective

Ship in-app notifications with Socket.IO aligned to `venteweb` gateway, dedicated Notifications screen reachable from Social (bell + back), viewport-based mark-as-read, and confirm Feed API `participations` contract without removing Explore mocks.

## System Map

- **Mobile:** `vente-mobile` — Ionic/Angular, `NotificationsService` (REST), tabs under `tabs-routing.module.ts`.
- **Backend:** `venteweb` — `NotificationsGateway` at Socket.IO `path: '/notifications'`, JWT in `handshake.auth.token`; `GET /api/events` includes `participations` via Prisma.

## Change Plan (files)

| File | Action |
|------|--------|
| `vente-mobile/package.json` | Add `socket.io-client` |
| `vente-mobile/src/app/core/services/notifications-socket.service.ts` | **New** — connect/disconnect, listen `notification`, merge via `NotificationsService` |
| `vente-mobile/src/app/core/services/notifications.service.ts` | Dedupe `pushNotification` by `id` |
| `vente-mobile/src/app/core/services/users.service.ts` | `connect()` after login + after `loadUser` success; `disconnect()` in `clearCurrentUser` |
| `vente-mobile/src/app/core/directives/mark-notification-read-on-visible.directive.ts` | **New** — `IntersectionObserver` + debounced `markAsRead` |
| `vente-mobile/src/app/pages/notifications/notifications.page.ts/html` | Back button, directive on rows |
| `vente-mobile/src/app/pages/social/social.page.ts/html/scss` | Placeholder hub; bell → `/tabs/notifications`; remove inline list / mark-all |
| `vente-mobile/src/app/tabs/tabs-routing.module.ts` | Load `NotificationsPage` instead of redirect |
| `vente-mobile/src/app/core/i18n/locales/en|es/notifications.translations.ts` | Social placeholder copy |
| `vente-mobile/src/app/core/services/explore-events.service.spec.ts` | **New** — light test for mock merge + participations tolerance |

## Test Plan

- `cd vente-mobile && npm run lint`
- `cd vente-mobile && npm test` (ChromeHeadless)

## Acceptance Criteria

- Socket connects when JWT present; disconnects on logout/session clear.
- Realtime `notification` events appear in list without duplicate rows for same `id`.
- `/tabs/notifications` shows list with back to Social; Social shows placeholder; bell opens notifications.
- Unread rows mark read when scrolled into view (threshold ~0.35, debounced).
- Lint + unit tests pass.

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Socket URL/path mismatch | Base URL = `apiUrl` without `/api`; `path: '/notifications'` |
| Logout order vs token | `disconnect()` does not need token |

## Execution Order

1. Dependencies + socket service + users integration + notifications dedupe
2. Routing + Social + Notifications UI + directive
3. Explore unit spec (feed contract)
4. Verifier (lint/test) + Tester (MCP) + roadmap doc

## Done Definition

Verifier `PASS`, tester report filed, `mobile-roadmap.md` updated.

## GO/NO-GO (Verifier)

- **GO:** All acceptance criteria + lint + tests green.
- **NO-GO:** Socket leak after logout; broken tab navigation; mass mark-read on open.
