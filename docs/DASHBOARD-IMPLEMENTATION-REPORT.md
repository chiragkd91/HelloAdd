# Dashboard implementation report (Hello Add)

This document summarizes work done on the **dashboard** app (`apps/dashboard`) and related **API** / **database** packages: moving from mock-heavy UI to **MongoDB-backed** flows, **global top-bar** search and filters, **persisted reports** with downloads, and **campaign detail** management.

**Last updated:** 2026-04-12 (mock removal, Zustand cleanup, checklist refresh)

**Feature-level write-up (campaigns UX, CEO PDF, team invites):** see [`FEATURE-IMPLEMENTATION-DOCUMENT.md`](./FEATURE-IMPLEMENTATION-DOCUMENT.md).

---

## 1. Executive summary

- Real **auth**, **campaigns**, **budget**, **analytics**, **alerts**, **reports**, and **integration/sync stubs** wired to Next.js route handlers and `@helloadd/database`.
- **Global filters** (date range + platform) via React context, persisted in `sessionStorage`, consumed by overview charts, analytics, campaigns list, campaign table, and reports preview.
- **Top bar search** calls `GET /api/campaigns?search=…` with debounced queries and links to campaign detail and the campaigns list (`?q=`).
- **Reports**: `POST /api/reports/generate` **persists** a `Report` document; **list** and **download** (CSV + PDF) endpoints serve exports built from campaign data.
- **Campaign detail** page: live fetch/update, pause/resume, KPIs, error handling.
- Monorepo **`npm run build`** (Turbo: `web` + `dashboard`) completes successfully.

---

## 2. Infrastructure

| Item | Notes |
|------|--------|
| Dependencies | e.g. `bcryptjs`, `zod`, `pdf-lib` (dashboard, PDF exports). |
| API layer | JSON helpers, `requireUserAndOrg` guards, shared HTTP patterns. |
| MongoDB | Default URI; seed via `npm run db:seed` from `@helloadd/database`. |
| UI | Centralized button variants (`buttonStyles`) to avoid runtime undefined styles. |

---

## 3. API surface (dashboard `app/api`)

| Route | Purpose |
|-------|---------|
| Auth (`/api/auth/*`) | Login, register, logout, session/me. |
| `/api/campaigns` | List with `status`, `platform`, `limit`, `skip`, **`search`** (case-insensitive name regex). |
| `/api/campaigns/[id]` | Get/update single campaign. |
| `/api/budget` | Budget data for UI. |
| `/api/analytics` | Aggregates; `days` (capped), optional `platform`. |
| `/api/alerts` | Alerts + unread count for badges. |
| `/api/integrations/*` | OAuth/connect **stubs** (Meta, Google, LinkedIn-style). |
| `/api/sync` | Sync stub/partial implementation as wired. |
| `/api/reports/generate` | **POST** — creates `Report` row (`READY`). |
| `/api/reports` | **GET** — recent reports for org. |
| `/api/reports/[id]/download` | **GET** — `format=pdf` or CSV (`excel`/`xlsx` map to CSV). |
| `/api/organization` | **GET/PATCH** — org settings (alerts email, WhatsApp number, etc.). |
| `/api/organization/members` | **GET** — workspace members (`OrganizationMember` + `User`). |
| `/api/auth/forgot-password` | **POST** — generic success (opaque); real email TBD when Resend (or similar) is wired. |

---

## 4. Database (`packages/database`)

- Core models: User, Session, Organization, Campaign, CampaignMetric, Budget, Alert, Integration, etc.
- **`Report`** (collection `reports`): `reportType`, `status` (`QUEUED` / `READY` / `FAILED`), optional `dateFrom` / `dateTo`, `organizationId`, timestamps.

---

## 5. Dashboard UI by feature

### 5.1 Layout and global shell

