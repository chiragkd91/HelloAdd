"use client";

import { Button } from "@/components/ui/Button";
import { buttonVariantStyles } from "@/components/ui/buttonStyles";
import { platformLabel } from "@/lib/campaignDisplay";
import Link from "next/link";
import { ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";

export type AgencyClientCardRow = {
  id: string;
  name: string;
  industry: string | null;
  health: string;
  spend: number;
  platforms: Array<{ platform: string; ctr: number }>;
  issues: number;
  adsLive: number;
  adsTotal: number;
  contactName: string | null;
  contactPhone: string | null;
  contactEmail: string | null;
  tradeName: string | null;
};

type Props = {
  clients: AgencyClientCardRow[];
  agencyLabel: string;
  linkingId: string | null;
  onGenerateLink: (clientId: string) => void;
};

export function AgencyClientMobileCards({
  clients,
  agencyLabel,
  linkingId,
  onGenerateLink,
}: Props) {
  const [openId, setOpenId] = useState<string | null>(null);

  return (
    <div className="space-y-3 md:hidden">
      {clients.map((c) => {
        const expanded = openId === c.id;
        const platformSummary =
          c.platforms.length === 0
            ? "—"
            : c.platforms
                .slice(0, 4)
                .map((p) => `${platformLabel(p.platform)} ${p.ctr.toFixed(1)}%`)
                .join(" · ");
        return (
          <div
            key={c.id}
            className="rounded-2xl border border-neutral-200 bg-white shadow-sm"
          >
            <button
              type="button"
              onClick={() => setOpenId((id) => (id === c.id ? null : c.id))}
              className="flex w-full items-start gap-3 p-4 text-left"
              aria-expanded={expanded}
            >
              <div className="flex min-w-0 flex-1 flex-col gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-bold text-neutral-900">{c.name}</span>
                  <span
                    className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-bold ${
                      c.health === "Critical"
                        ? "bg-red-100 text-red-900"
                        : c.health === "Warning"
                          ? "bg-amber-100 text-amber-900"
                          : "bg-emerald-100 text-emerald-900"
                    }`}
                  >
                    {c.health}
                  </span>
                </div>
                <p className="text-xs text-neutral-600">
                  Spend{" "}
                  <span className="font-semibold tabular-nums text-neutral-800">
                    {c.spend.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  </span>
                  {" · "}
                  {c.adsLive} live
                  {c.adsTotal > 0 ? ` · ${c.adsTotal} total ads` : ""}
                  {" · "}
                  {c.issues} issues
                </p>
                <p className="line-clamp-2 text-[11px] text-neutral-600">{platformSummary}</p>
              </div>
              <span className="shrink-0 text-neutral-600" aria-hidden>
                {expanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
              </span>
            </button>
            {expanded && (
              <div className="space-y-3 border-t border-neutral-100 px-4 pb-4 pt-3 text-sm">
                <dl className="grid gap-2 text-xs text-neutral-600">
                  <div>
                    <dt className="font-bold uppercase text-neutral-600">Agency</dt>
                    <dd>{agencyLabel}</dd>
                  </div>
                  <div>
                    <dt className="font-bold uppercase text-neutral-600">Industry</dt>
                    <dd>{c.industry ?? "—"}</dd>
                  </div>
                  <div>
                    <dt className="font-bold uppercase text-neutral-600">Brand / trade</dt>
                    <dd>{c.tradeName?.trim() || "—"}</dd>
                  </div>
                  <div>
                    <dt className="font-bold uppercase text-neutral-600">Contact</dt>
                    <dd>{c.contactName?.trim() || "—"}</dd>
                  </div>
                  <div>
                    <dt className="font-bold uppercase text-neutral-600">Mobile</dt>
                    <dd className="tabular-nums">{c.contactPhone?.trim() || "—"}</dd>
                  </div>
                  <div>
                    <dt className="font-bold uppercase text-neutral-600">Email</dt>
                    <dd className="break-all">
                      {c.contactEmail?.trim() ? (
                        <a href={`mailto:${c.contactEmail.trim()}`} className="text-sky-800 underline">
                          {c.contactEmail.trim()}
                        </a>
                      ) : (
                        "—"
                      )}
                    </dd>
                  </div>
                </dl>
                <div className="flex flex-wrap gap-2">
                  <Link href={`/agency/clients/${c.id}`} className={buttonVariantStyles.secondary}>
                    Open
                  </Link>
                  <Button
                    type="button"
                    className="!px-3 !py-1.5 text-xs"
                    disabled={linkingId === c.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      onGenerateLink(c.id);
                    }}
                  >
                    {linkingId === c.id ? "…" : "Client link"}
                  </Button>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
