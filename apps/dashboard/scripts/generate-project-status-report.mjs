/**
 * Generates Hello-Add-Project-Status-Report.xlsx in helloadd/docs/
 * Run from repo: node apps/dashboard/scripts/generate-project-status-report.mjs
 * (from helloadd root), or: cd apps/dashboard && node scripts/generate-project-status-report.mjs
 */
import { createRequire } from "module";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const require = createRequire(import.meta.url);
const ExcelJS = require("exceljs");

const __dirname = dirname(fileURLToPath(import.meta.url));
const outFile = join(__dirname, "..", "..", "..", "docs", "Hello-Add-Project-Status-Report.xlsx");

/** @type {Array<{ group: string; id: string; name: string; status: 'Done' | 'Partial' | 'Pending'; notes: string }>} */
const ROWS = [
  // Baseline (feature doc)
  {
    group: "Baseline",
    id: "—",
    name: "Campaigns: sort, bulk pause, CSV export, new campaign modal",
    status: "Done",
    notes: "apps/dashboard/app/(dashboard)/campaigns/page.tsx",
  },
  {
    group: "Baseline",
    id: "—",
    name: "Reports: Standard PDF + CEO briefing template + download API",
    status: "Done",
    notes: "pdfGenerator, /api/reports/[id]/download",
  },
  {
    group: "Baseline",
    id: "—",
    name: "Team: invites, accept flow, register with invite",
    status: "Done",
    notes: "OrganizationInvite, /team, /accept-invite",
  },
  {
    group: "Baseline",
    id: "—",
    name: "Auth: login, register, session cookie, /api/auth/me",
    status: "Done",
    notes: "Cookie-based session",
  },

  // Group 1
  {
    group: "1 — Bug fixes",
    id: "1.1",
    name: "Report deduplication (same org/type/range within 5 min)",
    status: "Done",
    notes: "apps/dashboard/app/api/reports/generate/route.ts",
  },
  {
    group: "1 — Bug fixes",
    id: "1.2",
    name: "Invite email via Resend",
    status: "Partial",
    notes: "sendInviteEmail wired; requires RESEND_API_KEY + verified domain in production",
  },
  {
    group: "1 — Bug fixes",
    id: "1.3",
    name: "RBAC guards on write APIs",
    status: "Partial",
    notes: "requireUserOrgRole / requireRole patterns in use; audit all routes vs spec",
  },

  // Group 2
  {
    group: "2 — Platform APIs",
    id: "2.1",
    name: "Meta Ads: real OAuth + Graph sync",
    status: "Partial",
    notes: "OAuth/callback paths exist; completeness depends on META_APP_* env and testing",
  },
  {
    group: "2 — Platform APIs",
    id: "2.2",
    name: "Google Ads: real OAuth + API",
    status: "Partial",
    notes: "Connect/callback; live data requires GOOGLE_* credentials",
  },
  {
    group: "2 — Platform APIs",
    id: "2.3",
    name: "LinkedIn: real OAuth + API",
    status: "Partial",
    notes: "Connect/callback; live data requires LINKEDIN_* credentials",
  },
  {
    group: "2 — Platform APIs",
    id: "2.4",
    name: "Sync engine + cron",
    status: "Partial",
    notes: "Sync routes/cron flags in env; verify production scheduling",
  },

  // Group 3
  {
    group: "3 — AI + alerts",
    id: "3.1",
    name: "AI error detection / campaign analysis",
    status: "Partial",
    notes: "Anthropic integration; tune per product goals",
  },
  {
    group: "3 — AI + alerts",
    id: "3.2",
    name: "WhatsApp Business alerts",
    status: "Partial",
    notes: "Integration + org settings; Cloud API tokens per org",
  },
  {
    group: "3 — AI + alerts",
    id: "3.3",
    name: "Email alerts via Resend",
    status: "Partial",
    notes: "Alert/report email paths; Resend config in env",
  },

  // Group 4
  {
    group: "4 — Reports polish",
    id: "4.1",
    name: "Branded PDF (Hello Add theme)",
    status: "Partial",
    notes: "CEO + standard templates; further white-label optional",
  },
  {
    group: "4 — Reports polish",
    id: "4.2",
    name: "Real Excel (.xlsx) export",
    status: "Partial",
    notes: "exceljs in project; confirm all export entry points use xlsx where spec requires",
  },

  // Group 5
  {
    group: "5 — Mobile",
    id: "5.1",
    name: "Dashboard mobile responsive layout",
    status: "Partial",
    notes: "Ongoing; test key pages on small viewports",
  },

  // Group 6
  {
    group: "6 — Onboarding + billing",
    id: "6.1",
    name: "Onboarding wizard + OAuth next=/onboarding",
    status: "Done",
    notes: "Settings org; trial fields",
  },
  {
    group: "6 — Onboarding + billing",
    id: "6.2",
    name: "Razorpay subscriptions + billing UI",
    status: "Partial",
    notes: "API routes + billing tab; production needs live Razorpay keys + webhooks",
  },

  // Group 7
  {
    group: "7 — Agency",
    id: "7.1",
    name: "Agency multi-client: DB, APIs, overview table, client detail tabs",
    status: "Partial",
    notes: "AgencyClientRelation, PATCH, AM/CM, History/Team/Notes; Leads tab still light",
  },
  {
    group: "7 — Agency",
    id: "7.1",
    name: "Profile: editable contact & brand (PATCH)",
    status: "Done",
    notes: "integrations page auth modals separate item below",
  },
  {
    group: "7 — Agency",
    id: "7.2",
    name: "White-label client portal + signed links + branding settings",
    status: "Partial",
    notes: "/client/[orgId]/*, token cookie; logo URL in settings — file upload optional follow-up",
  },

  // UX (recent)
  {
    group: "UX",
    id: "—",
    name: "Integrations: confirm sign-in modal before OAuth redirect",
    status: "Done",
    notes: "apps/dashboard/app/(dashboard)/integrations/page.tsx",
  },
  {
    group: "UX",
    id: "—",
    name: "Client portal signing: CLIENT_PORTAL_SECRET / NEXTAUTH_SECRET",
    status: "Done",
    notes: "token.ts dev fallback + env docs",
  },
];

