"use client";

import { useCallback, useEffect, useState } from "react";

/** Unread alert count for sidebar / badges. Polls every 2 min. */
export function useUnreadAlertCount() {
  const [unread, setUnread] = useState<number | null>(null);

  const refresh = useCallback(async () => {
    try {
      const r = await fetch("/api/alerts?count=1", { credentials: "include", cache: "no-store" });
      if (!r.ok) {
        setUnread(null);
        return;
      }
      const j = (await r.json()) as { unread?: number };
      setUnread(typeof j.unread === "number" ? j.unread : 0);
    } catch {
      setUnread(null);
    }
  }, []);

  useEffect(() => {
    refresh();
    const id = window.setInterval(refresh, 2 * 60 * 1000);
    const onAlertsChanged = () => {
      refresh();
    };
    window.addEventListener("helloadd:alerts-changed", onAlertsChanged);
    return () => {
      window.clearInterval(id);
      window.removeEventListener("helloadd:alerts-changed", onAlertsChanged);
    };
  }, [refresh]);

  return { unread, refresh };
}
