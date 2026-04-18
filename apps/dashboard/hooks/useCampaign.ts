"use client";

import type { ApiCampaign } from "@/types/campaign";
import { useCallback, useEffect, useState } from "react";

export function useCampaign(id: string | undefined) {
  const [campaign, setCampaign] = useState<ApiCampaign | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);

  const refresh = useCallback(async () => {
    if (!id) {
      setCampaign(null);
      setIsLoading(false);
      setError("Missing campaign id");
      return;
    }
    setIsLoading(true);
    setError(null);
    setNotFound(false);
    try {
      const r = await fetch(`/api/campaigns/${encodeURIComponent(id)}`, {
        credentials: "include",
        cache: "no-store",
      });
      if (r.status === 404) {
        setNotFound(true);
        setCampaign(null);
        return;
      }
      if (r.status === 401) {
        setError("Sign in required");
        setCampaign(null);
        return;
      }
      if (!r.ok) {
        const j = (await r.json().catch(() => ({}))) as { error?: string };
        setError(typeof j.error === "string" ? j.error : "Failed to load campaign");
        setCampaign(null);
        return;
      }
      setCampaign((await r.json()) as ApiCampaign);
    } catch {
      setError("Network error");
      setCampaign(null);
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const update = useCallback(
    async (body: Record<string, unknown>) => {
      if (!id) return false;
      const r = await fetch(`/api/campaigns/${encodeURIComponent(id)}`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!r.ok) {
        const j = (await r.json().catch(() => ({}))) as { error?: string };
        throw new Error(typeof j.error === "string" ? j.error : "Update failed");
      }
      setCampaign((await r.json()) as ApiCampaign);
      return true;
    },
    [id]
  );

  return { campaign, isLoading, error, notFound, refresh, update };
}
