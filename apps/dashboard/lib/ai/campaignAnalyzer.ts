import { Campaign, CampaignMetric, connectMongo, type CampaignAttrs } from "@helloadd/database";
import {
  DEFAULT_CLAUDE_MODEL,
  checkAIRateLimit,
  getAnthropic,
  isAnthropicConfigured,
  logAIUsage,
} from "@/lib/ai/client";

export type CampaignAnalysis = {
  healthScore: number;
  summary: string;
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
  predictedLeadsNextMonth: number;
  predictedLeadsRange: { min: number; max: number };
};

function ruleBasedAnalysis(campaign: CampaignAttrs, metricRows: { date: Date }[]): CampaignAnalysis {
  const score = Math.min(
    100,
    Math.max(
      0,
      (campaign.ctr > 2 ? 30 : campaign.ctr > 1 ? 20 : 10) +
        (campaign.budgetSpent < campaign.budgetTotal ? 25 : 10) +
        (campaign.errorType === "NONE" ? 25 : 5) +
        (campaign.conversions > 10 ? 20 : campaign.conversions > 0 ? 10 : 0),
    ),
  );
  return {
    healthScore: score,
    summary: `${campaign.name} is ${score > 70 ? "performing well" : score > 40 ? "an average performer" : "underperforming"}. CTR ${campaign.ctr.toFixed(2)}%, ${campaign.conversions} leads generated.`,
    strengths: campaign.ctr > 2 ? [`Strong CTR at ${campaign.ctr.toFixed(2)}%`] : [],
    weaknesses: campaign.errorType !== "NONE" ? [`Issue detected: ${campaign.errorType}`] : [],
    recommendations: metricRows.length
      ? ["Monitor daily performance", "Check creative freshness after 2 weeks"]
      : ["Connect daily metrics for tighter forecasting"],
    predictedLeadsNextMonth: Math.round(campaign.conversions * 1.1),
    predictedLeadsRange: {
      min: Math.round(campaign.conversions * 0.9),
      max: Math.round(campaign.conversions * 1.3),
    },
  };
}

export async function analyzeCampaign(campaignId: string, organizationId: string): Promise<CampaignAnalysis> {
  await connectMongo();

  const campaign = (await Campaign.findOne({ _id: campaignId, organizationId }).lean()) as CampaignAttrs | null;
  if (!campaign) {
    throw new Error("Campaign not found");
  }

  const metrics = await CampaignMetric.find({ campaignId })
    .sort({ date: -1 })
    .limit(30)
    .lean();

  const metricsText = metrics
    .slice(0, 7)
    .map((m) => {
      const d = m.date instanceof Date ? m.date : new Date(String(m.date));
      return `${d.toLocaleDateString("en-IN")}: Spend ₹${m.spend}, Clicks ${m.clicks}, CTR ${m.ctr.toFixed(2)}%, Leads ${m.conversions}`;
    })
    .join("\n");

  const allowed = await checkAIRateLimit(organizationId);
  const client = getAnthropic();

  if (!allowed || !isAnthropicConfigured() || !client) {
    return ruleBasedAnalysis(campaign, metrics);
  }

  try {
    const response = await client.messages.create({
      model: DEFAULT_CLAUDE_MODEL,
      max_tokens: 800,
      system:
        "You are a digital marketing expert analyzing Indian ad campaigns. Respond ONLY in valid JSON. No markdown.",
      messages: [
        {
          role: "user",
          content: `Analyze this campaign and return JSON with fields: healthScore (0-100), summary (string), strengths (string[]), weaknesses (string[]), recommendations (string[]), predictedLeadsNextMonth (number), predictedLeadsRange ({min:number,max:number}).

Campaign: ${campaign.name}
Platform: ${campaign.platform}
Status: ${campaign.status}
Total Spend: ₹${campaign.budgetSpent}
Budget: ₹${campaign.budgetTotal}
CTR: ${campaign.ctr.toFixed(2)}%
Total Leads: ${campaign.conversions}
Region: ${campaign.region || "India"}
Error Type: ${campaign.errorType}

Last 7 days daily metrics:
${metricsText || "No daily rows — using aggregate campaign fields only."}`,
        },
      ],
    });

    const u = response.usage;
    await logAIUsage(organizationId, "campaign_analyzer", u.input_tokens, u.output_tokens);

    const block = response.content[0];
    const text = block.type === "text" ? block.text : "{}";
    const clean = text.replace(/```json|```/g, "").trim();
    return JSON.parse(clean) as CampaignAnalysis;
  } catch (e) {
    console.error("[campaignAnalyzer] Anthropic failed", e);
    return ruleBasedAnalysis(campaign, metrics);
  }
}
