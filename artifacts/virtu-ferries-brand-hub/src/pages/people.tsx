import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Users, UserPlus, Trash2, Loader2, ChevronDown,
  Shield, Eye, PenLine, Mail, X, AlertTriangle, Check,
} from "lucide-react";
import { useBrand } from "@/lib/brand";
import { cn } from "@/lib/utils";

const API = import.meta.env.BASE_URL.replace(/\/$/, "");

type Role = "viewer" | "editor" | "admin";

type BrandUser = {
  user_id: string;
  brand_id: number;
  role: Role;
  granted_at: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  profileImageUrl: string | null;
};

type AllowedEmail = {
  email: string;
  addedBy: string | null;
  note: string | null;
  addedAt: string;
};

const ROLE_CONFIG: Record<Role, { label: string; Icon: React.ElementType; chip: string; dot: string }> = {
  viewer: {
    label: "Viewer",
    Icon: Eye,
    chip: "bg-[#F4F4F5] text-[#52525B]",
    dot: "bg-[#A1A1AA]",
  },
  editor: {
    label: "Editor",
    Icon: PenLine,
    chip: "bg-[#EFF6FF] text-[#1D4ED8]",
    dot: "bg-[#3B82F6]",
  },
  admin: {
    label: "Admin",
    Icon: Shield,
    chip: "bg-[#F0FDF4] text-[#15803D]",
    dot: "bg-[#22C55E]",
  },
};

function initials(u: BrandUser): string {
  const f = (u.firstName ?? "").trim();
  const l = (u.lastName ?? "").trim();
  if (f && l) return (f[0]! + l[0]!).toUpperCase();
  if (f) return f.slice(0, 2).toUpperCase();
  return (u.email ?? "?").slice(0, 2).toUpperCase();
}

const BG_COLORS = [
  "bg-[#3B82F6]", "bg-[#8B5CF6]", "bg-[#EC4899]",
  "bg-[#F59E0B]", "bg-[#10B981]", "bg-[#EF4444]",
];
function avatarColor(userId: string): string {
  let h = 0;
  for (let i = 0; i < userId.length; i++) h = (h * 31 + userId.charCodeAt(i)) >>> 0;
  return BG_COLORS[h % BG_COLORS.length]!;
}

function displayName(u: BrandUser): string {
  const f = (u.firstName ?? "").trim();
  const l = (u.lastName ?? "").trim();
  if (f || l) return [f, l].filter(Boolean).join(" ");
  return u.email ?? u.user_id;
}

function RolePill({ role }: { role: Role }) {
  const cfg = ROLE_CONFIG[role];
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full", cfg.chip)}>
      <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", cfg.dot)} />
      {cfg.label}
    </span>
  );
}

