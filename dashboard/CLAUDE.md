# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project state

This Angular v21 application is the **KIC admin back-office** (dashboard). It is *not* the customer-facing storefront — that is `../KIC-03`, a separate static HTML/Bootstrap site which must be left untouched. This app consumes the Spring Boot API in `../backend` (`/api/**`) and is reserved to accounts with the `ADMIN` role.

It was converted from a storefront scaffold on 2026-07-26: the `home`/`catalog` features, the vitrine `header`/`footer` and the `product-card` shared component were deleted, and the green `gbg-ci` palette was replaced by the KIC cacao design tokens (see **Design tokens** below).

## Commands

- `npm start` / `ng serve` — dev server at **`http://localhost:4501`** (port pinned in `angular.json`; it must match the backend's `app.cors.allowed-origins`, which moved off 4200). Use `localhost`, never `127.0.0.1` — a different origin for CORS.
- `npm run build` / `ng build` — production build into `dist/`
- `npm run watch` — dev-configuration build in watch mode
- `npm test` / `ng test` — unit tests via the Vitest-based Angular unit-test builder
  - single spec: `ng test -- src/app/app.spec.ts` (Vitest CLI args pass after `--`)

There is no configured lint script (no ESLint config present).

**Type-checking:** run `npx tsc --noEmit -p tsconfig.app.json`, never `-p tsconfig.json` — the root config is solution-style (`"files": []`, no `include`), so it compiles **zero files** and always exits 0. The only complete check is `ng build`, which also validates templates.

## Deployment (static hosting)

`ng build --configuration production` produces `dist/e-commerce/browser/` — that folder's **contents** are what gets uploaded (Hostinger subdomain, Apache).

- `public/.htaccess` ships with every build (SPA fallback to `index.html`, immutable cache on hashed assets, `no-cache` on `index.html`). Never place it by hand in the target folder — the next deploy would lose it.
- The `assets` glob in `angular.json` lists **only** `kic-logo.png` and `the-pub.jpg`, the two files the app actually references. `public/images/` also holds product photos, a PDF and two videos that nothing here uses: copying the whole folder meant a 48 MB upload (against 1.1 MB) and made that PDF and those videos publicly downloadable. Add a file to the glob when you reference it, not before.
- The API is on a different origin, so **`app.cors.allowed-origins` must list the dashboard's URL** — without it every call, login included, fails the preflight.

The dashboard talks to the **production** API (`https://api.kic-fr.com/api`) in every configuration, so no local backend is required — and nothing local can be targeted instead. See **Environments** below for what that implies.

## Architecture

- **Rendering**: a plain **client-side SPA**. SSR was removed on 2026-07-29 (`server.ts`, `main.server.ts`, `app.config.server.ts`, `app.routes.server.ts`, the `@angular/ssr` / `platform-server` / `express` dependencies and `provideClientHydration`). It had never rendered anything — every route was already `RenderMode.Client`, and each build reported `Prerendered 0 static routes`. An authenticated back-office has nothing to prerender, and the JWT lives in browser memory. Do not reintroduce it: with `outputMode: "server"` the build emits `index.csr.html` instead of `index.html`, which breaks static hosting.
- **Routing**: `src/app/app.routes.ts` is the top-level table. `/login` is public (`guestGuard`); everything else sits under the `DashboardShell` layout component behind `adminGuard`, with each feature lazy-loaded via `loadChildren`. Routes are **not** prefixed with `/admin` — the app *is* the admin.
- **Components**: standalone, `ChangeDetectionStrategy.OnPush`, signals (`signal`/`computed`/`input`) rather than decorators + zone-based change detection.
- **TypeScript**: strict everywhere (`strict`, `strictTemplates`, `noPropertyAccessFromIndexSignature`, …) — write code compatible with these rather than loosening them.
- **Testing**: `@angular/build:unit-test` on Vitest (jsdom); specs live beside sources as `*.spec.ts`.
- **Environments**: both `src/environments/environment.ts` and `environment.development.ts` carry the **same** `apiUrl: 'https://api.kic-fr.com/api'` — the dashboard targets the production API in every configuration, `ng serve` included. `fileReplacements` on the `development` configuration still swaps the files (they differ by the `production` flag), and the dev server must stay on **port 4501**, the only origin in the backend's `app.cors.allowed-origins`.

  ⚠️ **Running locally therefore reads and writes the production database.** Any create/edit/delete from `ng serve` is immediately live for real customers. There is no local API left to make mistakes against.

## Authentication

The API issues a short-lived JWT access token plus a **rotating** refresh token (`POST /api/auth/login` → `AuthResponse`).

- `SessionStore` (`features/auth/application/`) holds the access token and the current user **in memory only** (signals). A page reload loses them by design.
- `RefreshTokenStorage` (`features/auth/infrastructure/`) persists **only** the refresh token in `localStorage`. It rotates on every `/auth/refresh`, so always write the new one back.
- `provideAppInitializer` calls `SessionStore.restore()` before the first navigation: with a stored refresh token it re-opens the session, otherwise the app starts logged out. This is why `adminGuard` can read the session synchronously.
- `authInterceptor` (`core/auth/`) adds the `Bearer` header, and on a `401` triggers a single shared refresh (concurrent 401s reuse the same in-flight call) before replaying the request; a failed refresh clears the session and routes to `/login`. It skips any URL containing `/auth/` to avoid recursion.
- Non-`ADMIN` accounts are rejected at login (`NotAnAdminError`) and their refresh token is revoked immediately.

**Known hardening gap**: the refresh token sits in `localStorage` because the API returns it in the JSON body. Moving it to an `httpOnly` + `SameSite` cookie on the backend would remove that XSS exposure and make `RefreshTokenStorage` unnecessary.

## Feature architecture (hexagonal / ports & adapters)

Each feature under `src/app/features/<name>/`:

- `domain/models/` — plain TypeScript interfaces mirroring the API DTOs. No Angular imports.
- `domain/ports/` — one interface per external dependency, paired with an `InjectionToken` in the same file. Domain and application code depend only on these.
- `application/` — use cases / stores (`@Injectable({ providedIn: 'root' })`) that `inject()` a port token. This is what presentation components call.
- `infrastructure/` — adapters: `HttpClient` implementations hitting `environment.apiUrl`, browser-storage wrappers, …
- `presentation/` — standalone components plus the feature's `<feature>.routes.ts`.

Ports are bound to adapters in **one** place, `src/app/app.config.ts` (`{ provide: X_REPOSITORY, useClass: HttpX }`). Nothing in `domain/`/`application/` may import from `infrastructure/`.

Reference implementations: `features/auth/` (port + adapter + store + storage adapter) and `features/dashboard/` (port + adapter + use case + page).

## Cross-cutting code

- `src/app/core/` — technical plumbing that isn't a feature: `auth/` (`authInterceptor`, `adminGuard`, `guestGuard`), `i18n/` (see **Internationalisation** below), `format/` (`formatMoney` in FCFA, `formatDate`/`formatDateTime`, all locale-aware), and `api/`:
  - **`api.endpoints.ts`** — the single register of every API route, as paths relative to `environment.apiUrl`, annotated with method + required role + whether the back-office uses it. **Never hard-code a URL anywhere else**; add it here first.
  - **`api.service.ts`** — the common HTTP service every `infrastructure/` adapter builds on. It applies the `apiUrl` prefix, strips empty query params (so an unset filter doesn't become `?q=`), exposes `get`/`getPage<T>`/`post`/`put`/`patch`/`delete`, and handles binary downloads (`download`/`save`/`downloadAndSave`) for the PDF invoice and CSV export. Authentication is deliberately *not* here — `authInterceptor` owns it for every request.
  - `page-response.model.ts` (`PageResponse<T>`, `PageQuery`) and `problem-detail.ts` (RFC 9457 helpers `problemMessage`/`fieldErrors`).

  An adapter is therefore three lines per call: `inject(ApiService)`, a path from `API`, a typed generic. See `HttpAuthRepository` / `HttpStatsRepository`.
- `src/app/layout/` — `dashboard-shell/`, the sidebar + content shell wrapping every authenticated route.
- `src/app/shared/` — reusable, business-free UI: `ui/icon/` (inline-SVG icon set), `ui/charts/` (`donut-chart`, `bar-chart` — hand-written SVG, **no charting library**), `ui/skeleton/`, `ui/pagination/` (bound straight to `PageResponse`), `ui/data-table/` (table scaffolding — wrapper, skeleton rows, empty state, pagination — with headers and rows **projected**, since cells are too varied for a column-config DSL), `ui/modal/` (overlay shell; `ui/confirm-dialog/` builds on it), `ui/select/` (styled dropdown with a `ControlValueAccessor` — a native `<select>` renders its list via the OS and cannot be themed), `ui/toast/` (`ToastService` + a `ToastHost` mounted once in `app.html`), `ui/scroll/` (`appAutoHideScroll`), `domain/` (`order-status.ts`, `enums.ts` — API enums with their translation keys, `.status--*` variants and chart colours).

  **Never write a backtick inside an inline `template:`/`styles:` block.** Those blocks are template literals, so a backtick in a CSS or HTML comment (``/* `type=search` … */``) closes the string early and produces a cascade of misleading TS1005/TS2353 errors pointing at the decorator. Backticks are fine in JSDoc and in code *outside* the literal. This has bitten twice — write the term plainly instead.

  Two other traps these components already work around, worth knowing before writing another one: a `<label>` wrapping a custom control **re-dispatches** outside clicks onto the first focusable element inside it (which reopened menus and file pickers — hence `stopPropagation` on overlays and item clicks), and a `<label>` does **not** name a `<button>` for screen readers (hence the explicit `ariaLabel` input on `app-select`).

## Shell layout, scrolling and loading states

- The shell is **exactly one viewport tall and never scrolls** (`:host { height: 100vh; overflow: hidden }`). Only two containers scroll: `.content` and `.sidebar__nav` — which is what keeps the top bar and the profile menu permanently visible. Both carry `min-height: 0`; without it a flex child refuses to shrink below its content height and the whole page scrolls again. Below 1024px this is dropped and normal page scrolling returns.
- Scrollbars are brand-coloured globally in `styles.scss`. Containers with `appAutoHideScroll` additionally fade their thumb out after ~1s of inactivity; the gutter keeps its width, so showing/hiding never shifts content. Pure CSS can't express "idle since N ms", hence the directive.
- Three **independent** skeleton triggers, do not merge them: `DashboardShell.booting` (first load — sidebar badges and identity), `DashboardShell.navigating` (router events — content only, when clicking another menu entry), and each page's own data-loading signal (`DashboardStore.loading`).
- During navigation the `router-outlet` **stays mounted** and is only hidden in CSS (`.content__outlet.is-hidden`). Wrapping it in `@if` would remove it from the DOM and the router could not activate the incoming route.

## Internationalisation

Runtime translation, **no external dependency and no `@angular/localize`** — the language switches instantly (FR/EN toggle in the top bar), without a per-locale build.

- `core/i18n/translations.fr.ts` is the **source of truth**: it defines every key, and `TranslationKey = keyof typeof FR` derives from it. `translations.en.ts` is typed `Record<TranslationKey, string>`, so adding a French key without its English counterpart is a **compile error**. Keys are flat and dotted (`domain.subdomain.element`); parameters are `{braces}`.
- `TranslationService` holds the language as a signal (persisted in `localStorage`, default `fr`, also written to `<html lang>`). Use `t(key, params?)`, plus `money()` / `date()` / `dateTime()`, which format in the active locale (`fr-FR` / `en-GB`).
- In templates use the `t` pipe: `{{ 'nav.products' | t }}`, `{{ 'dashboard.bestSellers.sold' | t: { count: 3 } }}`. **The pipe is deliberately impure** — a pure pipe memoises on its input, so the key being unchanged it would keep returning the previous language's string. Impure, it re-runs each change-detection pass, re-reads the language signal and stays correct.
- Anything computed in TypeScript (chart labels, formatted amounts) must go through `inject(TranslationService)` inside a `computed()` so it re-evaluates on language change — see `DashboardPage`.
- Route titles carry a **key** (`title: 'title.dashboard'`), resolved by `TranslatedTitleStrategy`, which also re-applies the title when the language changes.
- **Not translated, by design**: error messages coming from the API. Spring returns its `ProblemDetail.detail` in French; `problemMessage()` passes it through and only falls back to translated strings (`error.network`, `error.unexpected`) when there's nothing usable. Translating those would mean mapping the backend's `code` values — worth doing if the app ever ships to non-French speakers.

New user-facing string ⇒ add the key to `translations.fr.ts` **first**, then `translations.en.ts` (the compiler will demand it), then reference the key. Never hard-code a label in a template.

## Feedback: toast vs inline message

- **`ToastService.apiError(err)` on every failed *action*** (save, delete, status change, upload, export). It surfaces the backend's `ProblemDetail.detail` — the business message that actually explains the refusal ("Stock insuffisant pour le format « 250 g »", "Le dernier format ne peut pas être supprimé") — and only falls back to a translated string when the response carries none.
- **Inline `message--error` stays for two cases**: a failed *load* (the screen is empty, a transient popup would be missed) and a *form submit* whose `errors[]` maps to specific fields, which must be read next to those fields.
- Successes are toasts only — never an inline banner that shifts the layout.

## Design tokens & assets

`src/styles.scss` is the single source of the design system, **copied faithfully from the customer site** `../KIC-03/css/scmc-design.css` + `css/style.css`:

- Cacao palette as `--scmc-*` custom properties (`--scmc-cocoa: #7b3f20` is the action colour, `--scmc-chocolate-900: #32180f` the heading colour, `--scmc-cream`/`--scmc-sand` the light surfaces).
- Type: **Rajdhani** for headings, **Open Sans** for body — loaded from Google Fonts in `src/index.html`. Scale h1 36 / h2 30 / h3 24 / h4 20 / h5 18 / h6 16 px, body 16px/1.8.
- Radii `12 / 20 / 30px`, warm shadows, and global primitives: `.btn` (`--primary`/`--ghost`/`--danger`/`--sm`), form controls, `.panel`, `table.data`, `.status` (+ `--success`/`--danger`/`--info`/`--neutral`), `.message`, `.eyebrow`.

Keep new screens on these tokens and primitives rather than inventing local colours. When something is missing, check how KIC-03 solves it first — its "Espace client" section (`scmc-design.css` l.792-1025) is the reference for dashboard-shaped UI.

Real product photography is in `public/images/` (served at `/images/...`); the backend's `imageUrl` values (`/images/poudre-cacao-sachet.jpg`, …) resolve against it.

## Roadmap

Follows `backend/API_GUIDE.md` §6. Delivered: design foundations, auth + login, dashboard shell, stats home, **products** (filtered/paginated list, create/edit, image upload, variants), **categories** (CRUD in a modal), **orders** (list filtered by status, detail, status change, tracking note, PDF invoice, CSV export).

**Discount codes**, **delivery zones**, **customers** and the **audit log** (read-only) are done too — `API_GUIDE.md` §6 is fully covered.

**Customers** gained server-side search plus role and activation actions on 2026-07-28. The API enforces four guardrails and refuses each with a **409**: you cannot remove your own admin role, disable your own account, or demote/disable the last enabled admin. Only the first two can be predicted client-side (the row is marked "You" and carries no buttons); the last-admin cases can only come from the server, so its message is what the toast shows. There is still no create or delete — a customer signs themselves up, and an account is disabled rather than erased so its orders stay attached.

**Returns** (`/retours`) landed on 2026-07-28: paginated list filtered by status, and a modal to move a request through `PENDING → APPROVED | REJECTED → COMPLETED`. The storefront was wired to `POST`/`GET /api/returns` on 2026-07-29, so customer requests now land here.

## Search: what the API allows

The **top-bar search** (`features/search/`) is global: the API has no cross-entity endpoint, so `HttpSearchRepository` fans out to the three lists that accept `?q=` — products, orders, customers — and merges them. Each call is individually guarded, because a `forkJoin` dies with its first failure and one broken list would empty the whole panel. It shows the first 4 hits per family plus "+ N more", so the panel never implies exhaustiveness. Customers have no detail page, so a customer hit opens `/clients?q=<email>`; `UserListPage` reads that through `withComponentInputBinding()` and seeds its store in `ngOnInit` (route-bound inputs are not set yet in the constructor).

All list screens use the shared `app-search-field`, but its **reach differs by endpoint** — and the UI must say so:

- **Exhaustive, server-side `?q=`**: products, orders (order number, recipient name or email), customers (email, first or last name).
- **Exhaustive, filtered in memory** (`shared/domain/search.ts`, accent- and case-insensitive): categories, discount codes, delivery zones — correct because the API returns every row.
- **Server-side but narrower than a search**: the audit log. `?actor=` is a partial match on the e-mail and is the *only* text filter — neither the path nor the derived module is filterable. The field is therefore labelled "Actor / Email, even partial" rather than "Search", alongside a method select and a from/to range. Nothing is page-scoped any more, so `common.searchPageScope` is gone.

**The backend no longer limits any of this**, and as of 2026-07-28 the dashboard consumes all of it. Check `API_GUIDE.md` rather than this file before assuming an endpoint is missing.

`GET /api/audit-logs/{id}` is declared in `api.endpoints.ts` but **deliberately unused**: `AuditLogResponse` carries only `id`, `actor`, `method`, `path`, `status`, `timestamp` — all six already on the row, with the raw path and HTTP code on hover. A detail view would repeat the list. Consume it the day the entry carries a payload diff.

Product routes are `/produits` (list) → `/produits/:id` (read-only detail) → `/produits/:id/modifier` (form). `/produits/nouveau` and `:id/modifier` must stay declared **before** `:id`, otherwise they are parsed as identifiers.

Note: `orders/` is the first feature to bind its port at the **route** level (`orders.routes.ts`) rather than in `app.config.ts`, because nothing outside that screen consumes orders. Prefer this for self-contained features; keep `app.config.ts` for ports shared across features (auth, categories, products, media, stats). Its stores are route-provided too, so leaving the screen resets filters and pagination. Sidebar entries are already listed in `DashboardShell`, marked "bientot" until their routes exist — flip `available: true` when a route lands.

Notes on the products feature, which sets the pattern for the rest:

- The API **creates** a product with its variants in one `POST`, but **updates** them separately (`/api/products/{id}/variants`, `/api/variants/{id}`). The form mirrors that: in create mode the variant rows are part of the payload; in edit mode each row saves itself. Don't "simplify" this into one call.
- Deleting the last variant of a product is refused by the API (409) — the remove button is disabled client-side in create mode, and the server error surfaces otherwise.
- Image upload is two-step: `POST /api/admin/uploads/image` returns an **absolute** URL, which is then stored in the product's `imageUrl`. A file uploaded but never attached stays orphaned on disk; that's accepted backend-side.
- `ProductListStore` is provided **on the route**, not in root, so leaving the screen resets filters and pagination.
- Checkbox filters send `true` or nothing — never `false`, which the backend would read as an active filter.
- The `format` filter is an **exact** match on a variant's label: `format=250g` returns nothing where `250 g` returns two products. The API exposes no list of existing formats, hence a free-text field whose placeholder shows the expected shape.
- Price sorting goes through `?sort=priceFrom,asc|desc`, handled server-side (`priceFrom` is computed from the variants, and `ProductService` translates the sort). Sorting the received page would only order 20 products out of the catalogue. The "From" column header cycles ascending → descending → back to `id,desc`.

## Environment note

This project lives under a WAMP (`c:\wamp64\www\`) directory but is a standalone Node/Angular app — it does not run through Apache/PHP/MySQL; use the npm scripts above.
