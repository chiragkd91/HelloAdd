"use client";

import type { ApiCampaign } from "@/types/campaign";
import { useCallback, useEffect, useState } from "react";

export type UseCampaignsOptions = {
  limit?: number;
  skip?: number;
  /** Ad status enum e.g. LIVE */
  status?: string;
  /** Platform enum e.g. GOOGLE */
  platform?: string;
};

type CampaignsResponse = {
  items: ApiCampaign[];
  total: number;
  skip: number;
  limit: number;
};

export function useCampaigns(options: UseCampaignsOptions = {}) {
  const { limit = 200, skip = 0, status, platform } = options;
  const [campaigns, setCampaigns] = useState<ApiCampaign[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.set("limit", String(limit));
      params.set("skip", String(skip));
      if (status) params.set("status", status);
      if (platform) params.set("platform", platform);

      const r = await fetch(`/api/campaigns?${params.toString()}`, {
        credentials: "include",
        cache: "no-store",
      });

      if (r.status === 401) {
        setCampaigns([]);
        setTotal(0);
        setError("Sign in required");
        return;
      }

      if (!r.ok) {
        const j = (await r.json().catch(() => ({}))) as { error?: string };
        setError(typeof j.error === "string" ? j.error : "Failed to load campaigns");
        setCampaigns([]);
        setTotal(0);
        return;
      }

      const data = (await r.json()) as CampaignsResponse;
      setCampaigns(data.items ?? []);
      setTotal(data.total ?? 0);
    } catch {
      setError("Network error");
      setCampaigns([]);
      setTotal(0);
    } finally {
      setIsLoading(false);
    }
  }, [limit, skip, status, platform]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { campaigns, total, isLoading, error, refresh };
}
