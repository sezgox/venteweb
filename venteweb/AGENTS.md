# AGENTS: Project Architecture and Contribution Guide

This document explains the backend architecture, folder structure, conventions, domain flows, and how to request changes. All code and documentation MUST be written in English.

- Audience: developers and AI agents contributing to this repository.
- Scope: NestJS backend for a social events application.

## Product priority (supporting role)

During **MOBILE APP FIRST** (see `.codex-orchestration/project-context.md` → **Product priority**), prioritize **API stability**, clear DTOs, and backend work that **unblocks or protects** the `vente-mobile` Android MVP. Defer broad refactors not required for that milestone unless Planner explicitly includes them.

## 1) Tech Stack
- Runtime: Node.js (TypeScript)
- Framework: NestJS 11.1.x (modular architecture, DI, pipes, guards)
- Database: PostgreSQL via Prisma ORM
- Storage: Cloudinary for image uploads
- Auth: JWT-based, with Google Sign-In, Firebase mobile authentication, and Firebase-backed email activation support
- Scheduling: @nestjs/schedule (cron jobs)
- Validation: class-validator + class-transformer via global ValidationPipe
- Tests: Jest (unit/e2e scaffolding present)

## 2) How To Run (overview)
- Start Postgres: `docker-compose up -d`
- Ensure `DATABASE_URL` and all required environment variables are defined in `.env`
- Install deps: `npm install`
- Dev: `npm run start:dev`
- Prod: install deps if needed, then `npm run start:prod` from a prepared build artifact

Required env variables (non-exhaustive):
- DATABASE_URL
- JWT_SECRET, JWT_MOBILE_SECRET, JWT_EXPIRES, JWT_ISSUER, JWT_AUDIENCE
- JWT_REFRESH_SECRET, JWT_REFRESH_EXPIRES
- GOOGLE_CLIENT_ID
- FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY
- CLOUDINARY_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET
- EVENT_ENCRYPTION_KEY, EVENT_INVITATION_EXPIRES_IN
- RESEND_API_KEY, RESEND_FROM_EMAIL, RESEND_FROM_NAME, optional VENTE_INBOUND_EMAIL, ACTIVATION_PUBLIC_BASE_URL (Resend: activation + external invitation emails)

## 3) Folder Structure

```
/ (repo root)
├─ .env                         # environment variables (not committed)
├─ .eslintrc.js                 # ESLint config
├─ .gitignore
├─ .prettierrc                  # Prettier config
├─ docker-compose.yml           # Postgres service
├─ nest-cli.json
├─ package.json
├─ package-lock.json
├─ prisma/
│  ├─ migrations/               # Prisma migrations
│  └─ schema.prisma             # Prisma schema (generator outputs to ../generated/prisma)
├─ generated/
│  └─ prisma/                   # Prisma client output (gitignored)
├─ src/
│  ├─ main.ts                   # Bootstrap, global pipes, CORS, global prefix
│  ├─ app.module.ts             # Root module, middleware setup
│  ├─ app.controller.ts         # Example controller (address endpoint)
│  ├─ app.service.ts
│  ├─ prisma.service.ts         # PrismaClient provider
│  ├─ core/
│  │  ├─ consts/
│  │  │  ├─ firebase-config.const.ts
│  │  │  └─ jwt-config.const.ts
│  │  ├─ guards/
│  │  │  └─ auth.guard.ts       # Protects routes using JWT
│  │  ├─ interfaces/
│  │  │  ├─ event-status.enum.ts
│  │  │  ├─ request-participation-status.enum.ts
│  │  │  └─ response.interface.ts
│  │  ├─ middlewares/
│  │  │  └─ auth/
│  │  │     └─ auth.middleware.ts   # Attaches req.user if JWT is valid
│  │  └─ services/
│  │     └─ invitations.service.ts  # Invitation tokens (AES/JWT)
│  ├─ auth/
│  │  ├─ auth.controller.ts     # /api/auth endpoints: login, logout, google, google/mobile, refresh
│  │  ├─ auth.module.ts
│  │  ├─ auth.service.ts
│  │  └─ dto/
│  │     ├─ login-user.dto.ts
│  │     └─ mobile-login.dto.ts # DTOs for auth
│  ├─ user/
│  │  ├─ user.controller.ts     # /api/users endpoints
│  │  ├─ user.module.ts
│  │  ├─ user.repository.ts     # DB access via Prisma
│  │  ├─ user.scheduler.ts      # Cron to upgrade user levels
│  │  ├─ user.service.ts
│  │  ├─ dto/
│  │  │  ├─ create-user.dto.ts
│  │  │  └─ update-user.dto.ts
│  │  └─ entities/
│  │     └─ user.entity.ts
│  ├─ event/
│  │  ├─ event.controller.ts    # /api/events endpoints
│  │  ├─ event.module.ts
│  │  ├─ event.repository.ts
│  │  ├─ event.service.ts
│  │  ├─ dto/
│  │  │  ├─ create-event.dto.ts
│  │  │  ├─ filter-event.dto.ts
│  │  │  └─ update-event.dto.ts
│  │  └─ entities/
│  │     └─ event.entity.ts
│  ├─ participation/
│  │  ├─ participation.module.ts
│  │  ├─ participation.repository.ts
│  │  ├─ dto/
│  │  │  ├─ create-invitation.dto.ts
│  │  │  ├─ create-participation.dto.ts
│  │  │  ├─ create-request-participation.dto.ts
│  │  │  └─ ...
│  │  └─ entities/
│  │     ├─ participation.entity.ts
│  │     ├─ participation-invitation.entity.ts
│  │     ├─ participation-request.entity.ts
│  │     └─ ...
│  └─ cloudinary/
│     ├─ cloudinary.module.ts
│     ├─ cloudinary.response.ts
│     ├─ cloudinary.service.ts
│     └─ cloudinary/
│        └─ cloudinary.ts       # Provider config from env
├─ test/
│  ├─ app.e2e-spec.ts
│  └─ jest-e2e.json
└─ tsconfig*.json
```