- **`DashboardFiltersContext`**: `rangeDays` (7 / 14 / 30 / 60 / 90), `platform` (empty = all), persisted in **`sessionStorage`**.
- **`DashboardShell`**: Wraps content with `DashboardFiltersProvider`.
- **`TopBar`**: Breadcrumbs; **Range** + **Platform** bound to context; **`GlobalSearch`**; bell links to **`/errors`** with **unread alert** count.

### 5.2 Global search

- **`GlobalSearch`**: Debounced query (≥2 chars) → `GET /api/campaigns?search=…&limit=12`; dropdown links; “Open Campaigns with this search” → `/campaigns?q=…`.

### 5.3 Overview (`/`)

- **`KPIGrid`**: Live **`GET /api/analytics`** (org-scoped summary).
- **`SpendChart`**: Live **`useAnalytics`** from global filters.
- **`CTRChart`**: CTR from **`dailySeries`** (blended CTR by day).
- **`RegionPerformance`**: **`regionBreakdown`** from analytics.
- **`EngagementDonut`**: **Click mix by platform** from **`byPlatform`** (not generic “engagement types”).

### 5.4 Campaigns

- **List** (`/campaigns`): `useCampaigns` with header **platform**; local search, status, product; **range** select synced with global filters; **`Suspense`** + **`useSearchParams`** for `q`.
- **Detail** (`/campaigns/[id]`): **`useCampaign`** — GET/PUT; pause/resume; KPI grid; budget bar; optional error banner from query (`Suspense`).

### 5.5 Analytics (`/analytics`)

- Primary **range** and **platform** from **top bar**; optional **CTR-only** multi-select for the CTR bar chart.

### 5.6 Budget, errors, integrations

- Wired per earlier steps; sidebar/issue badges where implemented.

### 5.7 Reports (`/reports`)

- **`lib/reports.ts`**: UI labels → API `reportType`; date presets → `dateFrom` / `dateTo` / `analyticsDays`.
- **`useReportGenerate`**, **`useReportsList`**, **`downloadReport`** (`lib/downloadReport.ts`).
- Generate & save; preview chart uses **live analytics** + header **platform**; **Export PDF** / **Export Excel (CSV)**; WhatsApp / mailto; **Recent reports** with per-row PDF/CSV download.
- **`lib/reportArtifacts.ts`**: Campaign rows for date window; CSV; PDF via **pdf-lib**.

### 5.8 Overview campaign table component

- **`CampaignTable`**: `useCampaigns` with global **platform**; status/product filters; header-driven platform label (no duplicate platform dropdown).

---

## 6. Key file locations

| Area | Paths (under `apps/dashboard` unless noted) |
|------|-----------------------------------------------|
| Filters | `components/layout/DashboardFiltersContext.tsx`, `DashboardShell.tsx` |
| Top bar | `components/layout/TopBar.tsx`, `GlobalSearch.tsx` |
| Reports UI | `app/(dashboard)/reports/page.tsx` |
| Reports API | `app/api/reports/generate/route.ts`, `app/api/reports/route.ts`, `app/api/reports/[id]/download/route.ts` |
| Report helpers | `lib/reports.ts`, `lib/reportArtifacts.ts`, `lib/downloadReport.ts` |
| Hooks | `hooks/useCampaigns.ts`, `useAnalytics.ts`, `useReportGenerate.ts`, `useReportsList.ts`, `useCampaign.ts`, `useDebouncedValue.ts` |
| Loading UI | `components/ui/DataSkeletons.tsx` (shared chart/table/KPI placeholders) |
| Campaigns API | `app/api/campaigns/route.ts` (includes `search`) |
| DB model | `packages/database/src/models/Report.ts` |

---

## 7. Build and operations

- From repo root **`helloadd`**: `npm run build` runs Turbo **`build`** for **`web`** and **`dashboard`**.
- **Mongoose** may log **duplicate index** warnings (`token`, `slug`) during dashboard build — non-fatal; schemas can be deduped later.

---

## 8. Known limitations and follow-ups

