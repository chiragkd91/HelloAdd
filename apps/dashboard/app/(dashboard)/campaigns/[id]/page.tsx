"use client";

import { CampaignCalendar } from "@/components/dashboard/CampaignCalendar";
import { Button } from "@/components/ui/Button";
import {
  formatImpressions,
  formatInr,
  formatShortDate,
  campaignHasError,
  platformLabel,
  statusLabel,
} from "@/lib/campaignDisplay";
import { useCampaign } from "@/hooks/useCampaign";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useState } from "react";

const AI_ENABLED = process.env.NEXT_PUBLIC_AI_ENABLED !== "false";

type CampaignAnalysis = {
  healthScore: number;
  summary: string;
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
  predictedLeadsNextMonth: number;
  predictedLeadsRange: { min: number; max: number };
};

function DetailInner() {
  const params = useParams();
  const searchParams = useSearchParams();
  const id = typeof params.id === "string" ? params.id : "";
  const fromError = searchParams.get("fromError");

  const { campaign, isLoading, error, notFound, update } = useCampaign(id);
  const [actionError, setActionError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [analysis, setAnalysis] = useState<CampaignAnalysis | null>(null);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  const runCampaignAnalysis = useCallback(async () => {
    if (!id) return;
    setAnalysisLoading(true);
    setAnalysisError(null);
    try {
      const r = await fetch("/api/ai/campaign-analyze", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({ campaignId: id }),
      });
      const j = (await r.json().catch(() => ({}))) as {
        analysis?: CampaignAnalysis;
        error?: string;
      };
      if (!r.ok) {
        setAnalysisError(typeof j.error === "string" ? j.error : "Analysis failed");
        setAnalysis(null);
        return;
      }
      if (j.analysis) setAnalysis(j.analysis);
    } catch {
      setAnalysisError("Network error");
      setAnalysis(null);
    } finally {
      setAnalysisLoading(false);
    }
  }, [id]);

  async function setStatus(next: string) {
    setActionError(null);
    setPending(true);
    try {
      await update({ status: next });
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Update failed");
    } finally {
      setPending(false);
    }
  }

  if (!id) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 px-6 py-8 text-sm text-amber-950">
        Invalid campaign URL.
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 animate-pulse rounded-lg bg-neutral-200" />
        <div className="h-40 animate-pulse rounded-2xl bg-neutral-100" />
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-2xl bg-neutral-100" />
          ))}
        </div>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="rounded-2xl border border-neutral-200 bg-white p-8 text-center shadow-sm">
        <h1 className="text-xl font-bold text-neutral-900">Campaign not found</h1>
        <p className="mt-2 text-sm text-neutral-600">It may have been removed or you don&apos;t have access.</p>
        <Link
          href="/campaigns"
          className="mt-6 inline-flex rounded-xl bg-primary px-4 py-2 text-sm font-bold text-white hover:bg-primary-hover"
        >
          Back to campaigns
        </Link>
      </div>
    );
  }

  if (error || !campaign) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 px-6 py-8 text-sm text-amber-950">
        {error ?? "Could not load campaign."}
      </div>
    );
  }

  const spendPct =
    campaign.budgetTotal > 0 ? Math.min(100, (campaign.budgetSpent / campaign.budgetTotal) * 100) : 0;

  return (
    <div className="min-w-0 space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Link
            href="/campaigns"
            className="text-sm font-medium text-primary hover:underline"
          >
            ← Campaigns
          </Link>
          <h1 className="mt-2 text-[1.75rem] font-bold tracking-tight text-neutral-900">{campaign.name}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span
              className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-bold ${
                campaign.status === "LIVE"
                  ? "bg-primary/15 text-primary"
                  : campaign.status === "PAUSED"
                    ? "bg-amber-100 text-amber-800"
                    : campaign.status === "ENDED"
                      ? "bg-neutral-200 text-neutral-700"
                      : "bg-sky-100 text-sky-900"
              }`}
            >
              {statusLabel(campaign.status)}
            </span>
            <span className="text-sm text-neutral-600">{platformLabel(campaign.platform)}</span>
            {campaign.product && (
              <span className="rounded-lg bg-neutral-100 px-2 py-0.5 text-xs font-medium text-neutral-700">
                {campaign.product}
              </span>
            )}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {campaign.status === "LIVE" && (
            <Button
              type="button"
              variant="secondary"
              disabled={pending}
              onClick={() => void setStatus("PAUSED")}
            >
              Pause
            </Button>
          )}
          {campaign.status === "PAUSED" && (
            <Button type="button" disabled={pending} onClick={() => void setStatus("LIVE")}>
              Resume
            </Button>
          )}
        </div>
      </div>

      {fromError && (
        <p className="rounded-xl border border-sky-200 bg-sky-50 px-4 py-2 text-sm text-sky-900">
          Opened from alert <code className="rounded bg-white px-1">{fromError}</code> — review metrics below.
        </p>
      )}

      {actionError && (
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-900">{actionError}</p>
      )}

      {campaignHasError(campaign) && (
        <div className="rounded-2xl border border-red-200 bg-red-50/80 px-4 py-3 text-sm text-red-900">
          <p className="font-bold">Issue: {campaign.errorType.replace(/_/g, " ")}</p>
          {campaign.errorMessage && <p className="mt-1 text-red-800">{campaign.errorMessage}</p>}
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          { label: "Spend", value: formatInr(campaign.budgetSpent) },
          { label: "Budget", value: formatInr(campaign.budgetTotal) },
          { label: "Impressions", value: formatImpressions(campaign.impressions) },
          { label: "Clicks", value: formatImpressions(campaign.clicks) },
          { label: "CTR", value: `${campaign.ctr.toFixed(2)}%` },
          { label: "CPC", value: formatInr(campaign.cpc) },
          { label: "Conversions", value: String(campaign.conversions) },
          {
            label: "Region",
            value: campaign.region ?? "—",
          },
        ].map((row) => (
          <div
            key={row.label}
            className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm"
          >
            <p className="text-xs font-medium text-neutral-600">{row.label}</p>
            <p className="mt-1 text-xl font-bold tabular-nums text-neutral-900">{row.value}</p>
          </div>
        ))}
      </div>

      {AI_ENABLED && (
        <section className="rounded-2xl border border-emerald-200 bg-gradient-to-b from-emerald-50/60 to-white p-6 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-sm font-bold text-neutral-900">AI campaign analysis</h2>
              <p className="mt-1 text-xs text-neutral-600">
                Health score, strengths, risks, and lead outlook (Claude when the server key is set;
                otherwise rule-based).
              </p>
            </div>
            <button
              type="button"
              onClick={() => void runCampaignAnalysis()}
              disabled={analysisLoading}
              className="shrink-0 rounded-xl bg-primary px-4 py-2 text-sm font-bold text-white hover:bg-primary-hover disabled:opacity-60"
            >
              {analysisLoading ? "Analyzing…" : analysis ? "Run again" : "Run analysis"}
            </button>
          </div>
          {analysisError && (
            <p className="mt-4 text-sm text-amber-800">{analysisError}</p>
          )}
          {analysis && (
            <div className="mt-4 space-y-4 text-sm text-neutral-800">
              <div className="flex flex-wrap items-center gap-3">
                <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-primary ring-1 ring-primary/20">
                  Health {analysis.healthScore}/100
                </span>
                <span className="text-xs text-neutral-600">
                  Predicted leads next month:{" "}
                  <strong className="text-neutral-900">{analysis.predictedLeadsNextMonth}</strong> (range{" "}
                  {analysis.predictedLeadsRange.min}–{analysis.predictedLeadsRange.max})
                </span>
              </div>
              <p className="leading-relaxed">{analysis.summary}</p>
              {analysis.strengths.length > 0 && (
                <div>
                  <p className="text-xs font-bold uppercase text-neutral-600">Strengths</p>
                  <ul className="mt-1 list-disc space-y-1 pl-5">
                    {analysis.strengths.map((s, i) => (
                      <li key={i}>{s}</li>
                    ))}
                  </ul>
                </div>
              )}
              {analysis.weaknesses.length > 0 && (
                <div>
                  <p className="text-xs font-bold uppercase text-neutral-600">Risks</p>
                  <ul className="mt-1 list-disc space-y-1 pl-5">
                    {analysis.weaknesses.map((s, i) => (
                      <li key={i}>{s}</li>
                    ))}
                  </ul>
                </div>
              )}
              {analysis.recommendations.length > 0 && (
                <div>
                  <p className="text-xs font-bold uppercase text-neutral-600">Recommendations</p>
                  <ul className="mt-1 list-disc space-y-1 pl-5">
                    {analysis.recommendations.map((s, i) => (
                      <li key={i}>{s}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </section>
      )}

      <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
        <h2 className="text-sm font-bold text-neutral-900">Schedule &amp; sync</h2>
        <div className="mt-4">
          <CampaignCalendar
            startDate={campaign.startDate}
            endDate={campaign.endDate}
            platform={campaign.platform}
          />
        </div>
        <dl className="mt-6 grid gap-3 border-t border-neutral-100 pt-6 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-neutral-600">Start</dt>
            <dd className="font-medium text-neutral-900">{formatShortDate(campaign.startDate)}</dd>
          </div>
          <div>
            <dt className="text-neutral-600">End</dt>
            <dd className="font-medium text-neutral-900">
              {campaign.endDate ? formatShortDate(campaign.endDate) : "Open-ended"}
            </dd>
          </div>
          <div>
            <dt className="text-neutral-600">External ID</dt>
            <dd className="font-mono text-xs text-neutral-800">{campaign.externalId}</dd>
          </div>
          <div>
            <dt className="text-neutral-600">Last synced</dt>
            <dd className="text-neutral-800">
              {campaign.lastSyncedAt ? formatShortDate(campaign.lastSyncedAt) : "—"}
            </dd>
          </div>
        </dl>
        <div className="mt-6">
          <p className="text-xs font-medium text-neutral-600">Budget utilization</p>
          <div className="mt-2 h-3 overflow-hidden rounded-full bg-neutral-100">
            <div
              className={`h-full rounded-full transition-all ${
                spendPct >= 100 ? "bg-red-500" : spendPct >= 85 ? "bg-amber-400" : "bg-primary"
              }`}
              style={{ width: `${Math.min(100, spendPct)}%` }}
            />
          </div>
          <p className="mt-1 text-xs text-neutral-600">{spendPct.toFixed(0)}% of budget used</p>
        </div>
      </div>
    </div>
  );
}

function DetailFallback() {
  return (
    <div className="space-y-6">
      <div className="h-8 w-48 animate-pulse rounded-lg bg-neutral-200" />
      <div className="h-40 animate-pulse rounded-2xl bg-neutral-100" />
    </div>
  );
}

export default function CampaignDetailPage() {
  return (
    <Suspense fallback={<DetailFallback />}>
      <DetailInner />
    </Suspense>
  );
}
