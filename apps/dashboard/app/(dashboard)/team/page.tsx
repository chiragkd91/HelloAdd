"use client";

import { TableSkeletonRows } from "@/components/ui/DataSkeletons";
import { Button } from "@/components/ui/Button";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { Modal } from "@/components/ui/Modal";
import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";

const INVITE_ROLES = ["ADMIN", "MANAGER", "VIEWER"] as const;
type InviteRole = (typeof INVITE_ROLES)[number];

type MemberRow = {
  memberId: string;
  userId: string;
  role: string;
  name: string;
  email: string;
};

type PendingInvite = {
  id: string;
  email: string;
  role: string;
  expiresAt: string;
  createdAt: string;
};

function roleLabel(role: string): string {
  switch (role) {
    case "OWNER":
      return "Owner";
    case "ADMIN":
      return "Admin";
    case "MANAGER":
      return "Manager";
    case "VIEWER":
      return "Viewer";
    default:
      return role;
  }
}

export default function TeamPage() {
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [invites, setInvites] = useState<PendingInvite[]>([]);
  const [loading, setLoading] = useState(true);
  const [invitesLoading, setInvitesLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<InviteRole>("VIEWER");
  const [inviteSubmitting, setInviteSubmitting] = useState(false);
  const [lastLink, setLastLink] = useState<string | null>(null);
  const [myRole, setMyRole] = useState<string | null>(null);
  const [memberActionId, setMemberActionId] = useState<string | null>(null);
  const [removeMemberTarget, setRemoveMemberTarget] = useState<{ memberId: string; name: string } | null>(null);

  const loadMembers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await fetch("/api/organization/members", { credentials: "include", cache: "no-store" });
      if (!r.ok) {
        const j = (await r.json().catch(() => ({}))) as { error?: string };
        setError(typeof j.error === "string" ? j.error : "Failed to load team");
        setMembers([]);
        setMyRole(null);
        return;
      }
      const data = (await r.json()) as {
        members?: MemberRow[];
        myRole?: string | null;
      };
      setMembers(data.members ?? []);
      setMyRole(typeof data.myRole === "string" ? data.myRole : null);
    } catch {
      setError("Network error");
      setMembers([]);
      setMyRole(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadInvites = useCallback(async () => {
    setInvitesLoading(true);
    try {
      const r = await fetch("/api/organization/invites", { credentials: "include", cache: "no-store" });
      if (!r.ok) {
        setInvites([]);
        return;
      }
      const data = (await r.json()) as { invites?: PendingInvite[] };
      setInvites(data.invites ?? []);
    } catch {
      setInvites([]);
    } finally {
      setInvitesLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMembers();
  }, [loadMembers]);

  useEffect(() => {
    loadInvites();
  }, [loadInvites]);

  async function submitInvite(e: React.FormEvent) {
    e.preventDefault();
    const email = inviteEmail.trim().toLowerCase();
    if (!email) {
      toast.error("Enter an email address.");
      return;
    }
    setInviteSubmitting(true);
    setLastLink(null);
    try {
      const r = await fetch("/api/organization/invites", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, role: inviteRole }),
      });
      const j = (await r.json().catch(() => ({}))) as {
        error?: string;
        inviteUrl?: string;
        emailSent?: boolean;
      };
      if (!r.ok) {
        toast.error(typeof j.error === "string" ? j.error : "Could not create invite");
        return;
      }
      if (j.emailSent === true) {
        toast.success("Invitation sent to email.");
      } else {
        toast.success("Invite created — link copied to clipboard.");
      }
      if (typeof j.inviteUrl === "string") {
        setLastLink(j.inviteUrl);
        if (j.emailSent !== true) {
          try {
            await navigator.clipboard.writeText(j.inviteUrl);
          } catch {
            /* clipboard may be denied */
          }
        }
      }
      setInviteEmail("");
      setInviteOpen(false);
      void loadInvites();
    } catch {
      toast.error("Network error");
    } finally {
      setInviteSubmitting(false);
    }
  }

  const canManageMembers = myRole === "OWNER" || myRole === "ADMIN";

  async function updateMemberRole(memberId: string, role: InviteRole) {
    setMemberActionId(memberId);
    try {
      const r = await fetch(`/api/organization/members/${encodeURIComponent(memberId)}/role`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      });
      const j = (await r.json().catch(() => ({}))) as { error?: string };
      if (!r.ok) {
        toast.error(typeof j.error === "string" ? j.error : "Could not update role");
        return;
      }
      toast.success("Role updated");
      void loadMembers();
    } catch {
      toast.error("Network error");
    } finally {
      setMemberActionId(null);
    }
  }

  async function confirmRemoveMember() {
    if (!removeMemberTarget) return;
    const memberId = removeMemberTarget.memberId;
    setMemberActionId(memberId);
    try {
      const r = await fetch(`/api/organization/members/${encodeURIComponent(memberId)}`, {
        method: "DELETE",
        credentials: "include",
      });
      const j = (await r.json().catch(() => ({}))) as { error?: string };
      if (!r.ok) {
        toast.error(typeof j.error === "string" ? j.error : "Could not remove member");
        return;
      }
      toast.success("Member removed");
      setRemoveMemberTarget(null);
      void loadMembers();
    } catch {
      toast.error("Network error");
    } finally {
      setMemberActionId(null);
    }
  }

  async function revokeInvite(id: string) {
    try {
      const r = await fetch(`/api/organization/invites?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!r.ok) {
        const j = (await r.json().catch(() => ({}))) as { error?: string };
        toast.error(typeof j.error === "string" ? j.error : "Could not revoke");
        return;
      }
      toast.success("Invite revoked");
      void loadInvites();
    } catch {
      toast.error("Network error");
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-[1.75rem] font-bold tracking-tight text-neutral-900">Team</h1>
          <p className="mt-1 text-sm text-neutral-600">
            Workspace members and pending invitations. Owners and admins can invite by email; invitees sign up or sign
            in with the same address.
          </p>
        </div>
        {canManageMembers && (
          <Button type="button" onClick={() => setInviteOpen(true)}>
            Invite member
          </Button>
        )}
      </div>

      {error && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {error}
        </div>
      )}

      {lastLink && (
        <div className="rounded-xl border border-primary/30 bg-primary/5 px-4 py-3 text-sm text-neutral-800">
          <p className="font-medium text-neutral-900">Last invite link</p>
          <p className="mt-1 break-all font-mono text-xs text-neutral-600">{lastLink}</p>
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
        <table className="w-full border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-neutral-200 bg-neutral-50 text-xs font-bold uppercase tracking-wide text-neutral-600">
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3"> </th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <TableSkeletonRows rows={4} cols={4} />
            ) : members.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-neutral-600">
                  No members loaded.
                </td>
              </tr>
            ) : (
              members.map((m) => (
                <tr key={m.memberId} className="border-b border-neutral-100">
                  <td className="px-4 py-3 font-semibold text-neutral-900">{m.name}</td>
                  <td className="px-4 py-3 text-neutral-600">{m.email}</td>
                  <td className="px-4 py-3 text-neutral-700">
                    {canManageMembers && m.role !== "OWNER" ? (
                      <select
                        className="max-w-[8.5rem] rounded-lg border border-neutral-200 bg-white px-2 py-1 text-sm"
                        value={m.role as InviteRole}
                        disabled={
                          memberActionId === m.memberId ||
                          !INVITE_ROLES.includes(m.role as InviteRole)
                        }
                        onChange={(e) => {
                          const v = e.target.value as InviteRole;
                          if (v !== m.role) void updateMemberRole(m.memberId, v);
                        }}
                      >
                        {INVITE_ROLES.map((r) => (
                          <option key={r} value={r}>
                            {roleLabel(r)}
                          </option>
                        ))}
                      </select>
                    ) : (
                      roleLabel(m.role)
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {canManageMembers && m.role !== "OWNER" ? (
                      <Button
                        type="button"
                        variant="secondary"
                        className="!py-1.5 !text-xs"
                        disabled={memberActionId === m.memberId}
                        onClick={() => setRemoveMemberTarget({ memberId: m.memberId, name: m.name })}
                      >
                        {memberActionId === m.memberId ? "…" : "Remove"}
                      </Button>
                    ) : (
                      <span className="text-xs text-neutral-600">—</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm">
        <h2 className="text-sm font-bold text-neutral-900">Pending invites</h2>
        <p className="mt-1 text-xs text-neutral-600">Expires after 14 days. Revoke if you sent the wrong address.</p>
        {invitesLoading ? (
          <p className="mt-4 text-sm text-neutral-600">Loading…</p>
        ) : invites.length === 0 ? (
          <p className="mt-4 text-sm text-neutral-600">No pending invites.</p>
        ) : (
          <ul className="mt-4 divide-y divide-neutral-100">
            {invites.map((inv) => (
              <li key={inv.id} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm">
                <div>
                  <p className="font-medium text-neutral-900">{inv.email}</p>
                  <p className="text-xs text-neutral-600">
                    {roleLabel(inv.role)} · expires {new Date(inv.expiresAt).toLocaleDateString()}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="secondary"
                  className="!py-1.5 !text-xs"
                  onClick={() => void revokeInvite(inv.id)}
                >
                  Revoke
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <ConfirmModal
        isOpen={removeMemberTarget !== null}
        title="Remove member?"
        message={
          removeMemberTarget
            ? `${removeMemberTarget.name} will lose access to this workspace immediately.`
            : ""
        }
        confirmLabel="Remove"
        cancelLabel="Cancel"
        variant="danger"
        isLoading={removeMemberTarget !== null && memberActionId === removeMemberTarget.memberId}
        onConfirm={() => void confirmRemoveMember()}
        onCancel={() => memberActionId !== removeMemberTarget?.memberId && setRemoveMemberTarget(null)}
      />

      <Modal
        open={inviteOpen}
        onClose={() => !inviteSubmitting && setInviteOpen(false)}
        title="Invite member"
      >
        <form className="space-y-4" onSubmit={(e) => void submitInvite(e)}>
          <label className="flex flex-col gap-1 text-xs font-medium text-neutral-600">
            Email
            <input
              type="email"
              required
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="colleague@company.com"
              className="rounded-xl border border-neutral-200 px-3 py-2 text-sm text-neutral-900"
              autoComplete="off"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs font-medium text-neutral-600">
            Role
            <select
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value as InviteRole)}
              className="rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm"
            >
              {INVITE_ROLES.map((r) => (
                <option key={r} value={r}>
                  {roleLabel(r)}
                </option>
              ))}
            </select>
          </label>
          <p className="text-xs text-neutral-600">
            We’ll generate a secure link. Share it with them — they must use this email when signing up or signing in.
          </p>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" disabled={inviteSubmitting} onClick={() => setInviteOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={inviteSubmitting}>
              {inviteSubmitting ? "Creating…" : "Create invite"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
