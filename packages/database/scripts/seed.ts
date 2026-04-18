import "dotenv/config";
import { createHash } from "node:crypto";
import {
  Alert,
  Budget,
  Campaign,
  CampaignMetric,
  connectMongo,
  HashtagTrend,
  Integration,
  MarketTrend,
  Organization,
  OrganizationInvite,
  OrganizationMember,
  Report,
  User,
} from "../src/index";

/** bcrypt hash for password `password123` (cost 10) — matches dashboard API login. */
const DEMO_PASSWORD_HASH =
  "$2b$10$U7Qwtbtm3eNkCuySRHV7ceK07l9WtYUo2QjVikfxwb32tKKov/n0O";

/** Daily rows per campaign (default ~1 year). Override with SEED_METRICS_DAYS=90 for faster local tests. */
const METRICS_DAYS = Math.min(400, Math.max(30, Number(process.env.SEED_METRICS_DAYS ?? 365)));

/** Set SEED_DEMO_YEAR=1 to wipe demo-org campaign metrics and regenerate ~1 year + refresh rollups + budget history. */
const FULL_YEAR_REFRESH =
  process.env.SEED_DEMO_YEAR === "1" || process.env.SEED_DEMO_YEAR === "true";

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function utcNoon(d: Date): Date {
  const x = new Date(d);
  x.setUTCHours(12, 0, 0, 0);
  return x;
}

async function seedCampaignMetricsYear(orgId: string, days: number, replaceExisting: boolean): Promise<void> {
  const camps = await Campaign.find({ organizationId: orgId }).lean();
  if (camps.length === 0) {
    console.log("No campaigns — skip campaign_metrics seed.");
    return;
  }

  const ids = camps.map((c) => c._id);
  if (replaceExisting) {
    const del = await CampaignMetric.deleteMany({ campaignId: { $in: ids } });
    console.log(`Removed existing campaign_metrics: ${del.deletedCount}`);
  } else {
    const existing = await CampaignMetric.countDocuments({ campaignId: { $in: ids } });
    if (existing > 0) {
      console.log(
        `campaign_metrics already has ${existing} rows — skipping. Set SEED_DEMO_YEAR=1 to wipe and rebuild ${days} days.`,
      );
      return;
    }
  }

  const today = utcNoon(new Date());
  const rows: Array<{
    campaignId: string;
    date: Date;
    impressions: number;
    clicks: number;
    spend: number;
    conversions: number;
    ctr: number;
  }> = [];

  for (const camp of camps) {
    const baseCtr = 0.012 + (hashStr(camp._id) % 120) / 10000;
    const cpcBase = 8 + (hashStr(camp._id) % 80) / 10;

    for (let d = 0; d < days; d++) {
      const date = utcNoon(new Date(today));
      date.setUTCDate(date.getUTCDate() - d);

      const dow = date.getUTCDay();
      const weekend = dow === 0 || dow === 6 ? 0.82 : 1;
      const seasonal = 1 + 0.1 * Math.sin((d / Math.max(1, days - 1)) * Math.PI * 2);
      const noise = 1 + ((hashStr(`${camp._id}-${d}`) % 40) - 20) / 200;

      const impressions = Math.round(
        (1800 + (hashStr(camp._id + String(d)) % 1200)) * seasonal * weekend * noise,
      );
      const clicks = Math.max(
        8,
        Math.round(impressions * (baseCtr + (d % 11) * 0.00025)),
      );
      const spend = Math.round(clicks * cpcBase + impressions * 0.0015);
      const conversions = Math.max(0, Math.floor(clicks * (0.018 + (d % 9) * 0.0015)));
      const ctr = impressions > 0 ? (clicks / impressions) * 100 : 0;

      rows.push({
        campaignId: camp._id,
        date,
        impressions,
        clicks,
        spend,
        conversions,
        ctr: Math.round(ctr * 1000) / 1000,
      });
    }
  }

  const batch = 800;
  for (let i = 0; i < rows.length; i += batch) {
    await CampaignMetric.insertMany(rows.slice(i, i + batch));
  }
  console.log(`Seeded campaign_metrics (${rows.length} daily rows, ${days} days × ${camps.length} campaigns).`);

  for (const camp of camps) {
    const agg = await CampaignMetric.aggregate<{
      impressions: number;
      clicks: number;
      spend: number;
      conversions: number;
    }>([
      { $match: { campaignId: camp._id } },
      {
        $group: {
          _id: null,
          impressions: { $sum: "$impressions" },
          clicks: { $sum: "$clicks" },
          spend: { $sum: "$spend" },
          conversions: { $sum: "$conversions" },
        },
      },
    ]);
    const a = agg[0];
    if (!a) continue;
    const ctr = a.impressions > 0 ? (a.clicks / a.impressions) * 100 : 0;
    const cpc = a.clicks > 0 ? a.spend / a.clicks : 0;
    const budgetTotal = Math.max(camp.budgetTotal, Math.round(a.spend * 1.15));

    await Campaign.updateOne(
      { _id: camp._id },
      {
        $set: {
          budgetTotal,
          budgetSpent: Math.round(a.spend),
          impressions: a.impressions,
          clicks: a.clicks,
          conversions: a.conversions,
          ctr: Math.round(ctr * 100) / 100,
          cpc: Math.round(cpc * 100) / 100,
          lastSyncedAt: new Date(),
        },
      },
    );
  }
  console.log("Updated campaign rollups from daily metrics.");
}