## 4) Runtime and Cross-Cutting Concerns

- Global prefix: `/api`
- Global pipes (`main.ts`):
  - `whitelist: true` (strip unknown fields)
  - `forbidNonWhitelisted: true` (reject extra fields)
  - `transform: true` + implicit conversion enabled
- CORS enabled

### Authentication & Authorization
- `AuthMiddleware` parses Bearer tokens and attaches `req.user` when valid. It supports both web JWT secret and mobile JWT secret. Requests without token are allowed to proceed as anonymous.
- `AuthGuard` protects specific endpoints (decorated with `@UseGuards(AuthGuard)`) and rejects when token is missing/invalid. The guard relies on `jwt-config.const.ts` for verification.
- JWT payload includes `sub`, `permission`, `level`, `email`, `photo`, `username`, `name`, `locale`, `bio`, `active`. Mobile tokens also include `authSource: mobile`.
- `AuthGuard` rejects inactive JWT payloads. Email/password users cannot log in until Firebase reports their email as verified; the login response returns `401` with `metadata.activationRequired: true`.

### Configuration
- JWT sign options are read from env via `jwt-config.const.ts`. Web access tokens use expiration (`JWT_EXPIRES`), refresh tokens use `JWT_REFRESH_EXPIRES`, and mobile tokens are signed without expiration.
- Firebase Admin credentials are read from env via `firebase-config.const.ts` (`FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`) to verify mobile Firebase ID tokens.
- Cloudinary provider reads env: `CLOUDINARY_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`.
- Invitation service uses `EVENT_ENCRYPTION_KEY` and `EVENT_INVITATION_EXPIRES_IN`.
- Resend (transactional email) reads `src/core/consts/resend-config.const.ts`: `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `RESEND_FROM_NAME`, optional `VENTE_INBOUND_EMAIL`, and `ACTIVATION_PUBLIC_BASE_URL` (activation links and external-invitation guest URLs on ventewebf).
- `ActivationMailService` sends account activation; `InvitationMailService` in `src/notifications/` sends external event invitation emails.

### Persistence
- `nest-cli.json` uses `deleteOutDir: false` so `nest start --watch` does not wipe all of `dist/` on each run (Windows often hits **EPERM** when `query_engine-windows.dll.node` under an old `dist/generated/prisma` copy is still locked). The Prisma client is not required under `dist/` (see above). For a full clean build, stop the API and run `npm run clean:dist`, then `npm run build`.
- DTOs and services still use `import … from 'generated/prisma'`, which the compiler rewrites to `require("…/dist/generated/prisma/…")`. **`npm run build` / `start` / `start:dev` run `scripts/ensure-dist-prisma-link.cjs`**, which creates a **junction** (Windows) or **symlink** (Unix) at `dist/generated/prisma` pointing at `<repo>/generated/prisma` so those requires resolve. Run `npx prisma generate` first.
- Repositories (`user.repository.ts`, `event.repository.ts`, `participation.repository.ts`) encapsulate DB operations.

### File Storage
- `CloudinaryService` handles streaming upload and deletion. Folders are typically namespaced per entity (e.g., `events/{eventId}`).

## 5) Domain Overview & Flows

### Users (`/api/users`)
- Create user: create matching Firebase Auth password account, hash password (bcrypt), store `firebaseUid`, persist as `active: false`, and rely on the client-sent Firebase verification email before login. Unique username/email is enforced by DB.
- Get user by id: if the requester is the same user, include own events, participations, requests, invitations; else, filter to public visibility or friendship-based access.
- Invitations to events: create, cancel/reject, and accept (acceptance creates a participation).
- Friend search for invitation flows is available at `GET /api/users/friends/search?search=...` and must return only mutual friends of the requester.
- Managed events: list events the user organizes or participates in; computed via domain logic in `User` entity and repositories.

### Auth (`/api/auth`)
- `POST /auth/login`: username/email + password -> short-lived access JWT + refresh token cookie only after account activation. If inactive, checks Firebase email verification and activates locally when verified.
- `POST /auth/google`: verify Google token, create user if needed, then issue short-lived access JWT + refresh token cookie.
- `POST /auth/google/mobile`: verify Firebase ID token, create user if needed as active, then issue one mobile JWT without expiration and without refresh cookie.
- `POST /auth/logout`: placeholder.

### Events (`/api/events`)
- Create: organizer-only; poster image upload is optional (`poster` multipart file) and stored in Cloudinary when provided. Backend does not inject a default image. Generates an encrypted “masterKey” per-event and stores it as `invitation` (AES-256-CBC). The master key is used to sign short-lived invitation JWTs.
- List: filter by date (defaults to now), category, language, search (name/tags), and geolocation (bounding box or radius). Sort options: `date | popularity | distance`. When `distance`, the request must include either center+radius or a bounding box; ordering uses the Haversine formula via a raw SQL query. Visibility rules:
  - Public
  - Private (visible to “friends”) or with a valid invitation token
- Get by id: enforces visibility rules; returns event without sensitive invitation fields.
- Invitation token for view: only organizer can generate `:id/invitationToken`.
- Delete: organizer-only; removes event and associated image from Cloudinary when applicable.
- Ratings:
  - `GET /api/events/:eventId/ratings?page=&limit=&invitation=` lists ratings with the same event visibility rules as event detail.
  - `GET /api/events/:eventId/ratings/summary?invitation=` returns average, total, and a 1-5 histogram.
  - `POST /api/events/:eventId/ratings` and `PATCH /api/events/:eventId/ratings/me` are protected. Only registered participants can rate after the event end date; organizers cannot rate their own event.
  - Ratings are one per participation and upserted by participation. `Event.totalRate` and `Event.ratingCount` are stored aggregates maintained in the rating transaction.
  - Creating a rating or changing its score sends a `Rating` notification to the organizer.

### Participation
- Requests: user may request to participate (collaborate/attend). For private events, a valid invitation token is required.
- Cancel/Reject request: delete request by id with authorization checks.
- Create participation: accept participation for public events or private ones with a valid invitation token.

### Invitations (Core)
- `InvitationsService`:
  - `generateMasterKey()`: create a random key per event.
  - `encryptMasterKey() / decryptMasterKey()`: AES-256-CBC with IV to protect the master key at rest.
  - `generateInvitation()`: sign invitation JWT with the event’s master key; payload contains `eventId`, `organizer`, optionally `invitedUser`.
  - `verifyInvitation()`: validates token and, if present, verifies `invitedUser` matches.

### Social Graph
- Friendship is derived from the intersection of followers/following (see `user.repository.ts`). Used to determine visibility for private events.

## 6) API Response Shape
- Typical controllers manually build a JSON envelope with shape:

```ts
interface CustomResponse<T> {
  success: boolean;
  message?: string;
  results?: T;
  metadata?: any;
}
```

- When adding endpoints, prefer returning the same envelope for consistency.

## 7) Coding Conventions
- Language: All code, identifiers, comments, and documentation must be in English.
- Style: Follow ESLint + Prettier (configs already present).
- DTOs: Use `class-validator` decorators; ensure global ValidationPipe covers them.
- Controllers:
  - Protect sensitive endpoints with `@UseGuards(AuthGuard)`.
  - Either use Nest’s implicit returns or `@Res()` with explicit responses; be consistent within a controller. Current code often uses `@Res()`.
- Services: Stateless where possible; keep business logic inside services and domain entities where applicable.
- Repositories: Encapsulate all Prisma access; do not call Prisma directly from controllers/services outside repositories.
- Errors: Throw Nest exceptions (`BadRequestException`, `UnauthorizedException`, `ForbiddenException`, `NotFoundException`) and let controllers format response if using `@Res()`.
- Logging: Prefer Nest `Logger` over `console.*` for production paths.
- Configuration: Read from environment; do not hardcode secrets. Ensure strong `EVENT_ENCRYPTION_KEY`.
- File uploads: Use Nest interceptors (`FileInterceptor`) and services; never handle raw streams in controllers.
- Documentation: Keep README.md and AGENTS.md in sync. Whenever any public API, domain flow, environment variable, folder structure, or convention changes, update both documents in the same PR.
- **CRITICAL:** Agents MUST update `AGENTS.md` every time a code change is made to reflect the new state of the codebase. This is mandatory.
- Keep both documents consistent. If any section becomes outdated, the PR is not complete.

## 8) PR Checklist (Copy into your PR template)ors.
- Create/Update DTOs under the module’s `dto/` folder with validation decorators.
- Add/Update controller routes; secure with `AuthGuard` when required. Keep response envelope consistent.
- Add service methods for business logic.
- If DB interactions are needed, add methods to the corresponding repository.
- Update domain entities if business rules live there (e.g., `User`, `Event`).
- If an event invitation flow is involved, use `InvitationsService` utilities; never store plaintext master keys.
- For images, use `CloudinaryService` and standardize folders per entity id.
- Update tests as needed (unit/e2e).
- Document the change in this file if it adds new cross-cutting rules or module boundaries.
- Update documentation: Reflect all relevant changes in both README.md and AGENTS.md (routes, env vars, data model/migrations, domain flows, folder structure, conventions). Keep these documents synchronized within the same PR.

## 9) Requesting Changes (for humans or AI agents)

Please include the following in your request:
- What you want to change (feature/bug/cleanup)
- Affected module(s): `auth | user | event | participation | core | cloudinary`
- API changes (routes, request/response types)
- Data model changes (Prisma schema and migrations)
- Security implications (authz, secrets, PII)
- Validation rules (DTO updates)
- Backward compatibility and migration notes

Example request:
```
Change: Add endpoint to list a user’s pending invitations.
Modules: user, participation
API: GET /api/users/:id/invitations?status=pending
DTOs: Add pagination query DTO
Repo: participation.repository - add findInvitationsByUser(userId, status)
Security: Protected with AuthGuard, only self-view or friend-view rules
Validation: Use ValidationPipe for query params
```

## 10) Known Considerations
- Environment: ensure strong keys; avoid using default placeholder secrets in production.
- Generated Prisma client lives under `generated/prisma` (gitignored). Run `npx prisma generate` after schema changes.
- Keep public/private event visibility rules aligned with friendship logic in `user.repository.ts`.

## 11) Local Test URL and Build Policy
- Primary local API URL (dev): `http://localhost:3000/api`
- Typical dev run command: `npm run start:dev`
- Database runtime and queries:
  - PostgreSQL runs in Docker (`docker-compose.yml`) on `localhost:5432`.
  - Prisma datasource uses `.env` via `DATABASE_URL` (`prisma/schema.prisma`).
  - Agents are allowed to run DB queries for validation/debugging as part of Planner/Verifier/Tester execution when needed.