| Topic | Note |
|-------|------|
| PDF | Structured campaign export, not a full marketing PDF template. |
| Excel | Delivered as **CSV** (opens in Excel); true **XLSX** would need an extra library. |
| Report jobs | Generation is synchronous persistence; heavy workloads could move to a **queue** later. |
| Dedup | Repeated “export” clicks may create multiple **Report** rows unless UX merges or backend dedupes. |
| Toasts | **`react-hot-toast`** used in several flows (e.g. campaigns, settings); not every edge case may use it. |

---

## 9. How to verify locally

1. Configure **MongoDB** and env (see `.env.example` in the repo).
2. `npm run db:seed` from **`helloadd`** (or database package) if collections are empty.
3. `npm run dev` (Turbo) or run **`dashboard`** on its port (e.g. 3001).
4. Sign in, exercise **top bar** filters and **search**, open **campaigns** / **analytics** / **reports**, generate a report and **download** PDF/CSV.

---

## 10. Master prompt checklist (`hello-add-master-prompt.md`)

Cross-check of the **master prompt** against the current repo (`helloadd/`). Status meanings:

| Status | Meaning |
|--------|---------|
| **Done** | Implemented and wired to APIs/data for normal use |
| **Partial** | Present but mock data, stub, UI-only, or short of full spec |
| **Not started** | Missing or not meaningfully implemented |

### Infrastructure & stack

| Item | Status | Notes |
|------|--------|--------|
| Turborepo monorepo (`apps/web`, `apps/dashboard`, `packages/database`) | **Done** | Matches intended layout |
| MongoDB + Mongoose (`MONGODB_URI`, `connectMongo`, CUID ids) | **Done** | Per Part 2 |
| PostgreSQL (mentioned in brief) | **Not started** | Not used in codebase |
| `.env.example` | **Partial** | Present; optional keys (WhatsApp, Resend, Meta/Google OAuth, etc.) used only when configured |
| Root scripts (`db:seed`, etc.) | **Done** | `npm run db:seed` from monorepo root |

### Marketing site (`apps/web`)

| Item | Status | Notes |
|------|--------|--------|
| Landing sections (hero, stats, pain/solution, features, integrations, pricing, testimonials, CTA, footer) | **Done** | `app/page.tsx` composes sections |
| Framer Motion on landing | **Partial** | Dependency present; used in multiple `components/landing/*` sections |
| Navbar, blog/case studies routes | **Partial** | Routes exist; depth varies vs spec |

### Auth (`apps/dashboard` + API)

| Item | Status | Notes |
|------|--------|--------|
| Email/password login & register | **Done** | `/api/auth/login`, `register`, `logout`, `me` + pages |
| NextAuth.js (spec) | **Not started** | Custom session cookie + `AuthProvider` instead |
| Google OAuth on login | **Not started** | Not in `login-form` |
| Marketing `/login` | **Done** | POSTs to dashboard `/api/auth/login` + redirect (CORS); same pattern as `/register` |
| Forgot password | **Partial** | Marketing form → `/api/auth/forgot-password`; **no outbound reset email** until provider is configured |

### Dashboard — layout & shell

| Item | Status | Notes |
|------|--------|--------|
| Sidebar + mobile drawer | **Done** | Collapse, nav, badges |
| TopBar: breadcrumb, search, range, platform, user menu | **Done** | Range/platform in `DashboardFiltersContext`; search → API |
| TopBar: “custom” date range | **Partial** | Presets 7–90 days; no custom date picker |

### Dashboard — Overview (`/`)

| Item | Status | Notes |
|------|--------|--------|
| KPI row | **Done** | **`KPIGrid`** → **`GET /api/analytics`**; Issues uses live unread count |
| Spend by platform chart | **Done** | `SpendChart` → `useAnalytics` + global filters |
| CTR trend chart | **Done** | `CTRChart` → **`dailySeries`** (blended CTR; respects filters) |
| Region performance (overview) | **Done** | `RegionPerformance` → **`regionBreakdown`** from analytics |
| Engagement donut | **Done** | **Click mix by platform** (`byPlatform` clicks); renamed in UI copy |
| Campaign table (overview) | **Partial** | Live `useCampaigns` + filters; **column sort** not implemented |
| AI error panel | **Partial** | `ErrorPanel` wired; “fix” actions vs full spec TBD |