async function seedBudgetHistory12Months(orgId: string): Promise<void> {
  const now = new Date();
  let added = 0;
  for (let m = 0; m < 12; m++) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - m, 15));
    const month = d.getUTCMonth() + 1;
    const year = d.getUTCFullYear();
    const exists = await Budget.findOne({ organizationId: orgId, month, year });
    if (exists) continue;

    const v = 0.88 + (m % 7) * 0.02;
    const totalBudget = Math.round(340000 * v);
    await Budget.create({
      organizationId: orgId,
      month,
      year,
      totalBudget,
      platforms: {
        FACEBOOK: { allocated: Math.round(92000 * v), spent: Math.round(71000 * v) },
        INSTAGRAM: { allocated: Math.round(68000 * v), spent: Math.round(59000 * v) },
        GOOGLE: { allocated: Math.round(115000 * v), spent: Math.round(99000 * v) },
        LINKEDIN: { allocated: Math.round(46000 * v), spent: Math.round(40000 * v) },
        YOUTUBE: { allocated: Math.round(36000 * v), spent: Math.round(13000 * v) },
      },
    });
    added++;
  }
  if (added > 0) {
    console.log(`Seeded budget history (${added} new month rows, last 12 months where missing).`);
  }
}

/**
 * Org “management” records: settings, team roles, reports list, pending invite — all in MongoDB (no app-side mocks).
 */
