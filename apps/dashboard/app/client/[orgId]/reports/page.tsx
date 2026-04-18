"use client";

import { ClientPortalChrome } from "@/components/clientPortal/ClientPortalChrome";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

export default function ClientReportsPage() {
  const params = useParams();
  const orgId = typeof params.orgId === "string" ? params.orgId : "";
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [rows, setRows] = useState<
    Array<{
      id: string;
      reportType: string;
      status: string;
      createdAt: string;
      dateFrom: string | null;
      dateTo: string | null;
    }>
  >([]);

  const load = useCallback(async () => {
    if (!orgId) return;
    setLoading(true);
    setErr(null);
    try {
      const r = await fetch(`/api/client/reports?orgId=${encodeURIComponent(orgId)}`, {
        credentials: "include",
        cache: "no-store",
      });
      if (!r.ok) {
        setErr(
          r.status === 403
            ? "This section is not available — your agency may have turned it off."
            : "Could not load reports.",
        );
        setRows([]);
        return;
      }
      const j = (await r.json()) as { reports: typeof rows };
      setRows(j.reports ?? []);
    } catch {
      setErr("Network error");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [orgId]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <ClientPortalChrome orgId={orgId} activeSection="reports">
      <h1 className="text-xl font-bold text-neutral-900">Reports</h1>
      <p className="mt-1 text-sm text-neutral-500">Download exports your agency has generated.</p>
      {loading && <p className="mt-6 text-sm text-neutral-500">Loading…</p>}
      {err && <p className="mt-6 text-sm text-amber-800">{err}</p>}
      {!loading && !err && (
        <div className="mt-6 overflow-x-auto rounded-xl border border-neutral-200 bg-white">
          <table className="min-w-full text-sm">
            <thead className="bg-neutral-50 text-left text-xs font-bold uppercase text-neutral-500">
              <tr>
                <th className="px-3 py-3">Type</th>
                <th className="px-3 py-3">Status</th>
                <th className="px-3 py-3">Created</th>
                <th className="px-3 py-3">Download</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-3 py-8 text-center text-neutral-500">
                    No reports yet.
                  </td>
                </tr>
              ) : (
                rows.map((r) => (
                  <tr key={r.id} className="border-t border-neutral-100">
                    <td className="px-3 py-3 font-medium">{r.reportType}</td>
                    <td className="px-3 py-3">{r.status}</td>
                    <td className="px-3 py-3 text-neutral-600">
                      {new Date(r.createdAt).toLocaleString()}
                    </td>
                    <td className="px-3 py-3">
                      {r.status === "READY" ? (
                        <div className="flex flex-wrap gap-2">
                          <a
                            className="font-semibold text-sky-700 underline"
                            href={`/api/client/reports/${r.id}/download?orgId=${encodeURIComponent(orgId)}&format=csv`}
                          >
                            CSV
                          </a>
                          <a
                            className="font-semibold text-sky-700 underline"
                            href={`/api/client/reports/${r.id}/download?orgId=${encodeURIComponent(orgId)}&format=xlsx`}
                          >
                            Excel
                          </a>
                          <a
                            className="font-semibold text-sky-700 underline"
                            href={`/api/client/reports/${r.id}/download?orgId=${encodeURIComponent(orgId)}&format=pdf`}
                          >
                            PDF
                          </a>
                        </div>
                      ) : (
                        <span className="text-neutral-400">—</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </ClientPortalChrome>
  );
}
