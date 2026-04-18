import {
  Campaign,
  CampaignMetric,
  connectMongo,
  type CampaignAttrs,
} from "@helloadd/database";
import {
  DEFAULT_CLAUDE_MODEL,
  checkAIRateLimit,
  getAnthropic,
  isAnthropicConfigured,
  logAIUsage,
} from "@/lib/ai/client";

export type BudgetSuggestion = {
  suggestion: string;
  action: string;
  expectedImpact: string;
  priority: "high" | "medium" | "low";
  reason?: string;
  actionKind?: string;
  platform?: string;
  campaignId?: string;
};

function utcDayStart(d: Date = new Date()): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

function money(n: number): string {
  return `₹${n.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
}

async function metricsLast7DaysByCampaign(
  campaignIds: string[],
): Promise<Map<string, { spend: number; impressions: number; clicks: number; conversions: number }>> {
  const map = new Map<
    string,
    { spend: number; impressions: number; clicks: number; conversions: number }
  >();
  if (campaignIds.length === 0) return map;
  const since = utcDayStart(new Date());
  since.setUTCDate(since.getUTCDate() - 7);
  const rows = await CampaignMetric.aggregate<{
    _id: string;
    spend: number;
    impressions: number;
    clicks: number;
    conversions: number;
  }>([
    {
      $match: {
        campaignId: { $in: campaignIds },
        date: { $gte: since },
      },
    },
    {
      $group: {
        _id: "$campaignId",
        spend: { $sum: "$spend" },
        impressions: { $sum: "$impressions" },
        clicks: { $sum: "$clicks" },
        conversions: { $sum: "$conversions" },
      },
    },
  ]);
  for (const r of rows) {
    map.set(r._id, {
      spend: r.spend,
      impressions: r.impressions,
      clicks: r.clicks,
      conversions: r.conversions,
    });
  }
  return map;
}

function normalizePriority(p: string | undefined): BudgetSuggestion["priority"] {
  const x = (p ?? "medium").toLowerCase();
  if (x === "high") return "high";
  if (x === "low") return "low";
  return "medium";
}

function mapAnthropicRow(
  row: Record<string, unknown>,
  fallbackPriority: BudgetSuggestion["priority"],
): BudgetSuggestion | null {
  const suggestion = typeof row.suggestion === "string" ? row.suggestion : null;
  if (!suggestion) return null;
  const reason = typeof row.reason === "string" ? row.reason : "";
  const expectedImpact =
    typeof row.expectedImpact === "string" ? row.expectedImpact : "Review in ad platforms before applying.";
  const actionField = typeof row.action === "string" ? row.action : "SHIFT";
  return {
    suggestion,
    action: reason || `Action: ${actionField}`,
    expectedImpact,
    priority: normalizePriority(typeof row.priority === "string" ? row.priority : undefined),
    reason: reason || undefined,
    actionKind: actionField,
    platform: typeof row.platform === "string" ? row.platform : undefined,
    campaignId: typeof row.campaignId === "string" ? row.campaignId : undefined,
  };
}

export async function getRuleBasedSuggestions(
  organizationId: string,
  campaigns: CampaignAttrs[],
  metrics: Map<string, { spend: number; impressions: number; clicks: number; conversions: number }>,
): Promise<BudgetSuggestion[]> {
  const out: BudgetSuggestion[] = [];
  if (campaigns.length === 0) return out;

  let sumCtr = 0;
  for (const c of campaigns) {
    sumCtr += c.ctr;
  }
  const avgCtr = campaigns.length > 0 ? sumCtr / campaigns.length : 0;

  const byPlatform = new Map<string, { ctr: number; n: number; spend: number }>();
  for (const c of campaigns) {
    const m = metrics.get(c._id);
    const spend = m?.spend ?? c.budgetSpent;
    const cur = byPlatform.get(c.platform) ?? { ctr: 0, n: 0, spend: 0 };
    cur.ctr += c.ctr;
    cur.n += 1;
    cur.spend += spend;
    byPlatform.set(c.platform, cur);
  }

  let bestPlat: string | null = null;
  let bestCtr = -1;
  let worstPlat: string | null = null;
  let worstCtr = 999;
  for (const [plat, v] of byPlatform) {
    const ac = v.n > 0 ? v.ctr / v.n : 0;
    if (ac > bestCtr) {
      bestCtr = ac;
      bestPlat = plat;
    }
    if (ac < worstCtr) {
      worstCtr = ac;
      worstPlat = plat;
    }
  }

  if (bestPlat && worstPlat && bestPlat !== worstPlat && avgCtr > 0 && bestCtr > avgCtr * 2) {
    out.push({
      suggestion: `Shift more budget toward ${bestPlat} — it’s outperforming on CTR.`,
      action: `${bestPlat} average CTR ~${bestCtr.toFixed(2)}% vs portfolio ~${avgCtr.toFixed(2)}%.`,
      expectedImpact: "More conversions at the same blended spend if volume allows.",
      priority: "high",
      actionKind: "SHIFT",
      platform: bestPlat,
    });
  }

  if (worstPlat && avgCtr > 0 && worstCtr < avgCtr * 0.5) {
    out.push({
      suggestion: `Reduce or pause spend on ${worstPlat} until creatives improve.`,
      action: `${worstPlat} CTR is well below your average.`,
      expectedImpact: "Frees budget for better-performing channels.",
      priority: "medium",
      actionKind: "REFRESH_CREATIVE",
      platform: worstPlat,
    });
  }

  for (const c of campaigns) {
    const m = metrics.get(c._id);
    const conv = m?.conversions ?? c.conversions;
    if (conv === 0 && (m?.spend ?? 0) > 0) {
      out.push({
        suggestion: `Review or pause "${c.name}" — no conversions in the last 7 days with spend.`,
        action: `Spend ${money(m?.spend ?? 0)} with zero conversions on ${c.platform}.`,
        expectedImpact: "Stops bleed on ads that aren’t converting.",
        priority: "high",
        actionKind: "PAUSE",
        platform: c.platform,
        campaignId: c._id,
      });
      break;
    }
  }

  return out.slice(0, 5);
}

async function anthropicSuggestions(
  organizationId: string,
  campaignSummary: string,
  clientName?: string,
): Promise<BudgetSuggestion[] | null> {
  const client = getAnthropic();
  if (!client) return null;

  const allowed = await checkAIRateLimit(organizationId);
  if (!allowed) return null;

  const systemPrompt = `You are an expert digital marketing analyst for Indian businesses.
You analyze ad campaign performance data and give specific, actionable budget recommendations.
Always respond in valid JSON array format only. No markdown, no explanation outside JSON.
Context: Hello Add platform — campaigns running on Facebook, Instagram, Google, LinkedIn, YouTube, Twitter.
Currency: Indian Rupees (₹). Be specific with rupee amounts.`;

  const userPrompt = `Analyze these campaigns${clientName ? ` for client: ${clientName}` : ""} and give 3-5 specific budget optimization recommendations.

Campaign data:
${campaignSummary}

Return a JSON array of objects with exactly these fields:
{
  "suggestion": "specific action in Hindi-friendly English",
  "reason": "data-backed reason",
  "expectedImpact": "specific expected result",
  "action": "INCREASE|DECREASE|PAUSE|SHIFT|REFRESH_CREATIVE",
  "platform": "platform name or null",
  "priority": "HIGH|MEDIUM|LOW"
}

Focus on: highest CTR platforms deserve more budget, lowest CTR need creative refresh or pause, budget overspend needs immediate action.`;

  const response = await client.messages.create({
    model: DEFAULT_CLAUDE_MODEL,
    max_tokens: 1000,
    system: systemPrompt,
    messages: [{ role: "user", content: userPrompt }],
  });

  const u = response.usage;
  await logAIUsage(organizationId, "budget_optimizer", u.input_tokens, u.output_tokens);

  const block = response.content[0];
  const text = block.type === "text" ? block.text : "";
  const clean = text.replace(/```json|```/g, "").trim();
  const parsed = JSON.parse(clean) as unknown;
  if (!Array.isArray(parsed)) return null;

  const out: BudgetSuggestion[] = [];
  for (const row of parsed) {
    if (row && typeof row === "object") {
      const m = mapAnthropicRow(row as Record<string, unknown>, "medium");
      if (m) out.push(m);
    }
  }
  return out.length ? out : null;
}

export async function getBudgetSuggestions(
  organizationId: string,
  clientName?: string,
): Promise<BudgetSuggestion[]> {
  await connectMongo();

  const campaigns = (await Campaign.find({
    organizationId,
    status: { $in: ["LIVE", "PAUSED"] },
  })
    .limit(20)
    .lean()) as CampaignAttrs[];

  const metrics = await metricsLast7DaysByCampaign(campaigns.map((c) => c._id));

  if (campaigns.length === 0) return [];

  const lines = campaigns.map((c) => {
    const m = metrics.get(c._id);
    return `${c.name} | Platform: ${c.platform} | Status: ${c.status} | Spend: ${money(m?.spend ?? c.budgetSpent)} | Budget: ${money(c.budgetTotal)} | CTR: ${c.ctr.toFixed(2)}% | Leads: ${c.conversions} | Region: ${c.region ?? "India"}`;
  });
  const campaignSummary = lines.join("\n");

  if (isAnthropicConfigured()) {
    try {
      const ai = await anthropicSuggestions(organizationId, campaignSummary, clientName);
      if (ai?.length) return ai;
    } catch (e) {
      console.error("[budgetOptimizer] Anthropic failed", e);
    }
  }

  const live = campaigns.filter((c) => c.status === "LIVE");
  const pool = live.length ? live : campaigns;
  return getRuleBasedSuggestions(organizationId, pool, metrics);
}
