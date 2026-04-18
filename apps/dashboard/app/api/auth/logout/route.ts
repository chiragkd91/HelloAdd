import { connectMongo, Session } from "@helloadd/database";
import { NextRequest } from "next/server";
import { jsonDbUnavailable, jsonError, jsonOk } from "@/lib/api/http";
import { resolveRequestUser } from "@/lib/api/session";

export async function POST(req: NextRequest) {
  try {
    await connectMongo();
  } catch (e) {
    return jsonDbUnavailable(e);
  }

  const { sessionToken } = await resolveRequestUser(req);
  if (sessionToken) {
    await Session.deleteMany({ token: sessionToken });
  }

  const res = jsonOk({ ok: true });
  res.cookies.set("session", "", { httpOnly: true, path: "/", maxAge: 0 });
  return res;
}
