import { NextResponse } from "next/server";

/**
 * Dev/IDE probes (e.g. tooling that registers with the local Next.js server) may POST here.
 * No app code calls this; returning 200 avoids noisy 404s in the dev terminal.
 */
export function POST() {
  return NextResponse.json({ ok: true });
}
