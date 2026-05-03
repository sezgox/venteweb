# VenteWeb Backend

NestJS backend for a social events platform.

## Tech Stack
- Node.js + TypeScript
- NestJS 10
- PostgreSQL + Prisma
- JWT authentication
- Google Sign-In, Firebase mobile authentication, and Firebase-backed email activation
- Cloudinary uploads
- Jest

## Run Locally
1. Start PostgreSQL:
   ```bash
   docker-compose up -d
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Configure `.env`.
4. Start in development:
   ```bash
   npm run start:dev
   ```
5. Test base URL:
   ```text
   http://localhost:3000/api
   ```

## Environment Variables
Required variables include:

```env
DATABASE_URL=

JWT_SECRET=
JWT_MOBILE_SECRET=
JWT_REFRESH_SECRET=
JWT_EXPIRES=
JWT_REFRESH_EXPIRES=
JWT_ISSUER=
JWT_AUDIENCE=

GOOGLE_CLIENT_ID=

FIREBASE_PROJECT_ID=
FIREBASE_CLIENT_EMAIL=
FIREBASE_PRIVATE_KEY=

CLOUDINARY_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=

EVENT_ENCRYPTION_KEY=
EVENT_INVITATION_EXPIRES_IN=

# Transactional email (Resend): account activation and external event invitations
RESEND_API_KEY=
RESEND_FROM_EMAIL=
RESEND_FROM_NAME=
# Optional Reply-To
VENTE_INBOUND_EMAIL=
# Public ventewebf origin for links in emails (activation + guest invitation URLs)
ACTIVATION_PUBLIC_BASE_URL=
```

`FIREBASE_PRIVATE_KEY` must keep escaped line breaks (`\\n`) in `.env`.

## Database Runtime and Queries
- Local database runs in Docker via `docker-compose.yml`:
  - image: `postgres:14-alpine`
  - host port: `5432`
- Prisma datasource is `postgresql` and reads `DATABASE_URL` from `.env` (`prisma/schema.prisma`).
- During implementation/verification, agents can execute DB queries against this local instance when needed for validation.

## Authentication Flows
All routes use the `/api` global prefix.

### Web
- `POST /api/users`
  - Creates email/password users as inactive.
  - Backend creates the matching Firebase Auth password account and stores `firebaseUid`.
  - Clients must sign into Firebase and send the verification email; backend login remains blocked until Firebase reports `emailVerified`.
- `POST /api/auth/login`
  - Returns short-lived `access_token`.
  - Sets `refresh_token` cookie (7d by default).
  - Returns `401` with `metadata.activationRequired: true` when the account has not been activated.
- `POST /api/auth/google`
  - Same token behavior as web login.
  - Google-created users are auto-active.
- `POST /api/auth/refresh`
  - Rotates refresh token and returns new access token.

### Mobile
- `POST /api/auth/google/mobile`
  - Body: `{ "idToken": "<firebase-id-token>" }`
  - Verifies Firebase ID token in backend using Firebase Admin SDK.
  - Finds or creates user in DB.
  - Google/Firebase mobile users are auto-active.
  - Returns one app JWT token (`access_token`) signed with `JWT_MOBILE_SECRET` and no expiration.
  - Does not set refresh-token cookie.

## Event Creation Requirement
- `POST /api/events` supports optional poster upload (`poster` field in multipart form-data).
- Events can be created without poster.
- Backend does not assign a default image; frontend should render fallback image when `poster` is null.

## Participation and Invitation Changes
- `ParticipationType` values are now:
  - `Attendance`
  - `Volunteer` (renamed from `Collaboration`)
- `Volunteer` participation is for registered users only.

## Event Ratings
- Public read endpoints:
  - `GET /api/events/:eventId/ratings?page=1&limit=20`
  - `GET /api/events/:eventId/ratings/summary`
- Both read endpoints accept `invitation=<token>` and reuse event detail visibility rules for private events.
- Protected write endpoints:
  - `POST /api/events/:eventId/ratings`
  - `PATCH /api/events/:eventId/ratings/me`
- Body: `{ "score": 1-5, "text": "optional, max 500 chars" }`.
- Only registered participants can rate after the event ends. Organizers cannot rate their own event.
- The backend stores `Event.totalRate` and `Event.ratingCount` aggregates and notifies the organizer when a rating is created or its score changes.

### Resend: external event invitations
- After `external-invitation.created`, the notification listener sends email via **Resend** (same transport as account activation: `src/notifications/invitation-mail.service.ts` + `templates/external-invitation-email.template.ts`).
- Required: `RESEND_API_KEY`, `RESEND_FROM_EMAIL` (and typically `RESEND_FROM_NAME`). Same variables as `ActivationMailService`.
- Optional: `VENTE_INBOUND_EMAIL` (Reply-To).
- Guest deep links use `ACTIVATION_PUBLIC_BASE_URL` (see `resend-config.const.ts`) to build
  `{origin}/events/event/{eventId}?invitation={token}&guest=true` (token is URL-encoded).
- If Resend is not configured, invitation creation still succeeds; the skip/failure is logged only.

### Invitation acceptance (canonical endpoint)
- Accept invitation participation through `POST /api/events/:id/participations`.
- For invitation acceptance include:
  - `invitationId`
  - `invitation` (token; if omitted, stored token is used)
- Legacy endpoint `POST /api/users/:id/invitations/:invitationId` is deprecated and returns `410`.

### Invitation Preparation and Delivery
- `GET /api/users/friends/search?search=...` (Auth required)
  - returns only mutual friends of the requester.
- `POST /api/events/:id/invitations` (Auth required, organizer only)
  - creates the invitation and dispatches it immediately.
  - supports:
    - friend invitations via `userId`
    - external invitations via `firstName`, `lastName`, and at least one contact channel (`email`, `phone`, or both)
  - registered friends receive in-app notification delivery immediately after persistence.
  - external contacts with email are emailed immediately after persistence.
  - phone-only external invitations are persisted immediately and must rely on manual/share flows because backend has no email destination.

### ExternalUser Persistence
- `ExternalUser` has:
  - `firstName`, `lastName`,
  - `email` (unique, nullable),
  - `phone` (unique, nullable),
  - relations to both `invitations` and `participations`.

## Build and Test
```bash
npm run test
npm run test:e2e
```

## Iteration Strategy
- For small and localized changes, use `npm run start:dev` + targeted tests/manual API checks.
- Do not run `npm run build` during normal iteration.
- Allow `npm run build` only after installing new dependencies or when dependency/bootstrap changes make build validation unavoidable.

## Multi-Agent Orchestration
This repository includes an orchestration scaffold generated from the Codex bootstrap script.

### Path
- `C:\dev\vente\.codex-orchestration\`

### Agent Contexts
- `agents/planner-context.md`
- `agents/coder-context.md`
- `agents/verifier-context.md`
- `agents/tester-context.md`

### Handoffs
- `handoffs/planner-handoff.md`
- `handoffs/coder-notes.md`
- `handoffs/verifier-report.md`
- `handoffs/tester-report.md`

### Coder Skill
- `skills/coder-design-pattern/SKILL.md`
- Recommended architecture: Modular Monolith + DDD-lite + Ports/Adapters at module boundaries.

### Tester Assets
- Postman template collection: `C:\dev\vente\.codex-orchestration\testing\postman\venteweb-local.postman_collection.json`
- Thunder Client template collection: `C:\dev\vente\.codex-orchestration\testing\thunder-client\venteweb-local.thunder_collection.json`
- API testing guide: `C:\dev\vente\.codex-orchestration\testing\README.md`
- Rule: any new API flow/endpoint must be added to these collections in the same change set.
- Included flow: `Events - Create (poster optional)` with optional fixture file at `C:\dev\vente\.codex-orchestration\testing\fixtures\event-poster.png`.

### Orchestration Note
- The active flow is `Planner -> Coder -> Verifier -> Tester`.
- Global cross-project work should prefer the root `C:\dev\vente\.codex-orchestration` context.
