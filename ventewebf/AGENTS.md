# AGENTS — Project Guide for Contributors

This document defines how this Angular project is structured and how agents/contributors should implement changes. It standardizes code style, architecture decisions, and the documentation workflow.

Important: All code (identifiers, comments, commit messages) must be written in English.

## 1) Tech Stack

- Angular 18 (Standalone Components, Angular Router)
- TypeScript (strict mode)
- RxJS
- TailwindCSS + PostCSS + Autoprefixer
- ngx-toastr
- Google Identity Services + Google Maps JavaScript API

## 2) Project Layout

High-level folders:

- `src/`
  - `index.html` — App entry HTML
  - `main.ts` — Client bootstrap
  - `main.server.ts` — Server bootstrap (SSR-ready, not fully configured)
  - `styles.css` — Global styles and Tailwind layers
  - `enviroments/` — Environment configuration (development; add production file)
  - `app/` — Application source code
    - `app.component.*` — Root component
    - `app.config*.ts` — Global providers (router, hydration, animations, toastr, http)
    - `app.routes.ts` — Root routes
    - `components/` — Reusable UI components
      - `auth/` — Auth modal component
      - `shared/` — Shared UI
        - `header/`
        - `navbar/`
        - `map/`
        - `event-card/`
    - `core/` — Core application layer
      - `guards/` — Route guards
      - `interceptors/` — HTTP interceptors
      - `interfaces/` — App-wide TypeScript interfaces/DTOs
      - `services/` — Services (API, auth, users, events, geolocation, theme)
    - `pages/` — Feature pages
      - `landing/`
      - `events/`
        - `events.routes.ts`
        - `events.component.*`
        - `explore/`
        - `event/`
        - `add-event/`
        - `events-dashboard/` (lazy-loaded)

Build and tooling:

- `angular.json` — Angular CLI configuration
- `tsconfig*.json` — TS configs
- `tailwind.config.js`, `postcss.config.js`
- `README.md`, `AGENTS.md`

### 2.1) Current Folder Tree

```
ventewebf/
├─ .angular/
├─ .vscode/
├─ node_modules/
├─ public/
├─ AGENTS.md
├─ README.md
├─ angular.json
├─ package.json
├─ package-lock.json
├─ postcss.config.js
├─ tailwind.config.js
├─ tsconfig.json
├─ tsconfig.app.json
├─ tsconfig.spec.json
├─ .editorconfig
├─ .gitignore
└─ src/
   ├─ index.html
   ├─ main.ts
   ├─ main.server.ts
   ├─ styles.css
   ├─ enviroments/
   │  └─ enviroment.ts
   └─ app/
      ├─ app.component.ts
      ├─ app.component.html
      ├─ app.component.css
      ├─ app.component.spec.ts
      ├─ app.config.ts
      ├─ app.config.server.ts
      ├─ app.routes.ts
      ├─ components/
      │  ├─ auth/
      │  │  ├─ auth.component.ts
      │  │  ├─ auth.component.html
      │  │  ├─ auth.component.css
      │  │  └─ auth.component.spec.ts
      │  └─ shared/
      │     ├─ header/
      │     │  ├─ header.component.ts
      │     │  ├─ header.component.html
      │     │  └─ header.component.css
      │     ├─ navbar/
      │     │  ├─ navbar.component.ts
      │     │  ├─ navbar.component.html
      │     │  └─ navbar.component.css
      │     ├─ map/
      │     │  ├─ map.component.ts
      │     │  ├─ map.component.html
      │     │  └─ map.component.css
      │     └─ event-card/
      │        ├─ event-card.component.ts
      │        ├─ event-card.component.html
      │        └─ event-card.component.css
      ├─ core/
      │  ├─ guards/
      │  │  └─ auth.guard.ts
      │  ├─ interceptors/
      │  │  └─ auth.interceptor.ts
      │  ├─ interfaces/
      │  │  ├─ api-response.interface.ts
      │  │  ├─ events.interfaces.ts
      │  │  ├─ login.dto.interface.ts
      │  │  ├─ manage-events.interface.ts
      │  │  ├─ register.dto.interface.ts
      │  │  └─ user.interfaces.ts
      │  └─ services/
      │     ├─ api.service.ts
      │     ├─ auth.service.ts
      │     ├─ events.service.ts
      │     ├─ geolocation.service.ts
      │     ├─ maps.service.ts
      │     ├─ theme.service.ts
      │     └─ users.service.ts
      └─ pages/
         ├─ landing/
         │  ├─ landing.component.ts
         │  ├─ landing.component.html
         │  └─ landing.component.css
         └─ events/
            ├─ events.routes.ts
            ├─ events.component.ts
            ├─ add-event/
            │  ├─ add-event.component.ts
            │  ├─ add-event.component.html
            │  └─ add-event.component.css
            ├─ event/
            │  ├─ event.component.ts
            │  ├─ event.component.html
            │  ├─ event.component.css
            │  └─ event.component.spec.ts
            ├─ explore/
            │  ├─ explore.component.ts
            │  ├─ explore.component.html
            │  └─ explore.component.css
            ├─ notifications/
            │  ├─ notifications.component.ts
            │  ├─ notifications.component.html
            │  ├─ notifications.component.css
            │  └─ notifications.component.spec.ts
            └─ events-dashboard/
               ├─ events-dashboard.component.ts
               ├─ events-dashboard.component.html
               ├─ events-dashboard.component.css
               └─ events-dashboard.routes.ts
```

## 3) Application Architecture

