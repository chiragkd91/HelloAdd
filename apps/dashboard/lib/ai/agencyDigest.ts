import { Campaign, Organization, connectMongo, type CampaignAttrs } from "@helloadd/database";
import {
  DEFAULT_CLAUDE_MODEL,
  checkAIRateLimit,
  getAnthropic,
  isAnthropicConfigured,
  logAIUsage,
} from "@/lib/ai/client";

export async function generateAgencyWeeklyDigest(agencyOrgId: string): Promise<string> {
  await connectMongo();
  const org = await Organization.findById(agencyOrgId).lean();
  if (!org?.isAgency) {
    return "";
  }

  const campaigns = (await Campaign.find({ organizationId: agencyOrgId }).lean()) as CampaignAttrs[];
  const totalSpend = campaigns.reduce((s, c) => s + c.budgetSpent, 0);
  const totalLeads = campaigns.reduce((s, c) => s + c.conversions, 0);
  const live = campaigns.filter((c) => c.status === "LIVE").length;

  const clientSummaries = `Campaigns: ${campaigns.length}, LIVE: ${live}, Total spend (recorded): ₹${totalSpend.toLocaleString("en-IN")}, Leads: ${totalLeads}.`;

  const allowed = await checkAIRateLimit(agencyOrgId);
  const client = getAnthropic();

  if (!allowed || !isAnthropicConfigured() || !client) {
    return `Weekly snapshot for ${org.name}: ${clientSummaries} Review top-performing platforms in Hello Add and pause bleeders.`;
  }

  try {
    const response = await client.messages.create({
      model: DEFAULT_CLAUDE_MODEL,
      max_tokens: 600,
      system:
        "You are a senior account manager summarizing weekly performance for a digital marketing agency. Write in clear bullet points. Be specific.",
      messages: [
        {
          role: "user",
          content: `Write a weekly digest for agency "${org.name}".

Summary:
${clientSummaries}

Total spend managed: ₹${totalSpend.toLocaleString("en-IN")}
Total leads: ${totalLeads}

Write: 1 short overall paragraph, then bullet points for top 3 highlights, then 2-3 action items for the agency team.`,
        },
      ],
    });

    const u = response.usage;
    await logAIUsage(agencyOrgId, "agency_digest", u.input_tokens, u.output_tokens);

    const block = response.content[0];
    return block.type === "text" ? block.text : "";
  } catch (e) {
    console.error("[agencyDigest] failed", e);
    return `Weekly snapshot for ${org.name}: ${clientSummaries}`;
  }
}
