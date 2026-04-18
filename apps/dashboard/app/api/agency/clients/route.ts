import { createId } from "@paralleldrive/cuid2";
import {
  AgencyClientRelation,
  AgencyPlan,
  Organization,
  connectMongo,
  AgencyIntegrationHintStateValues,
  PlatformValues,
  type Platform,
  type AgencyIntegrationHintState,
} from "@helloadd/database";
import { NextRequest } from "next/server";
import { z } from "zod";
import { slugifyBase } from "@/lib/agency/slugify";
import { requireAgencyManager } from "@/lib/api/agencyGuard";
import { jsonError, jsonOk } from "@/lib/api/http";
import { requireRole } from "@/lib/auth/rbac";

const optionalTrim = z
  .union([z.string(), z.null(), z.undefined()])
  .transform((s) => {
    if (s == null) return undefined;
    const t = String(s).trim();
    return t === "" ? undefined : t;
  });

const platformEnum = z.enum(PlatformValues as unknown as [Platform, ...Platform[]]);
const integrationHintSchema = z.object({
  platform: platformEnum,
  state: z.enum(AgencyIntegrationHintStateValues as unknown as [AgencyIntegrationHintState, ...AgencyIntegrationHintState[]]),
  manualAccountId: z.string().nullable().optional(),
  whatsappPhone: z.string().nullable().optional(),
  bsp: z.string().nullable().optional(),
});

const postSchema = z
  .object({
    clientOrgId: z.string().min(1).optional(),
    name: z.string().min(1).optional(),
    planId: z.string().min(1).optional(),
    industry: z.string().optional(),
    city: z.string().optional(),
    website: z.string().optional(),
    contractStartDate: z.string().optional(),
    integrations: z.array(integrationHintSchema).optional(),
    contractValue: z.number().nonnegative().optional().default(0),
    contractCurrency: z.string().optional().default("INR"),
    notes: optionalTrim,
    contactName: optionalTrim,
    contactPhone: optionalTrim,
    contactEmail: optionalTrim,
    tradeName: optionalTrim,
  })
  .refine((d) => Boolean(d.clientOrgId?.trim()) || Boolean(d.name?.trim()), {
    message: "Provide clientOrgId (link) or name (create)",
  })
  .refine((d) => !d.planId || Boolean(d.name?.trim()), {
    message: "planId requires name (company)",
  })
  .refine((d) => !d.planId || !d.clientOrgId?.trim(), {
    message: "Cannot combine planId with clientOrgId in one request",
  });

async function refreshAgencyClientCount(agencyId: string) {
  const n = await AgencyClientRelation.countDocuments({
    agencyOrgId: agencyId,
    status: "ACTIVE",
  });
  await Organization.updateOne({ _id: agencyId }, { $set: { clientCount: n } });
}

export async function GET(req: NextRequest) {
  const auth = await requireAgencyManager(req);
  if (!auth.ok) return auth.response;

  await connectMongo();
  const rels = await AgencyClientRelation.find({ agencyOrgId: auth.organizationId })
    .sort({ createdAt: -1 })
    .lean();

  const clientIds = rels.map((r) => r.clientOrgId);
  const orgs = await Organization.find({ _id: { $in: clientIds } }).lean();
  const byId = new Map(orgs.map((o) => [o._id, o]));

  const items = rels.map((r) => {
    const o = byId.get(r.clientOrgId);
    return {
      relationId: r._id,
      clientOrgId: r.clientOrgId,
      name: o?.name ?? "Unknown",
      industry: o?.industry ?? null,
      status: r.status,
      contractValue: r.contractValue,
      contractCurrency: r.contractCurrency,
      startDate: r.startDate,
      aiHealthLabel: o?.aiHealthLabel ?? null,
      aiHealthScore: o?.aiHealthScore ?? null,
      contactName: r.contactName ?? null,
      contactPhone: r.contactPhone ?? null,
      contactEmail: r.contactEmail ?? null,
      tradeName: r.tradeName ?? null,
    };
  });

  return jsonOk({ clients: items });
}

