# AGENTS: Project Architecture and Contribution Guide

This document explains the backend architecture, folder structure, conventions, domain flows, and how to request changes. All code and documentation MUST be written in English.

- Audience: developers and AI agents contributing to this repository.
- Scope: NestJS backend for a social events application.

## 1) Tech Stack
- Runtime: Node.js (TypeScript)
- Framework: NestJS 10 (modular architecture, DI, pipes, guards)
- Database: PostgreSQL via Prisma ORM
- Storage: Cloudinary for image uploads
- Auth: JWT-based, with Google Sign-In support
- Scheduling: @nestjs/schedule (cron jobs)
- Validation: class-validator + class-transformer via global ValidationPipe
- Tests: Jest (unit/e2e scaffolding present)

## 2) How To Run (overview)
- Start Postgres: `docker-compose up -d`
- Ensure `DATABASE_URL` and all required environment variables are defined in `.env`
- Install deps: `npm install`
- Dev: `npm run start:dev`
- Prod: `npm run build && npm run start:prod`

Required env variables (non-exhaustive):
- DATABASE_URL
- JWT_SECRET, JWT_EXPIRES, JWT_ISSUER, JWT_AUDIENCE
- GOOGLE_CLIENT_ID
- CLOUDINARY_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET
- EVENT_ENCRYPTION_KEY, EVENT_INVITATION_EXPIRES_IN

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
│  │  │  ├─ event-image-default.const.ts
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
│  │  ├─ auth.controller.ts     # /api/auth login/logout/google
│  │  ├─ auth.module.ts
│  │  ├─ auth.service.ts
│  │  └─ dto/
│  │     └─ login-user.dto.ts   # DTOs for auth
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
- `AuthMiddleware` (applied to UserController and EventController) parses Bearer token and attaches `req.user` when valid. Requests without token are allowed to proceed as anonymous.
- `AuthGuard` protects specific endpoints (decorated with `@UseGuards(AuthGuard)`) and rejects when token is missing/invalid. The guard relies on `jwt-config.const.ts` for verification.
- JWT payload includes `sub`, `permission`, `level`, `location`, `email`, `photo`, `username`.

### Configuration
- JWT sign options are read from env via `jwt-config.const.ts`. `.env` is loaded at runtime.
- Cloudinary provider reads env: `CLOUDINARY_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`.
- Invitation service uses `EVENT_ENCRYPTION_KEY` and `EVENT_INVITATION_EXPIRES_IN`.

### Persistence
- `PrismaService` extends `PrismaClient` (imported from generated client at `generated/prisma`). Client is connected on module init.
- Repositories (`user.repository.ts`, `event.repository.ts`, `participation.repository.ts`) encapsulate DB operations.

### File Storage
- `CloudinaryService` handles streaming upload and deletion. Folders are typically namespaced per entity (e.g., `events/{eventId}`).

## 5) Domain Overview & Flows

### Users (`/api/users`)
- Create user: hash password (bcrypt), unique username/email enforced by DB (errors surfaced as `BadRequestException` on conflicts).
- Get user by id: if the requester is the same user, include own events, participations, requests, invitations; else, filter to public visibility or friendship-based access.
- Invitations to events: create, cancel/reject, and accept (acceptance creates a participation).
- Managed events: list events the user organizes or participates in; computed via domain logic in `User` entity and repositories.

### Auth (`/api/auth`)
- `POST /auth/login`: username/email + password -> JWT.
- `POST /auth/google`: verify Google token, create user if needed, then issue JWT.
- `POST /auth/logout`: placeholder.

### Events (`/api/events`)
- Create: organizer-only; optionally upload poster to Cloudinary. Generates an encrypted “masterKey” per-event and stores it as `invitation` (AES-256-CBC). The master key is used to sign short-lived invitation JWTs.
- List: filter by date (defaults to now), category, language, search (name/tags), and geolocation (bounding box or radius). Sort options: `date | popularity | distance`. When `distance`, the request must include either center+radius or a bounding box; ordering uses the Haversine formula via a raw SQL query. Visibility rules:
  - Public
  - Private (visible to “friends”) or with a valid invitation token
- Get by id: enforces visibility rules; returns event without sensitive invitation fields.
- Invitation token for view: only organizer can generate `:id/invitationToken`.
- Delete: organizer-only; removes event and associated image from Cloudinary when applicable.

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

---
This document is the single source of truth for architecture, conventions, and how to collaborate on this backend. Keep it up to date when patterns evolve.