function summarize() {
  const by = { Done: 0, Partial: 0, Pending: 0 };
  for (const r of ROWS) {
    by[r.status] = (by[r.status] || 0) + 1;
  }
  return by;
}

async function main() {
  const wb = new ExcelJS.Workbook();
  wb.creator = "Hello Add";
  wb.created = new Date();

  const summary = summarize();
  const ws0 = wb.addWorksheet("Summary", {
    views: [{ state: "frozen", ySplit: 1 }],
  });
  ws0.columns = [
    { width: 22 },
    { width: 12 },
  ];
  ws0.addRow(["Hello Add — project status"]);
  ws0.getRow(1).font = { bold: true, size: 14 };
  ws0.addRow(["Generated (UTC)", new Date().toISOString()]);
  ws0.addRow([]);
  ws0.addRow(["Status", "Count"]);
  ws0.getRow(5).font = { bold: true };
  ws0.addRow(["Done", summary.Done]);
  ws0.addRow(["Partial", summary.Partial]);
  ws0.addRow(["Pending", summary.Pending || 0]);
  ws0.addRow([]);
  ws0.addRow([
    "How to read: Done = shipped in repo; Partial = needs env, QA, or polish; Pending = not started.",
  ]);
  ws0.getRow(10).font = { italic: true, size: 10 };

  const ws = wb.addWorksheet("Detailed status", {
    views: [{ state: "frozen", ySplit: 1 }],
  });
  ws.columns = [
    { header: "Group", key: "group", width: 22 },
    { header: "Task ID", key: "id", width: 10 },
    { header: "Item", key: "name", width: 52 },
    { header: "Status", key: "status", width: 12 },
    { header: "Notes / location", key: "notes", width: 55 },
  ];

  const header = ws.getRow(1);
  header.font = { bold: true, color: { argb: "FFFFFFFF" } };
  header.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF0F766E" },
  };

  for (const r of ROWS) {
    const row = ws.addRow(r);
    const st = r.status;
    let fill = "FFF1F5F9";
    if (st === "Done") fill = "FFDCFCE7";
    if (st === "Partial") fill = "FFFEF9C3";
    if (st === "Pending") fill = "FFFEE2E2";
    row.eachCell((cell) => {
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: fill },
      };
      cell.border = {
        top: { style: "thin", color: { argb: "FFE2E8F0" } },
        left: { style: "thin", color: { argb: "FFE2E8F0" } },
        bottom: { style: "thin", color: { argb: "FFE2E8F0" } },
        right: { style: "thin", color: { argb: "FFE2E8F0" } },
      };
    });
  }

  await wb.xlsx.writeFile(outFile);
  console.log("Wrote:", outFile);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
