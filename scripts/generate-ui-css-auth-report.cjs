const fs = require("fs");
const path = require("path");

const repoRoot = path.resolve(__dirname, "..");
const dashboardRoot = path.join(repoRoot, "apps", "dashboard");
const apiRoot = path.join(dashboardRoot, "app", "api");
const exts = new Set([".ts", ".tsx"]);

function walk(dir, arr = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    if (ent.name === "node_modules" || ent.name === ".next" || ent.name === "dist") continue;
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(p, arr);
    else if (exts.has(path.extname(ent.name))) arr.push(p);
  }
  return arr;
}

function rel(p) {
  return path.relative(repoRoot, p).replace(/\\/g, "/");
}

function countMatches(content, re) {
  const m = content.match(re);
  return m ? m.length : 0;
}

const allTsFiles = walk(dashboardRoot);
const uiFiles = allTsFiles.filter(
  (f) =>
    f.includes(path.sep + "app" + path.sep + "(dashboard)" + path.sep) ||
    f.includes(path.sep + "components" + path.sep),
);

const issues = {
  inlineStyles: [],
  hardcodedHex: [],
  tableUsage: [],
  imgMissingAlt: [],
  lowContrastRisk: [],
  fixedWidth: [],
};

for (const f of uiFiles) {
  const c = fs.readFileSync(f, "utf8");
  const inline = countMatches(c, /style=\{\{/g);
  if (inline) issues.inlineStyles.push({ file: rel(f), count: inline });

  const hex = countMatches(c, /#[0-9a-fA-F]{3,8}/g);
  if (hex) issues.hardcodedHex.push({ file: rel(f), count: hex });

  const table = countMatches(c, /<table\b/g);
  if (table) issues.tableUsage.push({ file: rel(f), count: table });

  const imgs = [...c.matchAll(/<img\b[^>]*>/g)];
  const missingAlt = imgs.filter((x) => !/\balt\s*=/.test(x[0])).length;
  if (missingAlt) issues.imgMissingAlt.push({ file: rel(f), count: missingAlt });

  const contrast = countMatches(c, /text-neutral-400|text-neutral-500|text-gray-400|text-gray-500/g);
  if (contrast) issues.lowContrastRisk.push({ file: rel(f), count: contrast });

  const fixed = countMatches(c, /w-\[[0-9]+px\]|h-\[[0-9]+px\]|max-w-\[[0-9]+px\]/g);
  if (fixed) issues.fixedWidth.push({ file: rel(f), count: fixed });
}

const apiFiles = walk(apiRoot).filter((f) => f.endsWith("route.ts"));
const authGaps = [];
for (const f of apiFiles) {
  const c = fs.readFileSync(f, "utf8");
  const hasHandler = /export\s+async\s+function\s+(GET|POST|PUT|PATCH|DELETE)\b/.test(c);
  if (!hasHandler) continue;
  const hasAuth =
    /requireUserOrgRole|requireUserAndOrg|requireAgencyManager|requireAgencyRole|requireUser\(|requireSession|requireAuth|getClientPortalPayload|resolveRequestUser/i.test(
      c,
    );
  const fileNorm = f.replace(/\\/g, "/");
  const isPublic =
    /\/webhooks\/|\/public\/|\/auth\/(login|register|callback|logout|forgot-password)|\/auth\/google\/(connect|callback)|\/integrations\/(meta|google|linkedin)\/callback|\/organization\/invites\/preview|\/billing\/webhook|\/cron\//i.test(
      fileNorm,
    );
  if (!hasAuth && !isPublic) authGaps.push(rel(f));
}

function top(arr, n = 20) {
  return [...arr].sort((a, b) => b.count - a.count).slice(0, n);
}

const totals = {
  uiFilesScanned: uiFiles.length,
  apiRoutesScanned: apiFiles.length,
  inlineStyles: issues.inlineStyles.reduce((s, x) => s + x.count, 0),
  hardcodedHex: issues.hardcodedHex.reduce((s, x) => s + x.count, 0),
  tableUsage: issues.tableUsage.reduce((s, x) => s + x.count, 0),
  imgMissingAlt: issues.imgMissingAlt.reduce((s, x) => s + x.count, 0),
  lowContrastRisk: issues.lowContrastRisk.reduce((s, x) => s + x.count, 0),
  fixedWidth: issues.fixedWidth.reduce((s, x) => s + x.count, 0),
  authGapRoutes: authGaps.length,
};

const score =
  totals.inlineStyles +
  totals.hardcodedHex +
  totals.imgMissingAlt +
  totals.fixedWidth +
  totals.authGapRoutes * 3;
const status = score > 120 ? "High" : score > 50 ? "Medium" : "Low";

const potentialUiIssueTotal =
  totals.inlineStyles + totals.hardcodedHex + totals.imgMissingAlt + totals.fixedWidth + totals.lowContrastRisk;

const html = `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Cloud UI Audit Report</title>
  <style>
    body { font-family: Inter, Arial, sans-serif; margin: 24px; line-height: 1.45; color: #111827; }
    h1, h2 { margin: 0 0 10px; }
    h1 { font-size: 28px; }
    h2 { font-size: 18px; margin-top: 28px; }
    .muted { color: #6b7280; }
    .pill { display: inline-block; padding: 3px 10px; border-radius: 999px; font-size: 12px; font-weight: 700; }
    .high { background: #fee2e2; color: #991b1b; }
    .med { background: #fef3c7; color: #92400e; }
    .low { background: #dcfce7; color: #166534; }
    table { border-collapse: collapse; width: 100%; margin-top: 8px; }
    th, td { border: 1px solid #e5e7eb; padding: 8px 10px; text-align: left; font-size: 13px; }
    th { background: #f9fafb; }
    code { background: #f3f4f6; padding: 1px 5px; border-radius: 4px; }
    .grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; }
    .card { border: 1px solid #e5e7eb; border-radius: 10px; padding: 12px; background: #fff; }
    .k { font-size: 12px; color: #6b7280; }
    .v { font-size: 22px; font-weight: 700; }
    ul { margin: 8px 0 0 18px; }
  </style>
</head>
<body>
  <h1>Cloud UI + CSS + Business Login Audit</h1>
  <p class="muted">Generated: ${new Date().toISOString()}<br/>Project: helloadd/apps/dashboard</p>
  <p>Overall risk: <span class="pill ${status === "High" ? "high" : status === "Medium" ? "med" : "low"}">${status}</span></p>
  <div class="grid">
    <div class="card"><div class="k">UI files scanned</div><div class="v">${totals.uiFilesScanned}</div></div>
    <div class="card"><div class="k">API routes scanned</div><div class="v">${totals.apiRoutesScanned}</div></div>
    <div class="card"><div class="k">Potential UI/CSS issues</div><div class="v">${potentialUiIssueTotal}</div></div>
    <div class="card"><div class="k">Potential auth gaps</div><div class="v">${totals.authGapRoutes}</div></div>
  </div>

  <h2>Issue Counts</h2>
  <table>
    <tr><th>Category</th><th>Count</th><th>What to fix</th></tr>
    <tr><td>Inline style usage</td><td>${totals.inlineStyles}</td><td>Move repeated style objects into design tokens/classes.</td></tr>
    <tr><td>Hardcoded color literals</td><td>${totals.hardcodedHex}</td><td>Use theme variables to avoid inconsistent UI color behavior.</td></tr>
    <tr><td>Table usage</td><td>${totals.tableUsage}</td><td>Ensure responsive wrappers and header semantics on every table.</td></tr>
    <tr><td>Image tags missing alt</td><td>${totals.imgMissingAlt}</td><td>Add meaningful <code>alt</code> text.</td></tr>
    <tr><td>Low-contrast text class risk</td><td>${totals.lowContrastRisk}</td><td>Review readability against background (WCAG AA).</td></tr>
    <tr><td>Fixed px sizing</td><td>${totals.fixedWidth}</td><td>Prefer fluid or breakpoint-aware sizing.</td></tr>
    <tr><td>Routes without business-login/auth guard</td><td>${totals.authGapRoutes}</td><td>Add role/session guard unless route is intentionally public.</td></tr>
  </table>

  <h2>Top Files: Inline Styles</h2>
  <table>
    <tr><th>File</th><th>Count</th></tr>
    ${top(issues.inlineStyles).map((x) => `<tr><td><code>${x.file}</code></td><td>${x.count}</td></tr>`).join("") || "<tr><td colspan='2'>None</td></tr>"}
  </table>

  <h2>Top Files: Hardcoded Colors</h2>
  <table>
    <tr><th>File</th><th>Count</th></tr>
    ${top(issues.hardcodedHex).map((x) => `<tr><td><code>${x.file}</code></td><td>${x.count}</td></tr>`).join("") || "<tr><td colspan='2'>None</td></tr>"}
  </table>

  <h2>Table Components Found</h2>
  <table>
    <tr><th>File</th><th>Count</th></tr>
    ${top(issues.tableUsage).map((x) => `<tr><td><code>${x.file}</code></td><td>${x.count}</td></tr>`).join("") || "<tr><td colspan='2'>No native tables found</td></tr>"}
  </table>

  <h2>Business Login/Auth Guard Gaps</h2>
  ${authGaps.length ? `<ul>${authGaps.map((f) => `<li><code>${f}</code></li>`).join("")}</ul>` : "<p>No obvious auth guard gaps found by static check.</p>"}

  <h2>Recommended Fix Order</h2>
  <ol>
    <li>Fix auth guard gaps first (security + data exposure).</li>
    <li>Fix contrast and missing alt text (accessibility).</li>
    <li>Replace hardcoded colors and inline styles with theme tokens/components.</li>
    <li>Normalize card/table responsiveness on small screens.</li>
  </ol>
  <p class="muted">Note: This is a static automated audit. Dynamic visual bugs need browser walkthrough testing.</p>
</body>
</html>`;

const outPath = path.resolve(repoRoot, "cloud-ui-css-auth-report.html");
fs.writeFileSync(outPath, html, "utf8");
console.log(
  JSON.stringify(
    {
      outPath,
      totals,
      risk: status,
      sampleAuthGaps: authGaps.slice(0, 20),
    },
    null,
    2,
  ),
);
