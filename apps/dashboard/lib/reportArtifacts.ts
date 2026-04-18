import { Campaign } from "@helloadd/database";

export type CampaignRow = {
  name: string;
  platform: string;
  status: string;
  budgetSpent: number;
  impressions: number;
  clicks: number;
  startDate: string;
  endDate: string;
};

function iso(d: Date) {
  return d.toISOString().slice(0, 10);
}

export async function loadCampaignRowsForReport(
  organizationId: string,
  dateFrom?: Date | null,
  dateTo?: Date | null
) {
  const q: Record<string, unknown> = { organizationId };
  if (dateFrom && dateTo) {
    q.$and = [
      { startDate: { $lte: dateTo } },
      { $or: [{ endDate: null }, { endDate: { $gte: dateFrom } }] },
    ];
  }

  const rows = await Campaign.find(q).sort({ updatedAt: -1 }).limit(500).lean();

  return rows.map((c): CampaignRow => ({
    name: c.name,
    platform: c.platform,
    status: c.status,
    budgetSpent: c.budgetSpent,
    impressions: c.impressions,
    clicks: c.clicks,
    startDate: c.startDate instanceof Date ? iso(c.startDate) : iso(new Date(String(c.startDate))),
    endDate:
      c.endDate == null
        ? ""
        : c.endDate instanceof Date
          ? iso(c.endDate)
          : iso(new Date(String(c.endDate))),
  }));
}

function csvEscape(s: string) {
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function campaignsToCsv(rows: CampaignRow[]) {
  const header = [
    "Name",
    "Platform",
    "Status",
    "Budget spent",
    "Impressions",
    "Clicks",
    "Start",
    "End",
  ];
  const lines = [
    header.join(","),
    ...rows.map((r) =>
      [
        csvEscape(r.name),
        csvEscape(r.platform),
        csvEscape(r.status),
        String(r.budgetSpent),
        String(r.impressions),
        String(r.clicks),
        csvEscape(r.startDate),
        csvEscape(r.endDate),
      ].join(",")
    ),
  ];
  return lines.join("\n");
}
