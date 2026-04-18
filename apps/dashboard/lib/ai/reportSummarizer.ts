import {
  DEFAULT_CLAUDE_MODEL,
  checkAIRateLimit,
  getAnthropic,
  isAnthropicConfigured,
  logAIUsage,
} from "@/lib/ai/client";
import type { ReportData } from "@/lib/reports/reportData";

export type ReportSummary = {
  executiveSummary: string;
  topInsight: string;
  biggestWin: string;
  biggestConcern: string;
  nextMonthFocus: string;
  aiGeneratedRecommendations: string[];
};

function templateFallback(data: ReportData, clientName: string): ReportSummary {
  const cpa = Math.round(
    data.metrics.totalSpend / Math.max(1, data.metrics.totalConversions),
  );
  return {
    executiveSummary: `${clientName} spent ₹${data.metrics.totalSpend.toLocaleString("en-IN")} this period achieving ${data.metrics.avgCTR.toFixed(2)}% average CTR across ${data.campaigns.length} campaigns. Total ${data.metrics.totalConversions} leads at ~₹${cpa.toLocaleString("en-IN")} cost per lead.`,
    topInsight: "Review platform-wise CTR to identify best performing channels.",
    biggestWin: `Generated ${data.metrics.totalConversions} leads in this window.`,
    biggestConcern: "Monitor campaigns with below-benchmark CTR.",
    nextMonthFocus: "Scale budget on best performing platforms.",
    aiGeneratedRecommendations: [
      "Review CTR by platform",
      "Refresh underperforming creatives",
      "Set budget caps on all campaigns",
    ],
  };
}

export async function generateReportSummary(
  organizationId: string,
  reportData: ReportData,
  clientName: string,
): Promise<ReportSummary> {
  const allowed = await checkAIRateLimit(organizationId);
  const client = getAnthropic();

  if (!allowed || !isAnthropicConfigured() || !client) {
    return templateFallback(reportData, clientName);
  }

  const pb = reportData.platformBreakdown
    .map(
      (p) =>
        `${p.platform}: Spend ₹${p.totalSpend.toLocaleString("en-IN")}, CTR ${p.avgCtr.toFixed(2)}%, Leads ${p.conversions}`,
    )
    .join("\n");

  const dataContext = `
Client: ${clientName}
Period: ${reportData.dateFrom} to ${reportData.dateTo}
Total Spend: ₹${reportData.metrics.totalSpend.toLocaleString("en-IN")}
Total Impressions: ${(reportData.metrics.totalImpressions / 1_000_000).toFixed(2)}M
Average CTR: ${reportData.metrics.avgCTR.toFixed(2)}%
Total Leads: ${reportData.metrics.totalConversions}
CPA: ₹${Math.round(
    reportData.metrics.totalSpend / Math.max(1, reportData.metrics.totalConversions),
  ).toLocaleString("en-IN")}

Platform breakdown:
${pb}
`;

  try {
    const response = await client.messages.create({
      model: DEFAULT_CLAUDE_MODEL,
      max_tokens: 1000,
      system: `You are a senior digital marketing consultant writing report summaries for Indian business clients.
Write in clear, professional English. Be specific with numbers. Respond ONLY in valid JSON.
Tone: Confident, data-driven, actionable. CEO-friendly language.`,
      messages: [
        {
          role: "user",
          content: `Generate a report summary for this campaign data. Return JSON with: executiveSummary (3-4 sentences), topInsight (1 sentence), biggestWin (1 sentence), biggestConcern (1 sentence), nextMonthFocus (1 sentence), aiGeneratedRecommendations (array of 3-5 specific action strings).

${dataContext}`,
        },
      ],
    });

    const u = response.usage;
    await logAIUsage(organizationId, "report_summarizer", u.input_tokens, u.output_tokens);

    const block = response.content[0];
    const text = block.type === "text" ? block.text : "{}";
    const clean = text.replace(/```json|```/g, "").trim();
    return JSON.parse(clean) as ReportSummary;
  } catch (e) {
    console.error("[reportSummarizer] Anthropic failed", e);
    return templateFallback(reportData, clientName);
  }
}
