/**
 * After `next build` with `output: "standalone"`, copy static assets into the traced bundle.
 * Run from repo root: `node scripts/prepare-standalone.cjs`
 *
 * @see https://nextjs.org/docs/app/api-reference/next-config-js/output
 */
const fs = require("fs");
const path = require("path");

function copyDir(src, dest) {
  if (!fs.existsSync(src)) return false;
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.cpSync(src, dest, { recursive: true });
  return true;
}

/** Next standalone `cwd` is this folder; it only auto-loads `.env*` from here, not from `apps/<app>/`. */
function copyEnvProduction(appDir, standaloneApp, appRelative) {
  const src = path.join(appDir, ".env.production");
  const dest = path.join(standaloneApp, ".env.production");
  if (!fs.existsSync(src)) {
    console.warn(
      `[prepare-standalone] ${appRelative}: no ${path.join("apps", appRelative, ".env.production")} — set secrets in that file (or PM2 env) before production.`,
    );
    return;
  }
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(src, dest);
  console.log(`[prepare-standalone] ${appRelative}: copied .env.production → standalone (for MONGODB_URI etc.)`);
}

function prepareApp(appRelative) {
  const root = path.join(__dirname, "..");
  const appDir = path.join(root, "apps", appRelative);
  const nextDir = path.join(appDir, ".next");
  const standaloneApp = path.join(nextDir, "standalone", "apps", appRelative);

  if (!fs.existsSync(path.join(standaloneApp, "server.js"))) {
    console.warn(
      `[prepare-standalone] Skip ${appRelative}: no ${path.join(".next", "standalone", "apps", appRelative, "server.js")} — run next build first.`,
    );
    return;
  }

  const staticSrc = path.join(nextDir, "static");
  const staticDest = path.join(standaloneApp, ".next", "static");
  if (copyDir(staticSrc, staticDest)) {
    console.log(`[prepare-standalone] ${appRelative}: copied .next/static → standalone`);
  }

  const publicSrc = path.join(appDir, "public");
  const publicDest = path.join(standaloneApp, "public");
  if (copyDir(publicSrc, publicDest)) {
    console.log(`[prepare-standalone] ${appRelative}: copied public → standalone`);
  }

  copyEnvProduction(appDir, standaloneApp, appRelative);
}

prepareApp("dashboard");
prepareApp("web");
