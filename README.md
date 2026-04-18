# Hello Add

Unified ad operations for teams running Meta, Google, LinkedIn, YouTube, and more — marketing site, authenticated dashboard, and shared data layer in one monorepo.

## Repository structure

```
helloadd/
├── apps/
│   ├── web/           # Public marketing site (Next.js 14, App Router)
│   └── dashboard/     # Product app: campaigns, agency, integrations, API routes
├── packages/
│   └── database/      # MongoDB + Mongoose models (@helloadd/database)
├── scripts/           # e.g. prepare-standalone.cjs for production bundles
└── package.json       # npm workspaces + Turborepo
```

| Package | Role |
|--------|------|
| **web** | Landing, pricing, features, legal pages; auth entry points that call the dashboard API |
| **dashboard** | Workspace UI, REST API under `/app/api`, sessions, integrations, billing hooks |
| **@helloadd/database** | Shared schemas and `connectMongo` for the dashboard |

## Prerequisites

- **Node.js** 20.x (LTS recommended)
- **npm** 10.x (see `packageManager` in root `package.json`)
- **MongoDB** reachable from the dashboard (Atlas or self-hosted)

## Install

From the repository root:

```bash
npm ci
```

## Development

Run all workspaces in parallel (Turborepo):

```bash
npm run dev
```

Or run a single app:

```bash
npm run dev:web        # marketing site → http://localhost:30002
npm run dev:dashboard  # dashboard app → http://localhost:3001
```

The marketing **register / login / forgot-password** flows call the dashboard origin. Point the web app at your dashboard URL:

- `NEXT_PUBLIC_DASHBOARD_URL` — base URL of the dashboard (no trailing slash), e.g. `http://localhost:3001`

Create `apps/dashboard/.env.local` (and any web env files) from your team’s template; never commit real secrets. Typical dashboard variables include `MONGODB_URI`, session secrets, and OAuth client IDs for ad platforms (Meta, Google, LinkedIn, etc.) when connecting real accounts.

## Build

```bash
npm run build
```

Production-oriented bundle (standalone output + static asset copy):

```bash
npm run build:deploy
```

Each Next.js app uses `output: "standalone"`. After `build:deploy`, run Node from the standalone output (see `scripts/prepare-standalone.cjs` and each app’s `.next/standalone/.../server.js`). Use a process manager (PM2, systemd) and a reverse proxy (nginx, Caddy) with HTTPS in production.

## Useful scripts

| Script | Description |
|--------|-------------|
| `npm run build` | Turbo build for all packages |
| `npm run build:deploy` | Build + prepare standalone folders |
| `npm run lint` | Lint across workspaces |
| `npm run db:seed` | Seed database (see `@helloadd/database`) |
| `npm run db:seed:demo-year` | Seed variant with demo year flag |

## Tech stack

- **Framework:** Next.js 14 (App Router), React 18, TypeScript  
- **Styling:** Tailwind CSS  
- **Data:** MongoDB, Mongoose (`@helloadd/database`)  
- **Auth:** Custom session/cookie model for dashboard API routes (see `requireUserAndOrg` and related guards in `apps/dashboard`)

## Contributing

- Keep API routes consistent with existing patterns: `connectMongo`, org-scoped queries, `jsonOk` / `jsonError`.
- Do not commit `.env`, `.env.local`, or secrets.

## License

Private — All rights reserved.
