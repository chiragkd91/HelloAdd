"use client";

import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { platformLabel } from "@/lib/campaignDisplay";
import type { ApiCampaign } from "@/types/campaign";
import Link from "next/link";
import { Search } from "lucide-react";
import { useEffect, useRef, useState } from "react";

type CampaignsResponse = { items: ApiCampaign[] };

export function GlobalSearch({ className }: { className?: string }) {
  const [query, setQuery] = useState("");
  const debounced = useDebouncedValue(query, 320);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<ApiCampaign[]>([]);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const q = debounced.trim();
    if (q.length < 2) {
      setItems([]);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    const params = new URLSearchParams();
    params.set("search", q);
    params.set("limit", "12");
    void fetch(`/api/campaigns?${params.toString()}`, {
      credentials: "include",
      cache: "no-store",
    })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("bad"))))
      .then((data: CampaignsResponse) => {
        if (!cancelled) setItems(data.items ?? []);
      })
      .catch(() => {
        if (!cancelled) setItems([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [debounced]);

  useEffect(() => {
    function close(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, []);

  const trimmed = query.trim();
  const showPanel = open && trimmed.length >= 2;

  return (
    <div className={`relative ${className ?? ""}`} ref={boxRef}>
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-600" />
      <input
        type="search"
        value={query}
        placeholder="Search campaigns, platforms…"
        className="w-full rounded-xl border border-neutral-200 bg-neutral-50 py-2 pl-9 pr-3 text-sm text-neutral-900 placeholder:text-neutral-600 focus:border-primary focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/20"
        aria-label="Global search"
        aria-controls="global-search-results"
        autoComplete="off"
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === "Escape") setOpen(false);
        }}
      />
      {showPanel && (
        <div
          id="global-search-results"
          className="absolute left-0 right-0 z-50 mt-1 max-h-80 overflow-auto rounded-xl border border-neutral-200 bg-white py-1 shadow-lg"
        >
          {loading ? (
            <p className="px-3 py-3 text-sm text-neutral-600">Searching…</p>
          ) : items.length === 0 ? (
            <p className="px-3 py-3 text-sm text-neutral-600">No campaigns match that search.</p>
          ) : (
            <ul className="py-1">
              {items.map((c) => (
                <li key={c.id}>
                  <Link
                    href={`/campaigns/${c.id}`}
                    className="block px-3 py-2 text-sm hover:bg-neutral-50"
                    onClick={() => setOpen(false)}
                  >
                    <span className="font-medium text-neutral-900">{c.name}</span>
                    <span className="mt-0.5 block text-xs text-neutral-600">
                      {platformLabel(c.platform)}
                      {c.product ? ` · ${c.product}` : ""}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
          <div className="border-t border-neutral-100 px-2 py-2">
            <Link
              href={`/campaigns?q=${encodeURIComponent(trimmed)}`}
              className="block rounded-lg px-2 py-1.5 text-xs font-semibold text-primary hover:bg-primary/5"
              onClick={() => setOpen(false)}
            >
              Open Campaigns with this search
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