async function seedOrgWorkspaceRecords(organizationId: string, ownerUserId: string): Promise<void> {
  await Organization.updateOne(
    { _id: organizationId },
    {
      $set: {
        isAgency: true,
        aiHealthScore: 82,
        aiHealthLabel: "HEALTHY",
        "settings.weeklyReportEnabled": true,
        "settings.monthlyReportEnabled": true,
        "settings.reportEmail": "demo@helloadd.com",
        "settings.alertEmail": "alerts@demo.helloadd.com",
        "settings.whatsappNumber": "+919876543210",
      },
    },
  );
  console.log("Updated demo org: settings (report/alert email, WhatsApp), agency + AI health.");

  const teamSeeds: Array<{ email: string; name: string; role: "ADMIN" | "MANAGER" | "VIEWER" }> = [
    { email: "admin@demo.helloadd.com", name: "Demo Admin", role: "ADMIN" },
    { email: "manager@demo.helloadd.com", name: "Demo Manager", role: "MANAGER" },
    { email: "viewer@demo.helloadd.com", name: "Demo Viewer", role: "VIEWER" },
  ];

  for (const t of teamSeeds) {
    let u = await User.findOne({ email: t.email });
    if (!u) {
      u = await User.create({
        name: t.name,
        email: t.email,
        password: DEMO_PASSWORD_HASH,
      });
    } else if (u.password && u.password.startsWith("$2b$") === false) {
      await User.updateOne({ _id: u._id }, { $set: { password: DEMO_PASSWORD_HASH } });
    }
    const om = await OrganizationMember.findOne({ userId: u._id, organizationId });
    if (!om) {
      await OrganizationMember.create({
        userId: u._id,
        organizationId,
        role: t.role,
      });
    }
  }
  console.log("Seeded team members (ADMIN / MANAGER / VIEWER) — password: password123");

  const reportCount = await Report.countDocuments({ organizationId });
  if (reportCount === 0) {
    const now = new Date();
    const weekAgo = new Date(now);
    weekAgo.setUTCDate(weekAgo.getUTCDate() - 7);
    const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    const prevMonthEnd = new Date(monthStart.getTime() - 86400000);
    const prevMonthStart = new Date(Date.UTC(prevMonthEnd.getUTCFullYear(), prevMonthEnd.getUTCMonth(), 1));

    await Report.insertMany([
      {
        organizationId,
        reportType: "WEEKLY_SUMMARY",
        status: "READY",
        dateFrom: weekAgo,
        dateTo: now,
      },
      {
        organizationId,
        reportType: "MONTHLY_OVERVIEW",
        status: "READY",
        dateFrom: prevMonthStart,
        dateTo: prevMonthEnd,
      },
    ]);
    console.log("Seeded reports (2 READY rows for Reports UI).");
  }

  const pendingEmail = "pending@demo.helloadd.com";
  const existingInv = await OrganizationInvite.findOne({ organizationId, email: pendingEmail });
  if (!existingInv) {
    const tokenHash = createHash("sha256").update("helloadd-seed-invite-token-v1").digest("hex");
    await OrganizationInvite.create({
      organizationId,
      email: pendingEmail,
      role: "MANAGER",
      tokenHash,
      invitedByUserId: ownerUserId,
      expiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      acceptedAt: null,
    });
    console.log(`Seeded pending invite (${pendingEmail}) — token is not usable until app issues real link.`);
  }
}

