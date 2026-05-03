# AGENTS — Project Guide for Contributors

This document defines how this Angular project is structured and how agents/contributors should implement changes. It standardizes code style, architecture decisions, and the documentation workflow.

Important: All code (identifiers, comments, commit messages) must be written in English.

## Product priority (supporting role)

During **MOBILE APP FIRST** (see `.codex-orchestration/project-context.md` → **Product priority**), treat this web app as **supporting** the `vente-mobile` Android MVP: keep shared contracts and UX aligned where it matters, prefer small targeted UI changes, and avoid large web-only refactors unless Planner scopes them.

## 1) Tech Stack

- Angular (Standalone Components, Angular Router). Use the latest recommended APIs (signals, control flow, hydration, etc.). **Prefer Cursor MCP `user-angular-cli`** (`list_projects`, `get_best_practices`, `search_documentation`, `find_examples`) for lookups instead of relying on arbitrary web search; use [angular.dev](https://angular.dev) manually only when MCP is insufficient.
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
      │     └─ button-loader/
      │        ├─ button-loader.component.ts
      │        ├─ button-loader.component.html
      │        └─ button-loader.component.css
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
  - `AuthService` handles login/register/Google, Firebase email activation, JWT decoding, and redirect URL.
  - `UsersService` exposes `currentUser$` via `BehaviorSubject` based on decoded JWT.
  - `EventsService` provides event endpoints plus request shaping (FormData, query params).
  - `GeolocationService` resolves user location (browser geolocation → IP fallback → default).
  - `ThemeService` toggles light/dark with `Renderer2` and CSS variables.
  - `auth.interceptor` attaches `Authorization` header if token exists.
  - `auth.guard` protects routes requiring authentication.
- UI: Tailwind utility-first styling with custom CSS variables for theming.
- Maps: Google Maps JS API loaded via `@googlemaps/js-api-loader` and `importLibrary` (maps, marker, geocoding).

## 4) Angular syntax and references

- **Use the latest recommended Angular syntax.** **Documentation lookup**: Prefer **MCP `user-angular-cli`** (`search_documentation`, `find_examples`, `get_best_practices`) first; defer to [angular.dev](https://angular.dev) only when needed. Current API surface (for orientation):
  - **Signals** for reactive state: `signal()`, `computed()`, `effect()` where appropriate; use signals instead of `BehaviorSubject` for new state that does not need to be an Observable stream.
  - **Input/output as functions**: use `input()`, `input.required()`, `output()`, `model()` instead of the `@Input()`, `@Output()`, `ngModel` decorators.
  - **Control flow in templates**: use `@if`, `@for`, `@switch`, `@defer` instead of `*ngIf`, `*ngFor`, `*ngSwitch`, `NgIf`/`NgFor`; see [angular.dev – Control flow](https://angular.dev/guide/control-flow).
  - **Standalone components** by default; avoid NgModules for new features unless required by a library.
  - Prefer `inject()` over constructor injection when there is no need to expose tokens to subclasses.
- Align with style guide, signals, SSR/hydration, and performance using **MCP `user-angular-cli`** first, then [angular.dev](https://angular.dev).

## 5) Coding Standards

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

## 6) Web app robustness and mobile alignment

- **Web app (ventewebf)**: Build a robust, scalable application with good practices:
  - **In-memory state**: Keep frequently used or shared data in services via signals (e.g. explore events, user session) so the UI always has something to show and does not refetch unnecessarily when switching views.
  - **Background loading**: Prefer loading or refreshing data in the background (e.g. services that update a signal when the API responds) while the UI shows existing or placeholder content; avoid blocking the screen on every request.
  - **Placeholders and hydration**: Use placeholders (skeleton UI, minimal static content) where appropriate so that server-rendered or pre-rendered output is useful before client bootstrap. Plan for and apply [Angular hydration](https://angular.dev/guide/ssr/hydration) effectively (preserve server-rendered DOM, avoid layout shift, defer non-critical interactivity with `@defer` where it helps).
  - **Event poster fallback**: backend may return `poster: null`; event cards, map popups, and event detail views must always render a default poster URL when poster is missing or fails to load.
- **Mobile app (vente-mobile)**: Use the web version as **inspiration** for features, UX, and data shape. Reuse or mirror interfaces and service contracts where it makes sense. Improve and adapt layouts and styles for mobile (touch targets, density, navigation); the mobile UI does not need to match the web pixel-for-pixel, but behaviour and data (e.g. event cards, filters, map) should align conceptually.

## 7) Implementation Guidelines

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
  - Email/password registration must not auto-login. It sends Firebase verification email and waits for `/validate-account` before backend login succeeds.
  - If adding 401/403 handling, prefer a centralized approach in the interceptor.

- UI Modals and state:
  - Prefer Angular state (Signals/Subjects) to control dialogs. Avoid `document.getElementById` in new code.

- Maps:
  - Load libraries with `importLibrary` and handle loading errors.
  - Keep map interactions encapsulated in dedicated components when possible.

- Environments and secrets:
  - Keep environment values under `src/enviroments/`. Add `environment.prod.ts` and use Angular `fileReplacements` for builds.
  - API keys must be restricted at the provider level (domain, usage, quotas). Do not rely on frontend secrecy.

## 8) Documentation Policy (Mandatory)

Whenever any change affects behavior, public APIs, environment variables, routing, folder structure, build scripts, or architecture decisions, you must update documentation:

Add to every pull request:

## 9) PR Checklist (Copy into your PR template)

- [ ] Code is written in English (identifiers and comments).
- [ ] Uses current Angular syntax (signals, input()/output(), control flow, standalone); lookups use **MCP `user-angular-cli`** where practical, consistent with AGENTS §4.
- [ ] Follows naming and layering conventions.
- [ ] No direct DOM access (or justified with SSR-safe guards).
- [ ] No stray console logs; user-facing errors handled.
- [ ] Types/interfaces defined; no `any` or non-null assertions without justification.
- [ ] Tests added/updated when applicable.
- [ ] README updated where user-facing behavior changed.
- [ ] AGENTS updated where architecture/rules/structure changed.

## 10) Definition of Done

A change is considered complete when:

- Functionality works and is covered by unit tests where appropriate.
- Code adheres to this guide and passes lint/format checks.
- README and AGENTS are updated and consistent.
- The reviewer can understand the change without additional context.
