# Feature implementation document (Hello Add)

This document describes **concrete product and engineering work** delivered in the `helloadd` monorepo—focused on **dashboard UX and wiring**, **report PDFs**, and **workspace invitations**. It is written for engineers and stakeholders who need a single place to see **what was built**, **where it lives**, and **how to exercise it**.

**Scope:** `apps/dashboard`, `apps/web` (register flow only where noted), and `packages/database`.

**Last updated:** 2026-04-12

---

## Table of contents

1. [Campaigns list: sorting, bulk actions, export, new campaign](#1-campaigns-list-sorting-bulk-actions-export-new-campaign)
2. [Reports: standard PDF and CEO briefing template](#2-reports-standard-pdf-and-ceo-briefing-template)
3. [Team: invite members (API + UI)](#3-team-invite-members-api--ui)
4. [Database additions](#4-database-additions)
5. [API summary](#5-api-summary)
6. [How to verify locally](#6-how-to-verify-locally)
7. [Known limitations and sensible follow-ups](#7-known-limitations-and-sensible-follow-ups)
8. [Primary file index](#8-primary-file-index)

---

## 1. Campaigns list: sorting, bulk actions, export, new campaign

### Goals

- Make the campaigns table **easier to scan** with **sortable columns**.
- Replace **placeholder** bulk actions and export with **real behavior** using existing APIs.
- Provide a **minimal but real** path to **create a campaign** from the dashboard (not only documentation in a modal).

### What was implemented

**Sorting**

- Client-side sort of the **filtered** campaign list (filters: search, status, product; platform still comes from the global top bar via `useCampaigns`).
- Sort keys: **Campaign**, **Platform**, **Product**, **Dates** (start date), **Spend**, **Impressions**, **CTR**, **Status**.
- Clicking a header toggles **ascending / descending**; first-click defaults favor **A→Z** for text columns and **high→low** for numeric/date columns.
- Pagination applies **after** sort.

**Bulk pause**

- Button label reflects **how many selected rows are LIVE**, e.g. “Pause live in selection (3 / 5 selected)”.
- Disabled when nothing is selected or when **no LIVE** campaigns are in the selection.
- **Confirm** uses the existing **`PUT /api/campaigns/[id]`** handler with body `{ "status": "PAUSED" }` for each **LIVE** selected campaign; other statuses are skipped by design.
- Loading state on the modal; toast on completion; selection cleared; list **refreshed**.

**Export CSV**

- Builds a **CSV in the browser** (UTF-8, RFC-friendly quoting where needed).
- If **any rows are checked**, exports **those rows**; otherwise exports **all rows matching current filters** (the sorted list).
- Triggers a download with a dated filename.

**New campaign**

- Replaces the informational-only modal with a **form** that:
  - Loads ad accounts via **`GET /api/integrations`**.
  - Requires an **integration**, **name**, **external ID** (auto-generated default, editable), optional **product**, **Draft/Live**, **budget**, **start/end dates**.
  - Submits **`POST /api/campaigns`** with **`platform` taken from the selected integration** (must match backend validation).
- If there are **no integrations**, the UI explains that an account must be connected and links to **`/integrations`**.
- On success: toast, list refresh, **navigation to `/campaigns/[id]`** for the new campaign.

### Primary files

- `apps/dashboard/app/(dashboard)/campaigns/page.tsx` — table, sort headers, bulk pause, CSV, new-campaign modal and requests.

### Dependencies

- Existing routes: `GET/POST /api/campaigns`, `PUT /api/campaigns/[id]`, `GET /api/integrations`.
- Types: `ApiCampaign` (`apps/dashboard/types/campaign.ts`), `useCampaigns` hook.

---

## 2. Reports: standard PDF and CEO briefing template

### Goals

- Keep the **existing multi-page operational PDF** as the default.
- Add an **executive-oriented, shorter PDF** (“CEO” / leadership briefing) using the **same underlying report data** (`loadReportData`), with **different layout and emphasis** (fewer pages, larger KPIs, leadership-oriented copy).

### What was implemented

**Template switch**

- `PdfReportTemplate`: `"standard"` | `"ceo"`.
- `generatePDFReport(data, template?)` defaults to **`standard`** so scheduled jobs and email flows keep the full report unless changed explicitly.

**CEO template (brief)**

- Approximately **three pages**: cover (slate band, “Executive briefing”), **large KPI tiles** and **takeaways**, then **platform mix**, **top campaigns by CTR** (trimmed), and **recommended next steps** from existing recommendation strings.
- Filename suffix **`-ceo`** when downloading, e.g. `helloadd-…-ceo.pdf`.

**Download API**

- `GET /api/reports/[id]/download?format=pdf&template=ceo` for the CEO variant; omit `template` or use `standard` for the original layout.

**Client helper**

- `downloadReportFile(reportId, format, { pdfTemplate: "ceo" })` in `apps/dashboard/lib/downloadReport.ts`.

**UI**

- **Reports** page: **CEO PDF** next to **Export PDF**; **CEO** on each row in **Recent reports**.
- Intro copy updated to mention the CEO briefing option.

### Primary files

- `apps/dashboard/lib/reports/pdfGenerator.ts` — `generatePDFReportStandard`, `generatePDFReportCeo`, exported `generatePDFReport` and `PdfReportTemplate`.
- `apps/dashboard/app/api/reports/[id]/download/route.ts` — passes `template` into PDF generation and filename.
- `apps/dashboard/lib/downloadReport.ts` — optional `pdfTemplate` for PDF fetches.
- `apps/dashboard/app/(dashboard)/reports/page.tsx` — buttons for CEO export.

---

## 3. Team: invite members (API + UI)

### Goals

- Allow **owners and admins** to **invite** people by email with a **role** (ADMIN, MANAGER, VIEWER—never OWNER).
- Support **new users** (register with invite) and **existing users** (sign in, then accept).
- Persist **pending invites** in MongoDB with **expiry** and **revocation**.

### Data model

- **`OrganizationInvite`** collection `organization_invites`:
  - `organizationId`, normalized `email`, `role`, **`tokenHash`** (SHA-256 of the secret token—raw token is never stored),
  - `invitedByUserId`, `expiresAt` (**14 days**), `acceptedAt` (null until used), `createdAt`.

Exported from `@helloadd/database` (see [Database additions](#4-database-additions)).

### API behavior

| Method | Path | Purpose |
|--------|------|--------|
| `GET` | `/api/organization/invites` | List **pending** invites for the current org (OWNER + ADMIN). |
| `POST` | `/api/organization/invites` | Body `{ email, role }`. Creates invite, returns **`inviteUrl`** (one-time disclosure of secret in URL). |
| `DELETE` | `/api/organization/invites?id=` | Revoke a pending invite. |
| `GET` | `/api/organization/invites/preview?token=` | **Public** (no auth): validates token, returns safe metadata (org name, role, masked email hint). |
| `POST` | `/api/organization/invites/accept` | **Auth required**; body `{ token }`. Adds `OrganizationMember` if signed-in **email matches** invite; marks invite accepted. |

**Registration with invite**

- `POST /api/auth/register` accepts optional **`inviteToken`** (64-character hex).
- If present and valid: creates **User** + **membership** on the **invited organization** with the invite **role**; **does not** create a new organization.
- If the email already exists, the API returns a clear error directing the user to **sign in** and use the invite link.

### UI / UX

**Team page (`/team`)**

- **Invite member** opens a modal: email + role.
- On success: toast, **copy invite URL to clipboard** when possible, **pending invites** list with **Revoke**.

**Accept flow (`/accept-invite?token=…`)**

- Public route (see middleware).
- Loads **preview**; attempts **auto-accept** when a session exists and the invite is valid.
- If not signed in: links to **Sign in** (with `from` + `invite` query params) and **Create account** (`/register?invite=…`).
- After **login**, success redirect to **`/accept-invite`** uses **`window.location.assign`** for invite URLs so the page **fully reloads** and can accept with the new session cookie.

**Register (dashboard + marketing)**

- Dashboard **`/register?invite=`** and marketing **`/register?invite=`** pass **`inviteToken`** into the register API; **company** and **plan** UI are relaxed when an invite is present.

### Primary files

- `packages/database/src/models/OrganizationInvite.ts`
- `apps/dashboard/lib/organization/inviteToken.ts` — `generateInviteSecret`, `hashInviteToken`
- `apps/dashboard/app/api/organization/invites/route.ts`
- `apps/dashboard/app/api/organization/invites/preview/route.ts`
- `apps/dashboard/app/api/organization/invites/accept/route.ts`
- `apps/dashboard/app/api/auth/register/route.ts` — invite branch
- `apps/dashboard/app/(dashboard)/team/page.tsx`
- `apps/dashboard/app/(auth)/accept-invite/page.tsx`
- `apps/dashboard/middleware.ts` — `PUBLIC_PATHS` includes `/accept-invite`
- `apps/dashboard/app/(auth)/login/login-form.tsx` — register link + full redirect for accept-invite after login
- `apps/dashboard/app/(auth)/register/page.tsx` — invite-aware registration
- `apps/web/app/(auth)/register/page.tsx` — invite-aware registration to dashboard API

### Operational note

- **Email delivery is not implemented** in this iteration: the **invite URL must be shared manually** (the UI copies it to the clipboard when possible). Hooking **Resend** (or similar) is a natural follow-up.

---

## 4. Database additions

| Collection | Model | Notes |
|------------|--------|------|
| `organization_invites` | `OrganizationInvite` | Pending invites; unique `tokenHash`; indexes on org + email. |

Existing unique index on `(userId, organizationId)` on **`organization_members`** continues to prevent duplicate membership.

---

## 5. API summary

### New or materially changed (high level)

- **`GET/POST/DELETE /api/organization/invites`** — invite lifecycle (auth + org; POST/DELETE restricted to OWNER/ADMIN).
- **`GET /api/organization/invites/preview`** — public token validation.
- **`POST /api/organization/invites/accept`** — authenticated accept.
- **`POST /api/auth/register`** — optional **`inviteToken`** branch.
- **`GET /api/reports/[id]/download`** — optional **`template=ceo`** for PDF.

Campaign and integration routes were **already present**; campaigns UI now **calls** them for create, bulk pause, and integrations.

---

## 6. How to verify locally

1. **Environment:** Configure MongoDB and env vars per `helloadd/.env.example`; run **`npm run db:seed`** from the monorepo root if collections are empty.
2. **Build:** From `helloadd/`, run **`npm run build`** (Turbo builds `web` + `dashboard`).
3. **Dev:** Run **`npm run dev`** (or workspace-specific dev scripts) and open the dashboard (e.g. port **3001**).
4. **Campaigns:** Open **`/campaigns`** — sort columns, select LIVE rows, **Pause live in selection**, **Export CSV**, **New Campaign** (requires at least one integration / seeded data).
5. **Reports:** Open **`/reports`** — generate a report, download **PDF**, **CEO PDF**, and confirm filenames and layouts.
6. **Team:** Sign in as an **owner or admin**, open **`/team`**, create an invite, copy the link, open in an incognito window — **register** or **sign in** with the invited email and complete **`/accept-invite`**.

---

## 7. Known limitations and sensible follow-ups

- **Invites:** No transactional email yet; share links manually. **Org switching** for users in multiple workspaces is not implemented—session still resolves a single “current” org via existing session helpers.
- **Campaigns:** Sorting is **client-side** on the fetched page of data (`useCampaigns` limit); server-side sort/pagination would scale better for very large workspaces.
- **Reports:** Repeated “Generate & save” can still create **multiple Report rows** unless UX or backend deduplication is added later.
- **CEO PDF:** Further **brand assets** (logo lockups) and copy tuning are optional polish.

---

## 8. Primary file index

| Area | Path |
|------|------|
| Campaigns UI | `apps/dashboard/app/(dashboard)/campaigns/page.tsx` |
| PDF generation | `apps/dashboard/lib/reports/pdfGenerator.ts` |
| Report download API | `apps/dashboard/app/api/reports/[id]/download/route.ts` |
| Report client download helper | `apps/dashboard/lib/downloadReport.ts` |
| Reports UI | `apps/dashboard/app/(dashboard)/reports/page.tsx` |
| Invite model | `packages/database/src/models/OrganizationInvite.ts` |
| Invite token helpers | `apps/dashboard/lib/organization/inviteToken.ts` |
| Invites API | `apps/dashboard/app/api/organization/invites/route.ts` |
| Invite preview | `apps/dashboard/app/api/organization/invites/preview/route.ts` |
| Invite accept | `apps/dashboard/app/api/organization/invites/accept/route.ts` |
| Register (invite) | `apps/dashboard/app/api/auth/register/route.ts` |
| Team UI | `apps/dashboard/app/(dashboard)/team/page.tsx` |
| Accept invite page | `apps/dashboard/app/(auth)/accept-invite/page.tsx` |
| Middleware | `apps/dashboard/middleware.ts` |
| Dashboard login | `apps/dashboard/app/(auth)/login/login-form.tsx` |
| Dashboard register | `apps/dashboard/app/(auth)/register/page.tsx` |
| Marketing register | `apps/web/app/(auth)/register/page.tsx` |

---

## Related documentation

- **`docs/DASHBOARD-IMPLEMENTATION-REPORT.md`** — Broader dashboard snapshot, API surface, and master-prompt checklist (some rows may predate the features above; use this document for **feature-specific** accuracy).

---

*End of document.*