async function main() {
  await connectMongo();

  let user = await User.findOne({ email: "demo@helloadd.com" });
  if (!user) {
    user = await User.create({
      name: "Demo User",
      email: "demo@helloadd.com",
      password: DEMO_PASSWORD_HASH,
    });
  } else if (user.password && user.password.startsWith("$2b$") === false) {
    await User.updateOne({ _id: user._id }, { $set: { password: DEMO_PASSWORD_HASH } });
  }

  let org = await Organization.findOne({ slug: "demo-org" });
  if (!org) {
    org = await Organization.create({
      name: "Demo Organization",
      slug: "demo-org",
      plan: "GROWTH",
      onboardingComplete: true,
    });
  } else {
    await Organization.updateOne({ _id: org._id }, { $set: { onboardingComplete: true } });
  }

  const member = await OrganizationMember.findOne({
    userId: user!._id,
    organizationId: org!._id,
  });
  if (!member) {
    await OrganizationMember.create({
      userId: user!._id,
      organizationId: org!._id,
      role: "OWNER",
    });
  }

  await seedOrgWorkspaceRecords(org!._id, user!._id);

  async function ensureIntegration(platform: "GOOGLE" | "FACEBOOK" | "LINKEDIN" | "YOUTUBE") {
    let row = await Integration.findOne({ organizationId: org!._id, platform });
    if (!row) {
      row = await Integration.create({
        organizationId: org!._id,
        platform,
        accessToken: "seed_stub_token",
        accountId: `seed-${platform.toLowerCase()}`,
        accountName: `Demo ${platform}`,
        isActive: true,
        connectedAt: new Date(),
      });
    }
    return row;
  }

  const yearAgo = new Date();
  yearAgo.setUTCFullYear(yearAgo.getUTCFullYear() - 1);
  const futureEnd = new Date();
  futureEnd.setUTCFullYear(futureEnd.getUTCFullYear() + 1);

  if ((await Campaign.countDocuments({ organizationId: org!._id })) === 0) {
    const intGoogle = await ensureIntegration("GOOGLE");
    const intFb = await ensureIntegration("FACEBOOK");
    const intLi = await ensureIntegration("LINKEDIN");
    const intYt = await ensureIntegration("YOUTUBE");

    await Campaign.insertMany([
      {
        organizationId: org!._id,
        integrationId: intGoogle._id,
        externalId: "ext-google-1",
        name: "Search — Brand",
        platform: "GOOGLE",
        product: "SaaS",
        status: "LIVE",
        startDate: yearAgo,
        endDate: futureEnd,
        budgetTotal: 250000,
        budgetSpent: 0,
        impressions: 0,
        clicks: 0,
        conversions: 0,
        ctr: 0,
        cpc: 0,
        region: "Mumbai",
        utmSource: "google",
        errorType: "NONE",
      },
      {
        organizationId: org!._id,
        integrationId: intFb._id,
        externalId: "ext-fb-1",
        name: "Diwali Push — Meta",
        platform: "FACEBOOK",
        product: "Retail",
        status: "LIVE",
        startDate: yearAgo,
        endDate: futureEnd,
        budgetTotal: 220000,
        budgetSpent: 0,
        impressions: 0,
        clicks: 0,
        conversions: 0,
        ctr: 0,
        cpc: 0,
        region: "Delhi",
        utmSource: "meta",
        errorType: "NONE",
      },
      {
        organizationId: org!._id,
        integrationId: intLi._id,
        externalId: "ext-li-1",
        name: "B2B LinkedIn",
        platform: "LINKEDIN",
        product: "Leads",
        status: "PAUSED",
        startDate: yearAgo,
        endDate: futureEnd,
        budgetTotal: 95000,
        budgetSpent: 0,
        impressions: 0,
        clicks: 0,
        conversions: 0,
        ctr: 0,
        cpc: 0,
        region: "Bangalore",
        utmSource: "linkedin",
        errorType: "NONE",
      },
      {
        organizationId: org!._id,
        integrationId: intYt._id,
        externalId: "ext-yt-1",
        name: "YouTube TrueView",
        platform: "YOUTUBE",
        product: "Video",
        status: "LIVE",
        startDate: yearAgo,
        endDate: futureEnd,
        budgetTotal: 110000,
        budgetSpent: 0,
        impressions: 0,
        clicks: 0,
        conversions: 0,
        ctr: 0,
        cpc: 0,
        region: "Hyderabad",
        utmSource: "youtube",
        errorType: "NONE",
      },
      {
        organizationId: org!._id,
        integrationId: intFb._id,
        externalId: "ext-fb-2",
        name: "Instagram Stories — D2C",
        platform: "INSTAGRAM",
        product: "D2C",
        status: "ENDED",
        startDate: yearAgo,
        endDate: new Date(),
        budgetTotal: 130000,
        budgetSpent: 0,
        impressions: 0,
        clicks: 0,
        conversions: 0,
        ctr: 0,
        cpc: 0,
        region: "Ahmedabad",
        utmSource: "instagram",
        errorType: "NONE",
      },
    ]);
    console.log("Seeded campaigns (5) + integrations for demo org.");
  }

  const demoCampIds = await Campaign.find({ organizationId: org!._id }).distinct("_id");
  const metricCount =
    demoCampIds.length > 0
      ? await CampaignMetric.countDocuments({ campaignId: { $in: demoCampIds } })
      : 0;

  if (FULL_YEAR_REFRESH) {
    await seedCampaignMetricsYear(org!._id, METRICS_DAYS, true);
    await seedBudgetHistory12Months(org!._id);
  } else if (metricCount === 0) {
    await seedCampaignMetricsYear(org!._id, METRICS_DAYS, false);
    await seedBudgetHistory12Months(org!._id);
  } else {
    console.log(
      `Skipping metric seed (${metricCount} rows). Use SEED_DEMO_YEAR=1 to rebuild ${METRICS_DAYS} days of demo data.`,
    );
    await seedBudgetHistory12Months(org!._id);
  }

  if ((await Alert.countDocuments({ organizationId: org!._id })) === 0) {
    const camps = await Campaign.find({ organizationId: org!._id }).lean();
    const pick = (needle: string) =>
      camps.find((c) => c.name.toLowerCase().includes(needle)) ?? camps[0];
    const cid = (c: (typeof camps)[number] | undefined) => c?._id ?? null;

    await Alert.insertMany([
      {
        organizationId: org!._id,
        type: "CAMPAIGN_ERROR",
        title: "Dead campaign still billing",
        message: "No impressions in 72h but spend continues.",
        isRead: false,
        severity: "CRITICAL",
        campaignId: cid(pick("search")),
      },
      {
        organizationId: org!._id,
        type: "CTR_DROP",
        title: "CTR below 1% for 5 days",
        message: "Creative fatigue likely.",
        isRead: false,
        severity: "WARNING",
        campaignId: cid(pick("linkedin")),
      },
      {
        organizationId: org!._id,
        type: "CAMPAIGN_ERROR",
        title: "Audience overlap > 35%",
        message: "Two ad sets target the same custom audience.",
        isRead: false,
        severity: "WARNING",
        campaignId: cid(pick("diwali")),
      },
      {
        organizationId: org!._id,
        type: "BUDGET_WARNING",
        title: "Conversion tracking delay",
        message: "Shopify events arriving 2–4h late — monitoring.",
        isRead: false,
        severity: "INFO",
        campaignId: cid(pick("search")),
      },
      {
        organizationId: org!._id,
        type: "BUDGET_WARNING",
        title: "Budget cap hit early",
        message: "Daily budget exhausted by 2pm; rule adjusted.",
        isRead: true,
        severity: "INFO",
        campaignId: cid(pick("instagram")),
      },
      {
        organizationId: org!._id,
        type: "CAMPAIGN_ERROR",
        title: "Ad set learning limited",
        message: "Budget too low to exit learning — increase or consolidate.",
        isRead: false,
        severity: "WARNING",
        campaignId: cid(pick("youtube")),
      },
    ]);
    console.log("Seeded alerts (6).");
  }

  const demoBudgetMonth = 4;
  const demoBudgetYear = 2026;
  const hasBudget = await Budget.findOne({
    organizationId: org!._id,
    month: demoBudgetMonth,
    year: demoBudgetYear,
  });
  if (!hasBudget) {
    const platforms = {
      FACEBOOK: { allocated: 90000, spent: 72000 },
      INSTAGRAM: { allocated: 70000, spent: 61000 },
      GOOGLE: { allocated: 110000, spent: 98000 },
      LINKEDIN: { allocated: 45000, spent: 41000 },
      YOUTUBE: { allocated: 35000, spent: 12000 },
    };
    await Budget.create({
      organizationId: org!._id,
      month: demoBudgetMonth,
      year: demoBudgetYear,
      totalBudget: 350000,
      platforms,
    });
    console.log(`Seeded budget (${demoBudgetMonth}/${demoBudgetYear}).`);
  }

  if ((await MarketTrend.countDocuments()) === 0) {
    const now = new Date();
    await MarketTrend.insertMany([
      {
        title: "Google AI Max and demand-gen tools",
        summary:
          "Google continues to push AI-assisted campaign setup and Performance Max as a default path for full-funnel goals — worth testing if you still run siloed Search-only accounts.",
        url: "https://blog.google/products/ads/",
        sourceName: "Google Ads",
        platforms: ["GOOGLE", "YOUTUBE"],
        industries: ["SaaS", "E‑commerce"],
        relevanceScore: 88,
        publishedAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
      },
      {
        title: "Short-form video still leads social engagement",
        summary:
          "Across Meta surfaces, short vertical creative continues to outperform static for prospecting in many verticals; refresh hooks every 2–3 weeks to fight fatigue.",
        url: "https://www.facebook.com/business/news",
        sourceName: "Meta Business",
        platforms: ["FACEBOOK", "INSTAGRAM"],
        industries: ["Retail", "D2C"],
        relevanceScore: 85,
        publishedAt: new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000),
      },
      {
        title: "B2B: LinkedIn thought-leadership + lead gen mix",
        summary:
          "Document ads and newsletter-style creative paired with lead forms remain a strong pattern for mid-funnel B2B — test against single-image if CPL is creeping up.",
        url: "https://business.linkedin.com/marketing-solutions/blog",
        sourceName: "LinkedIn Marketing",
        platforms: ["LINKEDIN"],
        industries: ["B2B", "Leads"],
        relevanceScore: 82,
        publishedAt: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000),
      },
      {
        title: "Privacy-first measurement narratives",
        summary:
          "Platforms are emphasizing modeled conversions and first-party data — align tagging (GA4, CAPI/pixel) before scaling spend into new regions.",
        url: "https://transparency.google/",
        sourceName: "Industry note",
        platforms: ["GOOGLE", "FACEBOOK"],
        industries: ["All"],
        relevanceScore: 78,
        publishedAt: new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000),
      },
      {
        title: "Retail: seasonal prep for festival windows",
        summary:
          "India retail cohorts often see CPM lift 3–4 weeks before major festivals — pace budgets and creative swaps early to avoid last-minute auction pressure.",
        url: "https://www.thinkwithgoogle.com/",
        sourceName: "Think with Google",
        platforms: ["GOOGLE", "YOUTUBE", "FACEBOOK"],
        industries: ["Retail"],
        relevanceScore: 80,
        publishedAt: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000),
      },
    ]);
    console.log("Seeded market_trends (5 items).");
  }

  if ((await HashtagTrend.countDocuments()) === 0) {
    await HashtagTrend.insertMany([
      {
        tag: "PerformanceMarketing",
        platforms: ["FACEBOOK", "INSTAGRAM", "GOOGLE"],
        heatScore: 94,
        momentum: "Hot",
        context: "Broad performance and ROAS conversations across paid social and search.",
        category: "Marketing",
        sourceName: "Google Ads",
      },
      {
        tag: "MadeInIndia",
        platforms: ["INSTAGRAM", "FACEBOOK", "LINKEDIN"],
        heatScore: 91,
        momentum: "Hot",
        context: "Brand trust and local manufacturing storylines for D2C and retail.",
        category: "Brand",
        sourceName: "Industry note",
      },
      {
        tag: "FestiveSale",
        platforms: ["FACEBOOK", "INSTAGRAM", "YOUTUBE"],
        heatScore: 89,
        momentum: "Rising",
        context: "Seasonal discount and gifting pushes — watch CPM 3–4 weeks before peak days.",
        category: "Seasonal",
        sourceName: "Think with Google",
      },
      {
        tag: "UGC",
        platforms: ["INSTAGRAM", "FACEBOOK", "YOUTUBE"],
        heatScore: 87,
        momentum: "Rising",
        context: "User-generated creative and creator-led hooks for prospecting.",
        category: "Creative",
        sourceName: "Meta Business",
      },
      {
        tag: "B2BMarketing",
        platforms: ["LINKEDIN", "YOUTUBE"],
        heatScore: 84,
        momentum: "Steady",
        context: "Lead gen, webinars, and thought leadership for mid-funnel B2B.",
        category: "B2B",
        sourceName: "LinkedIn Marketing",
      },
      {
        tag: "ShortFormVideo",
        platforms: ["INSTAGRAM", "YOUTUBE", "FACEBOOK"],
        heatScore: 93,
        momentum: "Hot",
        context: "Reels, Shorts, and vertical ads — refresh hooks every 2–3 weeks.",
        category: "Creative",
        sourceName: "Meta Business",
      },
      {
        tag: "D2CIndia",
        platforms: ["INSTAGRAM", "FACEBOOK"],
        heatScore: 86,
        momentum: "Rising",
        context: "Direct-to-consumer launches and retention campaigns.",
        category: "Retail",
        sourceName: "Meta Business",
      },
      {
        tag: "AIMarketing",
        platforms: ["GOOGLE", "LINKEDIN", "FACEBOOK"],
        heatScore: 90,
        momentum: "Hot",
        context: "AI-assisted copy, creative testing, and campaign automation narratives.",
        category: "Marketing",
        sourceName: "Google Ads",
      },
      {
        tag: "ShopLocal",
        platforms: ["INSTAGRAM", "FACEBOOK"],
        heatScore: 82,
        momentum: "Steady",
        context: "Hyperlocal and neighbourhood commerce angles.",
        category: "Local",
        sourceName: "Think with Google",
      },
      {
        tag: "Sustainability",
        platforms: ["INSTAGRAM", "LINKEDIN"],
        heatScore: 80,
        momentum: "Rising",
        context: "ESG and green packaging messaging for conscious audiences.",
        category: "Brand",
        sourceName: "Industry note",
      },
    ]);
    console.log("Seeded hashtag_trends (10 items).");
  }

  console.log(
    `Seed complete. Demo login: demo@helloadd.com / password123  |  Metrics: ${METRICS_DAYS} day window${FULL_YEAR_REFRESH ? " (full refresh)" : ""}`,
  );
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
