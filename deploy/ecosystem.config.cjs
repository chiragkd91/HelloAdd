/**
 * PM2 on Linux: run Next.js standalone servers (dashboard + marketing web).
 *
 * Usage (after build + prepare on the server):
 *   export HELLOADD_ROOT=/opt/helloadd
 *   pm2 start deploy/ecosystem.config.cjs
 *   pm2 save && pm2 startup
 *
 * HELLOADD_ROOT must be the repo root where `apps/dashboard/.next/standalone/...` exists
 * (copy the whole monorepo tree, or at least each app under `apps/` with standalone output).
 */
const path = require("path");

const root = process.env.HELLOADD_ROOT || path.join(__dirname, "..");

module.exports = {
  apps: [
    {
      name: "helloadd-dashboard",
      cwd: path.join(root, "apps/dashboard/.next/standalone/apps/dashboard"),
      script: "server.js",
      instances: 1,
      exec_mode: "fork",
      env: {
        NODE_ENV: "production",
        PORT: process.env.DASHBOARD_PORT || "3001",
      },
    },
    {
      name: "helloadd-web",
      cwd: path.join(root, "apps/web/.next/standalone/apps/web"),
      script: "server.js",
      instances: 1,
      exec_mode: "fork",
      env: {
        NODE_ENV: "production",
        PORT: process.env.WEB_PORT || "30002",
      },
    },
  ],
};
