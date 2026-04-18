import { connectMongo } from "@helloadd/database";
import mongoose from "mongoose";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * GET /api/health — verifies MongoDB is reachable (same connection as the rest of the app).
 * Does not expose secrets. Use: curl -sS https://<dashboard-host>/api/health
 */
export async function GET() {
  const started = Date.now();
  try {
    await connectMongo();
    const db = mongoose.connection.db;
    if (!db) {
      return NextResponse.json({ ok: false, error: "No database handle" }, { status: 503 });
    }
    await db.admin().command({ ping: 1 });
    const pingMs = Date.now() - started;
    return NextResponse.json(
      {
        ok: true,
        database: db.databaseName,
        pingMs,
      },
      {
        status: 200,
        headers: { "Cache-Control": "no-store" },
      },
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    const showDetail = process.env.NODE_ENV === "development";
    return NextResponse.json(
      {
        ok: false,
        error: "Database unavailable",
        ...(showDetail ? { detail: msg } : {}),
      },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