function RoleDropdown({
  current,
  onChange,
  disabled,
}: {
  current: Role;
  onChange: (r: Role) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);

  const cfg = ROLE_CONFIG[current];
  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen(v => !v)}
        className={cn(
          "inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full transition-opacity",
          cfg.chip,
          disabled ? "opacity-50 cursor-not-allowed" : "hover:opacity-80 cursor-pointer",
        )}
      >
        <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", cfg.dot)} />
        {cfg.label}
        {!disabled && <ChevronDown className="w-3 h-3 ml-0.5 opacity-60" />}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.97 }}
            transition={{ duration: 0.1 }}
            className="absolute left-0 top-full mt-1 z-50 bg-white border border-[#E4E4E7] rounded-xl shadow-lg py-1.5 min-w-[140px]"
          >
            {(["viewer", "editor", "admin"] as Role[]).map(r => {
              const rc = ROLE_CONFIG[r];
              return (
                <button
                  key={r}
                  type="button"
                  onClick={() => { setOpen(false); if (r !== current) onChange(r); }}
                  className={cn(
                    "w-full flex items-center gap-2.5 px-3 py-2 text-[12px] font-medium text-left hover:bg-[#F4F4F5] transition-colors",
                    r === current && "bg-[#F4F4F5]",
                  )}
                >
                  <rc.Icon className="w-3.5 h-3.5 text-[#71717A]" />
                  {rc.label}
                  {r === current && <Check className="w-3 h-3 ml-auto text-[#39A15F]" />}
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function People() {
  const { activeBrand } = useBrand();
  const brandId = activeBrand?.id;

  const [users, setUsers] = useState<BrandUser[]>([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [usersError, setUsersError] = useState<string | null>(null);

  const [emails, setEmails] = useState<AllowedEmail[]>([]);
  const [emailsLoading, setEmailsLoading] = useState(true);
  const [emailsError, setEmailsError] = useState<string | null>(null);

  const [newEmail, setNewEmail] = useState("");
  const [newNote, setNewNote] = useState("");
  const [addingEmail, setAddingEmail] = useState(false);
  const [addEmailError, setAddEmailError] = useState<string | null>(null);

  const [roleUpdating, setRoleUpdating] = useState<Record<string, boolean>>({});
  const [revoking, setRevoking] = useState<Record<string, boolean>>({});
  const [removingEmail, setRemovingEmail] = useState<Record<string, boolean>>({});

  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function showToast(msg: string, ok = true) {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ msg, ok });
    toastTimer.current = setTimeout(() => setToast(null), 3000);
  }

  async function loadUsers() {
    if (!brandId) return;
    setUsersLoading(true);
    setUsersError(null);
    try {
      const r = await fetch(`${API}/api/admin/access/brands/${brandId}/users`);
      if (r.status === 403) { setUsersError("You need admin access to manage people."); return; }
      if (!r.ok) throw new Error("Failed to load");
      setUsers(await r.json() as BrandUser[]);
    } catch {
      setUsersError("Could not load team members.");
    } finally {
      setUsersLoading(false);
    }
  }

  async function loadEmails() {
    setEmailsLoading(true);
    setEmailsError(null);
    try {
      const r = await fetch(`${API}/api/admin/allowed-emails`);
      if (r.status === 403) { setEmailsError("Admin access required."); return; }
      if (!r.ok) throw new Error("Failed to load");
      setEmails(await r.json() as AllowedEmail[]);
    } catch {
      setEmailsError("Could not load invite list.");
    } finally {
      setEmailsLoading(false);
    }
  }

  useEffect(() => {
    loadUsers();
    loadEmails();
  }, [brandId]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleRoleChange(userId: string, role: Role) {
    if (!brandId) return;
    setRoleUpdating(p => ({ ...p, [userId]: true }));
    try {
      const r = await fetch(`${API}/api/admin/access/brands/${brandId}/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      });
      if (r.status === 409) {
        showToast("Can't demote the last admin.", false);
        return;
      }
      if (!r.ok) throw new Error();
      setUsers(prev => prev.map(u => u.user_id === userId ? { ...u, role } : u));
      showToast(`Role updated to ${ROLE_CONFIG[role].label}.`);
    } catch {
      showToast("Failed to update role.", false);
    } finally {
      setRoleUpdating(p => ({ ...p, [userId]: false }));
    }
  }

  async function handleRevoke(userId: string) {
    if (!brandId) return;
    setRevoking(p => ({ ...p, [userId]: true }));
    try {
      const r = await fetch(`${API}/api/admin/access/brands/${brandId}/users/${userId}`, {
        method: "DELETE",
      });
      if (r.status === 409) {
        showToast("Can't remove the last admin.", false);
        return;
      }
      if (!r.ok) throw new Error();
      setUsers(prev => prev.filter(u => u.user_id !== userId));
      showToast("Access revoked.");
    } catch {
      showToast("Failed to revoke access.", false);
    } finally {
      setRevoking(p => ({ ...p, [userId]: false }));
    }
  }

  async function handleAddEmail(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = newEmail.trim().toLowerCase();
    if (!trimmed || !trimmed.includes("@")) {
      setAddEmailError("Enter a valid email address.");
      return;
    }
    setAddingEmail(true);
    setAddEmailError(null);
    try {
      const r = await fetch(`${API}/api/admin/allowed-emails`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmed, note: newNote.trim() || undefined }),
      });
      if (!r.ok) {
        const d = await r.json().catch(() => ({})) as { error?: string };
        setAddEmailError(d.error ?? "Failed to add email.");
        return;
      }
      const row = await r.json() as AllowedEmail;
      setEmails(prev => {
        if (prev.find(e => e.email === row.email)) return prev;
        return [...prev, row].sort((a, b) => a.email.localeCompare(b.email));
      });
      setNewEmail("");
      setNewNote("");
      showToast(`${trimmed} added to invite list.`);
    } catch {
      setAddEmailError("Failed to add email.");
    } finally {
      setAddingEmail(false);
    }
  }

  async function handleRemoveEmail(email: string) {
    setRemovingEmail(p => ({ ...p, [email]: true }));
    try {
      const r = await fetch(`${API}/api/admin/allowed-emails/${encodeURIComponent(email)}`, {
        method: "DELETE",
      });
      if (!r.ok) throw new Error();
      setEmails(prev => prev.filter(e => e.email !== email));
      showToast(`${email} removed.`);
    } catch {
      showToast("Failed to remove email.", false);
    } finally {
      setRemovingEmail(p => ({ ...p, [email]: false }));
    }
  }

  return (
    <div className="min-h-screen bg-[#F5F5F5]">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-6 md:p-10 max-w-4xl mx-auto space-y-12 pb-24"
      >
        {/* Header */}
        <header className="space-y-4">
          <div className="flex items-center gap-3">
            <Users className="w-6 h-6 text-[#39A15F]" />
            <h1 className="font-extrabold text-4xl md:text-5xl text-[#18181B] tracking-tight">People</h1>
          </div>
          <p className="text-lg text-[#A1A1AA] font-light max-w-2xl">
            Manage who has access to {activeBrand?.name ?? "this brand"} and control what they can do.
          </p>
        </header>

        {/* ── Brand Access ──────────────────────────────────────────── */}
        <section className="space-y-6">
          <div className="border-b border-[#E4E4E7] pb-4">
            <h2 className="text-xl font-extrabold text-[#18181B]">Brand Access</h2>
            <p className="text-sm text-[#71717A] font-light mt-1">
              People who can currently access {activeBrand?.name ?? "this brand"}. Change their role or remove them at any time.
            </p>
          </div>

          {usersLoading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="w-7 h-7 text-[#39A15F] animate-spin" />
            </div>
          ) : usersError ? (
            <div className="flex items-center gap-3 py-10 px-6 bg-amber-50 border border-amber-200 rounded-2xl text-amber-700">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <p className="text-sm font-medium">{usersError}</p>
            </div>
          ) : users.length === 0 ? (
            <div className="text-center py-16 bg-white border border-[#E4E4E7] rounded-2xl">
              <Users className="w-8 h-8 text-[#E4E4E7] mx-auto mb-3" />
              <p className="text-[#71717A] text-sm">No one has access yet.</p>
            </div>
          ) : (
            <div className="bg-white border border-[#E4E4E7] rounded-2xl overflow-hidden shadow-sm divide-y divide-[#F4F4F5]">
              {users.map(u => (
                <div key={u.user_id} className="flex items-center gap-4 px-5 py-4">
                  {/* Avatar */}
                  {u.profileImageUrl ? (
                    <img
                      src={u.profileImageUrl}
                      alt=""
                      className="w-9 h-9 rounded-full shrink-0 object-cover"
                    />
                  ) : (
                    <div className={cn(
                      "w-9 h-9 rounded-full flex items-center justify-center shrink-0",
                      "text-white text-[12px] font-bold",
                      avatarColor(u.user_id),
                    )}>
                      {initials(u)}
                    </div>
                  )}
                  {/* Name + email */}
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-semibold text-[#18181B] truncate">{displayName(u)}</p>
                    {u.email && (
                      <p className="text-[11px] text-[#71717A] truncate mt-0.5">{u.email}</p>
                    )}
                  </div>
                  {/* Role dropdown */}
                  <RoleDropdown
                    current={u.role}
                    onChange={r => handleRoleChange(u.user_id, r)}
                    disabled={!!roleUpdating[u.user_id]}
                  />
                  {/* Revoke */}
                  <button
                    type="button"
                    onClick={() => handleRevoke(u.user_id)}
                    disabled={!!revoking[u.user_id]}
                    className="ml-1 p-1.5 rounded-lg text-[#A1A1AA] hover:text-[#EF4444] hover:bg-[#FEF2F2] transition-colors disabled:opacity-40"
                    title="Remove access"
                  >
                    {revoking[u.user_id] ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Role legend */}
          {!usersError && (
            <div className="flex flex-wrap gap-3 text-[11px] text-[#71717A]">
              {(["viewer", "editor", "admin"] as Role[]).map(r => {
                const cfg = ROLE_CONFIG[r];
                return (
                  <div key={r} className="flex items-center gap-1.5">
                    <RolePill role={r} />
                    <span>
                      {r === "viewer" && "— view content only"}
                      {r === "editor" && "— create & edit content"}
                      {r === "admin" && "— full access + manage people"}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* ── Invite List ───────────────────────────────────────────── */}
        <section className="space-y-6">
          <div className="border-b border-[#E4E4E7] pb-4">
            <h2 className="text-xl font-extrabold text-[#18181B]">Invite List</h2>
            <p className="text-sm text-[#71717A] font-light mt-1">
              Emails added here can sign in to the Brand Hub. Once they've signed in, you can grant them brand access above.
            </p>
          </div>

          {/* Add email form */}
          <form onSubmit={handleAddEmail} className="bg-white border border-[#E4E4E7] rounded-2xl p-5 shadow-sm space-y-4">
            <p className="text-[13px] font-semibold text-[#18181B] flex items-center gap-2">
              <UserPlus className="w-4 h-4 text-[#39A15F]" />
              Add someone new
            </p>
            <div className="flex gap-3 flex-wrap sm:flex-nowrap">
              <div className="flex-1 min-w-0">
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#A1A1AA]" />
                  <input
                    type="email"
                    value={newEmail}
                    onChange={e => { setNewEmail(e.target.value); setAddEmailError(null); }}
                    placeholder="their@email.com"
                    className="w-full pl-9 pr-3 py-2.5 text-[13px] border border-[#E4E4E7] rounded-xl bg-[#FAFAFA] focus:outline-none focus:ring-2 focus:ring-[#39A15F]/30 focus:border-[#39A15F] transition-colors"
                  />
                </div>
              </div>
              <div className="flex-1 min-w-0 sm:max-w-[200px]">
                <input
                  type="text"
                  value={newNote}
                  onChange={e => setNewNote(e.target.value)}
                  placeholder="Note (optional)"
                  className="w-full px-3 py-2.5 text-[13px] border border-[#E4E4E7] rounded-xl bg-[#FAFAFA] focus:outline-none focus:ring-2 focus:ring-[#39A15F]/30 focus:border-[#39A15F] transition-colors"
                />
              </div>
              <button
                type="submit"
                disabled={addingEmail || !newEmail.trim()}
                className="shrink-0 inline-flex items-center gap-2 px-5 py-2.5 text-[13px] font-semibold bg-[#39A15F] text-white rounded-xl hover:bg-[#2E8A4F] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {addingEmail ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
                Add
              </button>
            </div>
            {addEmailError && (
              <p className="text-[12px] text-[#EF4444] flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5" />
                {addEmailError}
              </p>
            )}
          </form>

          {/* Email list */}
          {emailsLoading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="w-6 h-6 text-[#39A15F] animate-spin" />
            </div>
          ) : emailsError ? (
            <div className="flex items-center gap-3 py-6 px-5 bg-amber-50 border border-amber-200 rounded-2xl text-amber-700">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <p className="text-sm font-medium">{emailsError}</p>
            </div>
          ) : emails.length === 0 ? (
            <div className="text-center py-12 bg-white border border-[#E4E4E7] rounded-2xl">
              <Mail className="w-7 h-7 text-[#E4E4E7] mx-auto mb-3" />
              <p className="text-[#71717A] text-sm">No invites sent yet.</p>
            </div>
          ) : (
            <div className="bg-white border border-[#E4E4E7] rounded-2xl overflow-hidden shadow-sm divide-y divide-[#F4F4F5]">
              {emails.map(entry => (
                <div key={entry.email} className="flex items-center gap-4 px-5 py-3.5">
                  <Mail className="w-4 h-4 text-[#A1A1AA] shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-medium text-[#18181B] truncate">{entry.email}</p>
                    {entry.note && (
                      <p className="text-[11px] text-[#A1A1AA] truncate mt-0.5">{entry.note}</p>
                    )}
                  </div>
                  <span className="text-[11px] text-[#A1A1AA] shrink-0 hidden sm:block">
                    {new Date(entry.addedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleRemoveEmail(entry.email)}
                    disabled={!!removingEmail[entry.email]}
                    className="p-1.5 rounded-lg text-[#A1A1AA] hover:text-[#EF4444] hover:bg-[#FEF2F2] transition-colors disabled:opacity-40"
                    title="Remove from invite list"
                  >
                    {removingEmail[entry.email] ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <X className="w-4 h-4" />
                    )}
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      </motion.div>

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
            className={cn(
              "fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-lg text-[13px] font-medium text-white",
              toast.ok ? "bg-[#18181B]" : "bg-[#EF4444]",
            )}
          >
            {toast.ok ? <Check className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
            {toast.msg}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
