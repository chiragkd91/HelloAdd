import { NextResponse } from "next/server";

export function jsonOk<T>(data: T, init?: ResponseInit) {
  return NextResponse.json(data, { status: 200, ...init });
}

export function jsonError(message: string, status: number, detail?: unknown) {
  return NextResponse.json(
    { error: message, ...(detail !== undefined ? { detail } : {}) },
    { status }
  );
}

export function jsonDbUnavailable(error: unknown) {
  const msg = error instanceof Error ? error.message : String(error);
  return jsonError("Database unavailable", 503, msg);
}
