import { User } from "@helloadd/database";
import bcrypt from "bcryptjs";
import { NextRequest } from "next/server";
import { z } from "zod";
import { jsonDbUnavailable, jsonError, jsonOk } from "@/lib/api/http";
import { listUserOrganizations, publicUser, resolveRequestUser } from "@/lib/api/session";

export async function GET(req: NextRequest) {
  try {
    const { user } = await resolveRequestUser(req);
    if (!user) {
      return jsonError("Unauthorized", 401);
    }

    const organizations = await listUserOrganizations(user._id);
    return jsonOk({ user: publicUser(user), organizations });
  } catch (e) {
    return jsonDbUnavailable(e);
  }
}

const patchSchema = z
  .object({
    name: z.string().min(1).max(120).optional(),
    email: z.string().email().optional(),
    newPassword: z.string().min(8).max(120).optional(),
  })
  .strict();

export async function PATCH(req: NextRequest) {
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return jsonError("Invalid JSON body", 400);
  }
  const parsed = patchSchema.safeParse(json);
  if (!parsed.success) {
    return jsonError("Validation failed", 400, parsed.error.flatten());
  }

  try {
    const { user } = await resolveRequestUser(req);
    if (!user) {
      return jsonError("Unauthorized", 401);
    }

    const updates: Record<string, unknown> = {};
    if (parsed.data.name !== undefined) {
      updates.name = parsed.data.name.trim();
    }
    if (parsed.data.email !== undefined) {
      const email = parsed.data.email.trim().toLowerCase();
      const other = await User.findOne({ email, _id: { $ne: user._id } })
        .select({ _id: 1 })
        .lean();
      if (other) return jsonError("Email already in use", 409);
      updates.email = email;
    }
    if (parsed.data.newPassword !== undefined) {
      updates.password = await bcrypt.hash(parsed.data.newPassword, 10);
    }
    if (Object.keys(updates).length === 0) {
      return jsonError("No updates", 400);
    }

    const nextUser = await User.findByIdAndUpdate(user._id, { $set: updates }, { new: true }).lean();
    if (!nextUser) return jsonError("User not found", 404);
    return jsonOk({ user: publicUser(nextUser) });
  } catch (e) {
    return jsonDbUnavailable(e);
  }
}