- Bootstrapping: `bootstrapApplication(AppComponent, appConfig)` with providers in `app.config.ts`.
- Routing: Root routes in `app.routes.ts`. Feature routes in `pages/**/..routes.ts` using lazy component/module loading.
- Core layer:
  - `ApiService` abstracts HTTP calls and error mapping.
  - `AuthService` handles login/register/Google, JWT decoding, and redirect URL.
  - `UsersService` exposes `currentUser$` via `BehaviorSubject` based on decoded JWT.
  - `EventsService` provides event endpoints plus request shaping (FormData, query params).
  - `GeolocationService` resolves user location (browser geolocation → IP fallback → default).
  - `ThemeService` toggles light/dark with `Renderer2` and CSS variables.
  - `auth.interceptor` attaches `Authorization` header if token exists.
  - `auth.guard` protects routes requiring authentication.
- UI: Tailwind utility-first styling with custom CSS variables for theming.
- Maps: Google Maps JS API loaded via `@googlemaps/js-api-loader` and `importLibrary` (maps, marker, geocoding).

## 4) Coding Standards

- Language: All code and comments must be in English.
- Naming:
  - Files: `kebab-case` (e.g., `add-event.component.ts`).
  - Classes/Interfaces/Types: `PascalCase`.
  - Variables/Functions/Properties: `camelCase`.
  - Avoid non-English names in code, identifiers, and commit messages.
- Types and null-safety:
  - Prefer explicit types. Avoid `any`.
  - Do not use non-null assertions (`!`) unless absolutely safe and justified.
  - Define interfaces for complex objects (e.g., map locations) instead of using `any`.
- HTTP & Async:
  - Use `ApiService` for HTTP calls. It currently returns `Promise` via `lastValueFrom`. Follow this pattern for consistency. For long-lived streams or combined flows, use RxJS `Observable` in feature code and convert where needed.
  - Centralize error handling; surface user-friendly messages via `ngx-toastr`.
- DOM access:
  - Avoid direct `document`/`window`/`localStorage` access in components/guards. Prefer Angular abstractions (`Renderer2`, dependency-injected wrappers) and platform-safe checks when SSR is enabled.
- Logging:
  - Do not leave `console.*` in production code. Use targeted logs during development and remove them before merging.
- Styling:
  - Use Tailwind utilities; limit custom CSS to theme variables and component-specific rules.
  - Avoid `* { transition: all ... }` as a global rule; restrict transitions to relevant properties.
- Routing:
  - Use lazy loading for feature pages/components.
  - Guards should only perform auth checks and redirections; avoid UI manipulation in guards.
- Testing:
  - Add unit tests for guards, interceptors, and services. Mock HTTP and browser APIs (geolocation, Google Maps) in tests.
- Commits:
  - Use clear, English commit messages describing intent (e.g., `feat: add events filter by category`).

## 5) Implementation Guidelines

- Adding a new page:
  1) Create a standalone component under `src/app/pages/<feature>/<feature>.component.*`.
  2) Expose routes via `<feature>.routes.ts` (or add to the appropriate parent `*.routes.ts`).
  3) Lazy-load the route in the parent router config.
  4) Wire required services via DI; avoid direct DOM access.

- Adding a new service:
  1) Create it under `core/services/` with `@Injectable({ providedIn: 'root' })`.
  2) Add methods calling `ApiService.request` and map inputs/outputs via DTOs/interfaces in `core/interfaces/`.
  3) Handle errors gracefully and return typed results.

- HTTP endpoints:
  - Build query strings using helper methods (prefer `HttpParams` when working directly with `HttpClient`).
  - For file uploads, wrap payloads in `FormData` as in `EventsService`.

- Authentication:
  - Read tokens through `AuthService`. Do not duplicate token storage logic.
  - If adding 401/403 handling, prefer a centralized approach in the interceptor.

- UI Modals and state:
  - Prefer Angular state (Signals/Subjects) to control dialogs. Avoid `document.getElementById` in new code.

- Maps:
  - Load libraries with `importLibrary` and handle loading errors.
  - Keep map interactions encapsulated in dedicated components when possible.

- Environments and secrets:
  - Keep environment values under `src/enviroments/`. Add `environment.prod.ts` and use Angular `fileReplacements` for builds.
  - API keys must be restricted at the provider level (domain, usage, quotas). Do not rely on frontend secrecy.

## 6) Documentation Policy (Mandatory)

Whenever any change affects behavior, public APIs, environment variables, routing, folder structure, build scripts, or architecture decisions, you must update documentation:

- Update `README.md` with user-facing instructions (setup, run, build, deploy).
- Update `AGENTS.md` with developer-facing rules (structure, standards, guidelines).
- Keep both documents consistent. If any section becomes outdated, the PR is not complete.

Add to every pull request:

- A note listing what documentation sections were updated.
- If no docs changes are required, explicitly state why.

## 7) PR Checklist (Copy into your PR template)

- [ ] Code is written in English (identifiers and comments).
- [ ] Follows naming and layering conventions.
- [ ] No direct DOM access (or justified with SSR-safe guards).
- [ ] No stray console logs; user-facing errors handled.
- [ ] Types/interfaces defined; no `any` or non-null assertions without justification.
- [ ] Tests added/updated when applicable.
- [ ] README updated where user-facing behavior changed.
- [ ] AGENTS updated where architecture/rules/structure changed.

## 8) Definition of Done

A change is considered complete when:

- Functionality works and is covered by unit tests where appropriate.
- Code adheres to this guide and passes lint/format checks.
- README and AGENTS are updated and consistent.
- The reviewer can understand the change without additional context.