- For small and localized changes, prefer fast iteration:
  - run targeted tests/manual checks,
  - do not use `npm run build` during normal iteration.
- Allow `npm run build` only after installing new dependencies or when dependency/bootstrap changes make build validation unavoidable.

## 12) Multi-Agent Orchestration Standard (Codex Bootstrap)
- This repository uses the root workspace `C:\dev\vente\.codex-orchestration\` as the standard collaboration workspace for role-based execution.
- Required handoffs are stored at `C:\dev\vente\.codex-orchestration\handoffs\`:
  - `planner-handoff.md`
  - `coder-notes.md`
  - `verifier-report.md`
  - `tester-report.md`
- Role-specific contexts are stored at `C:\dev\vente\.codex-orchestration\agents\`:
  - `planner-context.md`
  - `coder-context.md`
  - `verifier-context.md`
  - `tester-context.md`
- Coder must follow project skill:
  - `C:\dev\vente\.codex-orchestration\skills\coder-design-pattern\SKILL.md`
  - Preferred pattern: Modular Monolith with DDD-lite and Ports/Adapters at module boundaries.
- Tester workflow requirements:
  - Use Thunder Client or Postman for API validation.
  - Keep reusable collections under `C:\dev\vente\.codex-orchestration\testing\`.
  - Event creation flow must cover both cases: with poster file and without poster file.
  - Optional fixture for local collection execution: `C:\dev\vente\.codex-orchestration\testing\fixtures\event-poster.png`.
  - Document full executable flows (create/update/delete and prerequisites) requested by Planner/Verifier.
  - Run UI smoke coverage with MCP browser across all major app screens (auth, dashboard, explore/listing, event detail, profile/settings, and critical CRUD forms when available).
  - For each run, include deterministic navigation steps and pass/fail result per screen in `handoffs/tester-report.md`.
  - When user specifies an account/screen target, Tester must prioritize that path first (example: Google login user `elias.szg2000` -> event detail view).
  - Mandatory: every new API flow/endpoint change must update Postman/Thunder collections in the same PR/changeset.
## 13) Invitations and Participation Rules (Updated)
- `ParticipationType` is now `Attendance | Volunteer`.
- `Volunteer` replaces previous `Collaboration` semantics.
- Volunteer participations are only valid for registered users.
- External invitations are supported for non-registered users:
  - Route: `POST /api/events/:id/invitations` (organizer only, guarded).
  - Required payload:
    - `eventId` (must match path id)
    - `text`
    - `firstName`
    - `lastName`
    - at least one contact channel: `email`, `phone`, or both
  - External invitation participation type is always `Attendance`.
  - Hybrid routing:
    - if `email` belongs to an existing `User`, create regular invitation for that user and emit `invitation.created` notification.
    - if no registered user is found, resolve/create `ExternalUser` and create invitation for that external user.
  - External invitations with `email` also emit `external-invitation.created` and attempt async Resend delivery (`InvitationMailService`).
  - External invitations with only `phone` do not send email.
  - No in-app notification is emitted for external-user invitations.
  - External invitation JWT payload also includes `externalUserId` so frontend clients can correlate the invitation link with an existing external participation.
- Resend email content is built in `src/notifications/templates/external-invitation-email.template.ts` (HTML + plain text). The guest CTA uses `ACTIVATION_PUBLIC_BASE_URL` + `/events/event/{eventId}?invitation=...&guest=true`.
- Invitation acceptance must use:
  - `POST /api/events/:id/participations` with `invitationId` (and token in `invitation` when needed).
- Prepared invitation flow:
  - `POST /api/events/:id/invitations` persists and dispatches the invitation in the same operation.
  - registered users can only be invited if they are friends of the organizer.
  - registered-user invitations emit in-app notification immediately after creation.
  - external invitations with email emit async Resend delivery immediately after creation.
  - phone-only external invitations cannot be backend-delivered and must rely on share flows.
- Legacy user acceptance route:
  - `POST /api/users/:id/invitations/:invitationId` is deprecated and returns `410`.

## 14) Data Model Additions (Updated)
- New Prisma model: `ExternalUser`
  - Stores `firstName`, `lastName`, and contact channels (`email`, `phone`).
- `email` and `phone` are unique (nullable).
  - Linked to both `Invitation` and `Participation`.
- `Invitation` now supports either:
  - registered target (`userId`), or
  - external target (`externalUserId`).

## 15) Account Activation
- `User` has `active`, `activatedAt`, and `firebaseUid`.
- Existing users remain active through the migration default.
- Email/password registration creates inactive users and a Firebase password account; clients send the Firebase verification email.
- Google and Firebase mobile Google users are trusted as verified and are stored/updated as active.
- Protected routes require active JWT payloads.

## 16) Virtual Events Model
- `Event` is now the aggregate root with `onlyVirtual` plus optional 1:1 children `OnSiteEvent` and `VirtualEvent`.
- `OnSiteEvent` stores location, geo coordinates, schedule, request policy, capacity, and rating aggregate for the physical mode.
- `VirtualEvent` stores schedule, request policy, capacity, rating aggregate, and `Platform[]` for the remote mode.
- `Platform` belongs to `VirtualEvent` and stores `{ name, link }` pairs such as Twitch/Zoom links.
- Participation, request, invitation, and rating records now carry `eventMode` (`OnSite | Virtual`).
- `POST /events` now expects `onlyVirtual` plus nested `onSite` / `virtual` payloads (typically serialized as JSON strings inside multipart form data).
- `GET /events` accepts `virtual=true` for hybrid-only list/map filtering and `virtualScope=all` for the dedicated virtual feed.
- Distance and map queries must only use `OnSiteEvent`; virtual-only events are intentionally excluded from map/radius results.
- Invitation tokens are mode-aware: the JWT payload includes `eventMode`, and verification uses the encrypted invitation secret from the selected child model.

---
This document is the single source of truth for architecture, conventions, and how to collaborate on this backend. Keep it up to date when patterns evolve.
