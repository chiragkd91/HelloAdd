Hello Add — Linux deploy (PM2 + Next.js standalone)
==================================================

Next.js version note
--------------------
`next.config.js` in `apps/web` and `apps/dashboard` detects the installed Next.js major
version at build time. Next 14 uses `experimental.*` tracing keys + webpack externals for
`node-cron` / `exceljs`. Next 15+ uses top-level `outputFileTracingRoot` and
`serverExternalPackages` (no custom webpack block), which avoids Turbopack vs webpack conflicts
on `next build`.

Prefer `npm ci` with a committed `package-lock.json` so servers do not accidentally resolve a
different Next major than your team tested.

Build on your dev machine (or CI), then copy artifacts to the server.

1) On the build machine (repo root: helloadd/)
   npm ci
   npm run build:deploy

   This runs `turbo build` (dashboard, web, @helloadd/database, etc.) and
   `scripts/prepare-standalone.cjs` to copy `.next/static` and `public` into
   each app’s standalone bundle.

2) What to copy to the Linux server
   Option A — full repo (simplest): rsync/scp the whole `helloadd` folder after
   build (excludes node_modules if you reinstall on server — see below).

   Option B — minimal: keep the monorepo layout under e.g. /opt/helloadd and
   include at least:
   - apps/dashboard/.next/standalone/   (entire tree)
   - apps/web/.next/standalone/       (entire tree)
   - packages/database/               (source + package.json; may be required if tracing missed files)
   If something fails at runtime, copy the full repo and run `npm ci --omit=dev`
   under helloadd/ on the server.

3) On Linux (Node 18+)
   cd /opt/helloadd
   npm ci --omit=dev
   export HELLOADD_ROOT=/opt/helloadd
   Set production env: copy apps/dashboard/.env.production or use systemd/PM2 env
   (MONGODB_URI, OAuth keys, NEXT_PUBLIC_* URLs, etc.).

   pm2 start deploy/ecosystem.config.cjs
   pm2 save
   pm2 startup

   Dashboard listens on PORT 3001, web on 30002 (override with DASHBOARD_PORT / WEB_PORT).

4) Reverse proxy
   Point Nginx/Caddy to 127.0.0.1:3001 (dashboard) and :30002 (marketing web),
   or use two subdomains with TLS.
   Example Nginx vhost: deploy/nginx/helloadd.conf.example (edit server_name + SSL).

5) Re-deploy
   Re-run `npm run build:deploy` on the build machine, copy updated files,
   then `pm2 restart all` on the server.