export async function POST(req: NextRequest) {
  const auth = await requireAgencyManager(req);
  if (!auth.ok) return auth.response;
  if (!requireRole(auth.role, "ADMIN")) {
    return jsonError("Only admins and owners can create/link agency clients", 403);
  }

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return jsonError("Invalid JSON body", 400);
  }

  const parsed = postSchema.safeParse(json);
  if (!parsed.success) {
    return jsonError("Validation failed", 400, parsed.error.flatten());
  }

  await connectMongo();
  const agencyId = auth.organizationId;

  if (parsed.data.planId) {
    const plan = await AgencyPlan.findOne({
      _id: parsed.data.planId.trim(),
      agencyOrgId: agencyId,
      isActive: true,
    }).lean();
    if (!plan) {
      return jsonError("Plan not found or inactive", 404);
    }

    const name = parsed.data.name!.trim();
    const base = slugifyBase(name);
    const slug = `${base || "client"}-${createId().slice(0, 8)}`;
    const startDate = parsed.data.contractStartDate?.trim()
      ? new Date(parsed.data.contractStartDate)
      : new Date();
    if (Number.isNaN(startDate.getTime())) {
      return jsonError("Invalid contractStartDate", 400);
    }

    const hints = (parsed.data.integrations ?? []).map((h) => ({
      platform: h.platform,
      state: h.state,
      manualAccountId: h.manualAccountId ?? null,
      whatsappPhone: h.whatsappPhone ?? null,
      bsp: h.bsp ?? null,
    }));

    const newOrg = await Organization.create({
      name,
      slug,
      industry: parsed.data.industry?.trim() || null,
      parentAgencyId: agencyId,
      plan: "STARTER",
      isAgency: false,
      assignedPlanId: plan._id,
      allowedPlatforms: [...plan.allowedPlatforms],
      planFeatures: { ...plan.features },
    });

    await AgencyClientRelation.create({
      agencyOrgId: agencyId,
      clientOrgId: newOrg._id,
      contractValue: plan.monthlyPrice,
      contractCurrency: plan.currency || "INR",
      status: "ACTIVE",
      notes: parsed.data.notes || null,
      contactName: parsed.data.contactName || null,
      contactPhone: parsed.data.contactPhone || null,
      contactEmail: parsed.data.contactEmail || null,
      tradeName: parsed.data.tradeName || null,
      city: parsed.data.city?.trim() || null,
      website: parsed.data.website?.trim() || null,
      integrationHints: hints,
      startDate,
    });

    await refreshAgencyClientCount(agencyId);

    return jsonOk({ ok: true, mode: "create_with_plan" as const, clientOrgId: newOrg._id });
  }

  if (parsed.data.clientOrgId) {
    const clientOrgId = parsed.data.clientOrgId.trim();
    if (clientOrgId === agencyId) {
      return jsonError("Cannot link your own agency org as a client", 400);
    }

    const client = await Organization.findById(clientOrgId).lean();
    if (!client) {
      return jsonError("Client organization not found", 404);
    }
    if (client.parentAgencyId && client.parentAgencyId !== agencyId) {
      return jsonError("This organization is already linked to another agency", 409);
    }

    const existing = await AgencyClientRelation.findOne({
      agencyOrgId: agencyId,
      clientOrgId,
    }).lean();
    if (existing) {
      return jsonError("Client is already linked", 409);
    }

    await AgencyClientRelation.create({
      agencyOrgId: agencyId,
      clientOrgId,
      contractValue: parsed.data.contractValue,
      contractCurrency: parsed.data.contractCurrency,
      status: "ACTIVE",
      notes: parsed.data.notes || null,
      contactName: parsed.data.contactName || null,
      contactPhone: parsed.data.contactPhone || null,
      contactEmail: parsed.data.contactEmail || null,
      tradeName: parsed.data.tradeName || null,
      city: parsed.data.city?.trim() || null,
      website: parsed.data.website?.trim() || null,
      integrationHints: [],
      startDate: new Date(),
    });

    await Organization.updateOne(
      { _id: clientOrgId },
      { $set: { parentAgencyId: agencyId } },
    );
    await refreshAgencyClientCount(agencyId);

    return jsonOk({ ok: true, mode: "link" as const, clientOrgId });
  }

  const name = parsed.data.name!.trim();
  const base = slugifyBase(name);
  const slug = `${base || "client"}-${createId().slice(0, 8)}`;

  const newOrg = await Organization.create({
    name,
    slug,
    industry: parsed.data.industry?.trim() || null,
    parentAgencyId: agencyId,
    plan: "STARTER",
    isAgency: false,
  });

  await AgencyClientRelation.create({
    agencyOrgId: agencyId,
    clientOrgId: newOrg._id,
    contractValue: parsed.data.contractValue,
    contractCurrency: parsed.data.contractCurrency,
    status: "ACTIVE",
    notes: parsed.data.notes || null,
    contactName: parsed.data.contactName || null,
    contactPhone: parsed.data.contactPhone || null,
    contactEmail: parsed.data.contactEmail || null,
    tradeName: parsed.data.tradeName || null,
    city: parsed.data.city?.trim() || null,
    website: parsed.data.website?.trim() || null,
    integrationHints: [],
    startDate: new Date(),
  });

  await refreshAgencyClientCount(agencyId);

  return jsonOk({ ok: true, mode: "create" as const, clientOrgId: newOrg._id });
}