### Dashboard — feature pages

| Page | Status | Notes |
|------|--------|--------|
| **Campaigns** list | **Partial** | Live data, filters, pagination; **sortable columns** not implemented; bulk pause / export CSV **stubs**; new campaign modal **informative stub** |
| **Campaign** detail `[id]` | **Done** | Fetch, update, pause/resume, KPIs |
| **Budget** | **Done** | `useBudget` / history; sliders and charts per implementation |
| **Analytics** | **Partial** | Live `useAnalytics`; audience age/device/gender **placeholder** (stated in UI) |
| **Calendar** | **Done** | Month grid + **`useCampaigns`** chips from **start/end dates**; budget-risk outline heuristic |
| **AI Errors** | **Partial** | `useAlerts`, filters, mark read, **5‑minute auto-refresh**; “fix” may be partial |
| **Reports** | **Done** | Generate + DB row + list + PDF/CSV download + preview chart |
| **Team** | **Partial** | **`GET /api/organization/members`**; **Invite** not implemented |
| **Integrations** | **Partial** | Cards + `GET` integrations; OAuth **connect/callback stubs** |
| **Settings** | **Partial** | Alerts tab persists via **`PATCH /api/organization`**; other tabs may be UI-heavy |
| **Market pulse** | **Partial** | Component + seed-driven trends (see page copy) |

### API routes (dashboard)

| Item | Status | Notes |
|------|--------|--------|
| Auth routes | **Done** | As implemented (custom, not NextAuth) |
| Campaigns CRUD | **Partial** | GET list/search, GET/PATCH/PUT id, **DELETE** id — verify UI uses all |
| Budget, analytics, alerts | **Done** | As wired |
| Integrations OAuth stubs | **Partial** | Routes exist; not full production OAuth |
| Reports generate + list + download | **Done** | Beyond original single `generate` route |
| Sync | **Partial** | Stub/partial |

### Spec “implementation notes” (Part IMPORTANT)

| Item | Status | Notes |
|------|--------|--------|
| Zod on API bodies | **Done** | Used on many routes |
| Recharts vs Chart.js | **N/A** | Spec said Chart.js; project uses **Recharts** |
| Zustand | **Not used** | Removed from dashboard **`package.json`**; state via **context + hooks** |
| Toast notifications | **Done** | **`react-hot-toast`** (e.g. campaigns, settings) |
| Loading skeletons | **Partial** | **`DataSkeletons`** (`ha-skeleton`) on KPI grid, charts, tables, alerts, budget, reports, team; not every minor control |
| Currency ₹ / Indian dates | **Partial** | INR formatting in places; date formats vary |

### Step order (Part 9) — rough mapping

| Step | Status |
|------|--------|
| 1–2 Setup + DB | **Done** |
| 3 Auth + marketing + dashboard layout | **Partial** (marketing login/forgot-password; Google OAuth TBD) |
| 4–8 Overview → Budget | **Partial** (overview charts live; campaigns list polish TBD) |
| 9 Calendar | **Done** |
| 10 Errors | **Partial** |
| 11 Reports | **Done** (extended with storage/downloads) |
| 12 Integrations | **Partial** |
| 13 Settings | **Partial** |
| 14 WhatsApp alerts | **Done** | **`lib/notifications/whatsapp`**, Settings test, **errorDetector** CRITICAL notify, **digest cron** (requires **`WHATSAPP_*`** env) |
| 15 PDF generation | **Partial** | **`pdf-lib`** report PDF + download; “CEO template” branding suite not a separate product |

---

*This file is maintained as a snapshot of implemented behavior; refer to source and OpenAPI-style route files for exact request/response shapes. Section 10 is a best-effort diff vs `hello-add-master-prompt.md` and should be re-scanned after large changes.*
