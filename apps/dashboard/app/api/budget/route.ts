import { Budget } from "@helloadd/database";
import { NextRequest } from "next/server";
import { z } from "zod";
import { jsonError, jsonOk } from "@/lib/api/http";
import { requireUserAndOrg } from "@/lib/api/guard";
import { requireUserOrgRole } from "@/lib/auth/rbac";

const putSchema = z.object({
  month: z.number().min(1).max(12),
  year: z.number().min(2000).max(2100),
  totalBudget: z.number().nonnegative(),
  platforms: z.record(z.string(), z.any()),
});

export async function GET(req: NextRequest) {
  const auth = await requireUserAndOrg(req);
  if (!auth.ok) return auth.response;

  const { searchParams } = new URL(req.url);
  const month = Number(searchParams.get("month") ?? new Date().getMonth() + 1);
  const year = Number(searchParams.get("year") ?? new Date().getFullYear());

  if (!Number.isFinite(month) || !Number.isFinite(year)) {
    return jsonError("Invalid month or year", 400);
  }

  const doc = await Budget.findOne({
    organizationId: auth.organizationId,
    month,
    year,
  }).lean();

  if (!doc) {
    return jsonOk({
      organizationId: auth.organizationId,
      month,
      year,
      totalBudget: 0,
      platforms: {},
    });
  }

  return jsonOk({
    id: doc._id,
    organizationId: doc.organizationId,
    month: doc.month,
    year: doc.year,
    totalBudget: doc.totalBudget,
    platforms: doc.platforms,
    createdAt: doc.createdAt.toISOString(),
  });
}

export async function PUT(req: NextRequest) {
  const auth = await requireUserOrgRole(req, "MANAGER");
  if (!auth.ok) return auth.response;

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return jsonError("Invalid JSON body", 400);
  }

  const parsed = putSchema.safeParse(json);
  if (!parsed.success) {
    return jsonError("Validation failed", 400, parsed.error.flatten());
  }

  const { month, year, totalBudget, platforms } = parsed.data;

  const doc = await Budget.findOneAndUpdate(
    { organizationId: auth.organizationId, month, year },
    {
      $set: {
        organizationId: auth.organizationId,
        month,
        year,
        totalBudget,
        platforms,
      },
    },
    { new: true, upsert: true }
  ).lean();

  if (!doc) {
    return jsonError("Failed to save budget", 500);
  }

  return jsonOk({
    id: doc._id,
    organizationId: doc.organizationId,
    month: doc.month,
    year: doc.year,
    totalBudget: doc.totalBudget,
    platforms: doc.platforms,
    createdAt: doc.createdAt.toISOString(),
  });
}
