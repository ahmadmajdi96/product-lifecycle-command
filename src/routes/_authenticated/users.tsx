import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Plus, Pencil, KeyRound, Users } from "lucide-react";
import { usePlm, loadAll, CURRENT_USER_ID } from "@/lib/plm-store";
import { useLocalRoles, useHub } from "@/lib/access";
import { APP_ROLES, type Profile, type AppRole } from "@/lib/plm-data";
import { createUserAccount, resetUserPassword } from "@/lib/admin.functions";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader, Status, th, td } from "@/components/plm/ui";
import { RecordButton } from "@/components/plm/record-profiles";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

export const Route = createFileRoute("/_authenticated/users")({
  head: () => ({ meta: [{ title: "Users & Profiles · Cortanex PLM" }, { name: "description", content: "Engineering team profiles and local access administration for Cortanex PLM." }, { property: "og:title", content: "Users & Profiles · Cortanex PLM" }, { property: "og:description", content: "Cortanex engineering team directory and access controls." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }] }),
  component: UserDirectory,
});

function UserDirectory() {
  const profiles = usePlm((s) => s.profiles);
  const roles = usePlm((s) => s.roles);
  const local = useLocalRoles();
  const hub = useHub();
  const admin = local.includes("admin");
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState<Profile | null>(null);
  const [creating, setCreating] = useState(false);
  const [reset, setReset] = useState<Profile | null>(null);
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [newUser, setNewUser] = useState({ email: "", password: "", fullName: "", jobTitle: "", department: "", role: "viewer" as AppRole });
  const create = useServerFn(createUserAccount);
  const resetPassword = useServerFn(resetUserPassword);
  const run = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    try { await fn(); await loadAll(); toast.success("Saved"); return true; }
    catch (error) { toast.error(error instanceof Error ? error.message : "Could not save"); return false; }
    finally { setBusy(false); }
  };
  return <div className="space-y-4"><PageHeader code="CA-01 · COMMAND ACCESS" title="Users & Profiles" actions={admin && <Button onClick={() => setCreating(true)}><Plus className="h-4 w-4" />New User</Button>} />
    <div className="flex flex-wrap items-center justify-between gap-3"><Input placeholder="Search name, email or department…" value={q} onChange={(e) => setQ(e.target.value)} className="max-w-sm" /><span className="font-mono text-xs text-muted-foreground">{hub.configured && hub.reachable ? "COMMAND ACCESS HUB CONNECTED" : "LOCAL ACCESS · HUB NOT CONNECTED"}</span></div>
    <div className="overflow-x-auto border border-border"><table className="w-full text-sm"><thead className="bg-muted/40"><tr>{["Name", "Email", "Department", "Job Title", "Local Roles", "Status", ""].map((label) => <th key={label} className={th}>{label}</th>)}</tr></thead><tbody>{profiles.filter((p) => `${p.fullName} ${p.email} ${p.department}`.toLowerCase().includes(q.toLowerCase())).map((p) => <tr key={p.id} className="border-t border-border"><td className={td}><RecordButton record={{ kind: "profiles", id: p.id }}>{p.fullName || p.email}</RecordButton></td><td className={td}>{p.email}</td><td className={td}>{p.department || "—"}</td><td className={td}>{p.jobTitle || "—"}</td><td className={td}><div className="flex flex-wrap gap-2">{roles.filter((r) => r.userId === p.id).map((r) => <span key={r.id} className="font-mono text-xs">{r.role}</span>)}</div></td><td className={td}><Status value={p.isActive ? "ACTIVE" : "INACTIVE"} /></td><td className={td}><div className="flex gap-1">{(admin || p.id === CURRENT_USER_ID) && <Button variant="ghost" size="icon" title="Edit profile" aria-label={`Edit ${p.fullName || p.email}`} onClick={() => setEditing({ ...p })}><Pencil className="h-4 w-4" /></Button>}{admin && <Button variant="ghost" size="icon" title="Reset password" onClick={() => { setReset(p); setPassword(""); }}><KeyRound className="h-4 w-4" /></Button>}</div></td></tr>)}</tbody></table>{profiles.length === 0 && <div className="p-8 text-center text-muted-foreground"><Users className="mx-auto mb-2 h-6 w-6" />No users yet.</div>}</div>
    <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}><DialogContent><DialogHeader><DialogTitle>Edit Profile</DialogTitle></DialogHeader>{editing && <div className="space-y-3">{(["fullName", "jobTitle", "department", "phone"] as const).map((key) => <div key={key}><Label>{key.replace(/([A-Z])/g, " $1")}</Label><Input value={editing[key] ?? ""} onChange={(e) => setEditing({ ...editing, [key]: e.target.value })} /></div>)}{admin && <><Label className="flex items-center gap-2"><input type="checkbox" checked={editing.isActive} onChange={(e) => setEditing({ ...editing, isActive: e.target.checked })} />Active account</Label><div className="space-y-2"><Label>Local roles</Label>{APP_ROLES.map((role) => <Label key={role} className="flex items-center gap-2"><input type="checkbox" checked={roles.some((r) => r.userId === editing.id && r.role === role)} disabled={busy} onChange={(e) => { const checked = e.target.checked; void run(async () => { const result = checked ? await supabase.from("user_roles").insert({ user_id: editing.id, role }) : await supabase.from("user_roles").delete().eq("user_id", editing.id).eq("role", role); if (result.error) throw result.error; }); }} />{role}</Label>)}</div></>}</div>}<DialogFooter><Button disabled={busy} onClick={async () => { if (!editing) return; const saved = await run(async () => { const { error } = await supabase.from("profiles").update({ full_name: editing.fullName ?? null, job_title: editing.jobTitle ?? null, department: editing.department ?? null, phone: editing.phone ?? null, ...(admin ? { is_active: editing.isActive } : {}) }).eq("id", editing.id); if (error) throw error; }); if (saved) setEditing(null); }}>Save Profile</Button></DialogFooter></DialogContent></Dialog>
    <Dialog open={creating} onOpenChange={setCreating}><DialogContent><DialogHeader><DialogTitle>New Local User</DialogTitle></DialogHeader><div className="space-y-3">{(["fullName", "email", "password", "jobTitle", "department"] as const).map((key) => <div key={key}><Label>{key.replace(/([A-Z])/g, " $1")}</Label><Input type={key === "password" ? "password" : key === "email" ? "email" : "text"} value={newUser[key]} onChange={(e) => setNewUser({ ...newUser, [key]: e.target.value })} /></div>)}<Label>Local role</Label><select className="h-9 w-full border border-input bg-background px-2" value={newUser.role} onChange={(e) => setNewUser({ ...newUser, role: e.target.value as AppRole })}>{APP_ROLES.map((r) => <option key={r}>{r}</option>)}</select></div><DialogFooter><Button disabled={busy} onClick={async () => { if (await run(() => create({ data: newUser }))) setCreating(false); }}>Create User</Button></DialogFooter></DialogContent></Dialog>
    <Dialog open={!!reset} onOpenChange={(o) => !o && setReset(null)}><DialogContent><DialogHeader><DialogTitle>Reset Password · {reset?.fullName}</DialogTitle></DialogHeader><Input type="password" placeholder="New password" value={password} onChange={(e) => setPassword(e.target.value)} /><DialogFooter><Button disabled={busy || password.length < 8} onClick={async () => { if (reset && await run(() => resetPassword({ data: { userId: reset.id, password } }))) { setReset(null); setPassword(""); } }}>Reset Password</Button></DialogFooter></DialogContent></Dialog>
  </div>;
}