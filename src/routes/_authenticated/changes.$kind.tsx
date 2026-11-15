import { createFileRoute, notFound } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Plus, CheckCircle2, XCircle, Clock, ArrowRight, Radio } from "lucide-react";
import { usePlm, update, audit, uid, CURRENT_USER } from "@/lib/plm-store";
import { CCB_ROLES, computeImpact, type Change, type ChangeKind, type Disposition } from "@/lib/plm-data";
import { PageHeader, Panel, Status, Mono, th, td, ESignDialog } from "@/components/plm/ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

const META: Record<string, { kind: ChangeKind; title: string; code: string; desc: string }> = {
  ecr: { kind: "ECR", title: "Engineering Change Requests", code: "ECM-01 · ECR", desc: "Capture problems from engineering, MES issue logs or CORTA QC NCR/CAPA escalations, with automated impact analysis." },
  eco: { kind: "ECO", title: "Engineering Change Orders", code: "ECM-02 · ECO", desc: "Executable change packages approved by the multi-disciplinary Change Control Board with Part 11 signatures." },
  ecn: { kind: "ECN", title: "Engineering Change Notices", code: "ECM-03 · ECN", desc: "Broadcast notices provisioning released master data to MES, CORTA QC and Unified Command Center." },
};

export const Route = createFileRoute("/_authenticated/changes/$kind")({
  loader: ({ params }) => {
    if (!META[params.kind]) throw notFound();
    return META[params.kind];
  },
  head: ({ loaderData }) => ({
    meta: [
      { title: `${loaderData?.title ?? "Engineering Change"} · Cortanex PLM` },
      { name: "description", content: loaderData?.desc ?? "Engineering change management" },
      { property: "og:title", content: `${loaderData?.title ?? "Engineering Change"} · Cortanex PLM` },
      { property: "og:description", content: loaderData?.desc ?? "Engineering change management" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Changes,
});

const DISPOSITIONS: Disposition[] = ["SCRAP", "REWORK", "USE_AS_IS", "RUN_OUT"];

function Changes() {
  const meta = Route.useLoaderData();
  const all = usePlm((s) => s.changes);
  const list = all.filter((c) => c.kind === meta.kind);
  const [sel, setSel] = useState<string | undefined>();
  const [creating, setCreating] = useState(false);
  const c = list.find((x) => x.id === sel) ?? list[0];

  return (
    <div className="space-y-4">
      <PageHeader code={meta.code} title={meta.title} desc={meta.desc} actions={meta.kind === "ECR" && <Button onClick={() => setCreating(true)}><Plus className="h-4 w-4" />Raise ECR</Button>} />
      <div className="grid gap-4 xl:grid-cols-[380px_1fr]">
        <div className="space-y-2">
          {list.length === 0 && <div className="rounded-md border border-dashed border-border p-6 text-center text-sm text-muted-foreground">No {meta.kind}s yet.</div>}
          {list.map((x) => (
            <button key={x.id} onClick={() => setSel(x.id)} className={cn("w-full rounded-md border p-3 text-left", c?.id === x.id ? "border-primary bg-primary/10" : "border-border bg-card hover:bg-accent/30")}>
              <div className="flex items-center justify-between"><Mono className="font-semibold text-primary">{x.number}</Mono><Status value={x.status} /></div>
              <div className="mt-1 text-sm">{x.title}</div>
              <div className="mt-2 flex items-center gap-2"><Status value={x.priority} /><Mono className="text-[10px] text-muted-foreground">{x.origin}</Mono></div>
            </button>
          ))}
        </div>
        {c && <Detail c={c} />}
      </div>
      <NewEcr open={creating} onOpenChange={setCreating} onCreated={setSel} />
    </div>
  );
}

function Detail({ c }: { c: Change }) {
  const [signRole, setSignRole] = useState<string | null>(null);
  const [reject, setReject] = useState(false);
  const all = usePlm((s) => s.changes);
  const workOrders = usePlm((s) => s.workOrders);
  const inventory = usePlm((s) => s.inventory);
  const impact = computeImpact(c.affected, c.disposition, workOrders, inventory);
  const approved = c.approvals.filter((a) => a.decision === "APPROVED").length;
  const set = (p: Partial<Change>) => update((s) => ({ ...s, changes: s.changes.map((x) => (x.id === c.id ? { ...x, ...p } : x)) }));
  const locked = c.status === "RELEASED" || c.status === "REJECTED";

  const sign = (role: string, meaning: string, decision: "APPROVED" | "REJECTED") => {
    const approvals = c.approvals.map((a) => (a.role === role ? { ...a, decision, at: new Date().toISOString(), meaning, user: CURRENT_USER } : a));
    const allOk = approvals.every((a) => a.decision === "APPROVED");
    const status = decision === "REJECTED" ? "REJECTED" : allOk ? "APPROVED" : "IN_REVIEW";
    set({ approvals, status });
    audit("E-SIGN", c.number, `${decision} as ${role} · ${meaning}`, true);
    toast.success(`${role}: ${decision}`);
    if (allOk) toast.success(`${c.number} fully approved by CCB`);
  };

  const promote = () => {
    const nextKind: ChangeKind = c.kind === "ECR" ? "ECO" : "ECN";
    const count = all.filter((x) => x.kind === nextKind).length + 30;
    const nc: Change = {
      ...c, id: uid(), kind: nextKind, number: `${nextKind}-2026-${String(count).padStart(4, "0")}`, parent: c.number, status: nextKind === "ECN" ? "RELEASED" : "IN_REVIEW",
      createdAt: new Date().toISOString().slice(0, 10), origin: c.number,
      approvals: nextKind === "ECN" ? c.approvals : CCB_ROLES.map((role) => ({ role, user: "—", decision: "PENDING" as const })),
      title: nextKind === "ECN" ? `Notice: ${c.title}` : c.title,
    };
    update((s) => ({
      ...s,
      changes: [nc, ...s.changes.map((x) => (x.id === c.id ? { ...x, status: "RELEASED" as const } : x))],
      syncs: nextKind === "ECN" ? [
        ...(["MES Command Center", "CORTA QC", "Unified Command Center"] as const).map((t) => ({ id: uid(), target: t, payload: "plm.ecn.released", entity: `${nc.number} · ${c.affected.join(", ")}`, status: "QUEUED" as const, at: new Date().toISOString() })),
        ...s.syncs] : s.syncs,
    }));
    audit(nextKind === "ECN" ? "ECN_BROADCAST" : "ECO_CREATED", nc.number, `Generated from ${c.number}`);
    toast.success(`${nc.number} generated`);
  };

  return (
    <div className="space-y-4">
      <Panel title={c.number} code={`${c.category} · raised ${c.createdAt}${c.parent ? ` · from ${c.parent}` : ""}`} actions={<Status value={c.status} />}>
        <h3 className="text-lg font-semibold">{c.title}</h3>
        <div className="mt-3 grid gap-4 md:grid-cols-2">
          <div><div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Problem statement</div><p className="mt-1 text-sm">{c.problem}</p></div>
          <div><div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Proposed solution</div><p className="mt-1 text-sm">{c.solution}</p></div>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2"><span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Affected</span>{c.affected.map((a) => <Mono key={a} className="rounded-sm bg-secondary px-1.5 py-0.5 text-primary">{a}</Mono>)}</div>
      </Panel>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Downstream Impact Analysis" code="MOS LIVE QUERY">
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="rounded-sm border border-border p-2"><div className="font-mono text-2xl font-bold text-warning">{impact.wos.length}</div><div className="font-mono text-[10px] text-muted-foreground">OPEN WOs</div></div>
            <div className="rounded-sm border border-border p-2"><div className="font-mono text-2xl font-bold text-warning">{impact.wip}</div><div className="font-mono text-[10px] text-muted-foreground">WIP UNITS</div></div>
            <div className="rounded-sm border border-border p-2"><div className="font-mono text-2xl font-bold text-primary">{impact.inv.toLocaleString()}</div><div className="font-mono text-[10px] text-muted-foreground">ON-HAND</div></div>
          </div>
          {impact.wos.length > 0 && (
            <table className="mt-3 w-full text-xs"><tbody>{impact.wos.map((w) => <tr key={w.wo} className="border-t border-border"><td className="py-1.5"><Mono>{w.wo}</Mono></td><td><Mono className="text-primary">{w.item}</Mono></td><td><Mono>{w.line}</Mono></td><td className="text-right"><Mono className="text-warning">{w.qty - w.done} remaining</Mono></td></tr>)}</tbody></table>
          )}
          <div className="mt-4">
            <Label className="font-mono text-[10px] uppercase tracking-widest">Disposition rule</Label>
            <div className="mt-1 grid grid-cols-4 gap-1">
              {DISPOSITIONS.map((d) => (
                <button key={d} disabled={locked} onClick={() => { set({ disposition: d }); audit("DISPOSITION", c.number, `Set to ${d}`); }}
                  className={cn("rounded-sm border px-2 py-1.5 font-mono text-[10px] font-semibold", c.disposition === d ? "border-warning bg-warning/15 text-warning" : "border-border text-muted-foreground hover:bg-accent/30", locked && "opacity-60")}>{d.replace(/_/g, " ")}</button>
              ))}
            </div>
            <p className="mt-2 text-xs text-muted-foreground">{impact.rule}</p>
          </div>
        </Panel>

        <Panel title="CCB Approval Matrix" code={`${approved}/${c.approvals.length} SIGNED`}>
          <div className="space-y-2">
            {c.approvals.map((a) => (
              <div key={a.role} className="flex items-center gap-3 rounded-sm border border-border p-2">
                {a.decision === "APPROVED" ? <CheckCircle2 className="h-5 w-5 text-success" /> : a.decision === "REJECTED" ? <XCircle className="h-5 w-5 text-destructive" /> : <Clock className="h-5 w-5 text-muted-foreground" />}
                <div className="flex-1">
                  <div className="text-sm font-medium">{a.role}</div>
                  <Mono className="text-[10px] text-muted-foreground">{a.at ? `${a.user} · ${a.at.slice(0, 16).replace("T", " ")} · ${a.meaning}` : "Awaiting signature"}</Mono>
                </div>
                {a.decision === "PENDING" && !locked && (
                  <div className="flex gap-1">
                    <Button size="sm" className="h-7" onClick={() => { setReject(false); setSignRole(a.role); }}>Sign</Button>
                    <Button size="sm" variant="outline" className="h-7" onClick={() => { setReject(true); setSignRole(a.role); }}>Reject</Button>
                  </div>
                )}
              </div>
            ))}
          </div>
          {c.status === "APPROVED" && c.kind !== "ECN" && (
            <Button className="mt-4 w-full" onClick={promote}>{c.kind === "ECR" ? "Convert to ECO" : "Release ECN to MOS"}{c.kind === "ECR" ? <ArrowRight className="h-4 w-4" /> : <Radio className="h-4 w-4" />}</Button>
          )}
        </Panel>
      </div>
      <ESignDialog open={!!signRole} onOpenChange={(o) => !o && setSignRole(null)} title={`${c.number} — ${signRole}`}
        meaningOptions={reject ? ["Rejected — insufficient justification", "Rejected — risk not mitigated"] : ["Approved — reviewed and accept", "Approved — with conditions noted"]}
        onSign={(m) => signRole && sign(signRole, m, reject ? "REJECTED" : "APPROVED")} />
    </div>
  );
}

function NewEcr({ open, onOpenChange, onCreated }: { open: boolean; onOpenChange: (o: boolean) => void; onCreated: (id: string) => void }) {
  const items = usePlm((s) => s.items);
  const all = usePlm((s) => s.changes);
  const [f, setF] = useState({ title: "", category: "Quality Fix", problem: "", solution: "", priority: "MEDIUM" as Change["priority"], origin: "Engineering", affected: [] as string[] });
  const save = () => {
    if (!f.title || f.affected.length === 0) return toast.error("Title and at least one affected item are required");
    const n = all.filter((x) => x.kind === "ECR").length + 58;
    const c: Change = { id: uid(), number: `ECR-2026-${String(n).padStart(4, "0")}`, kind: "ECR", ...f, status: "IN_REVIEW", disposition: "RUN_OUT", createdAt: new Date().toISOString().slice(0, 10), approvals: CCB_ROLES.map((role) => ({ role, user: "—", decision: "PENDING" })) };
    update((s) => ({ ...s, changes: [c, ...s.changes] }));
    audit("ECR_RAISED", c.number, c.title);
    toast.success(`${c.number} raised and routed to CCB`);
    onCreated(c.id);
    onOpenChange(false);
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader><DialogTitle>Raise Engineering Change Request</DialogTitle></DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2"><Label>Title</Label><Input value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} /></div>
          <div><Label>Category</Label><select value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })} className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm">{["Cost Reduction", "Quality Fix", "Supplier Obsolescence", "Safety", "Design Improvement"].map((x) => <option key={x}>{x}</option>)}</select></div>
          <div><Label>Priority</Label><select value={f.priority} onChange={(e) => setF({ ...f, priority: e.target.value as Change["priority"] })} className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm">{["LOW", "MEDIUM", "HIGH", "CRITICAL"].map((x) => <option key={x}>{x}</option>)}</select></div>
          <div className="col-span-2"><Label>Origin</Label><select value={f.origin} onChange={(e) => setF({ ...f, origin: e.target.value })} className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm">{["Engineering", "MES Command Center · Issue log", "CORTA QC · NCR", "CORTA QC · CAPA", "Supplier"].map((x) => <option key={x}>{x}</option>)}</select></div>
          <div className="col-span-2"><Label>Problem statement</Label><Textarea value={f.problem} onChange={(e) => setF({ ...f, problem: e.target.value })} /></div>
          <div className="col-span-2"><Label>Proposed solution</Label><Textarea value={f.solution} onChange={(e) => setF({ ...f, solution: e.target.value })} /></div>
          <div className="col-span-2">
            <Label>Affected items</Label>
            <div className="mt-1 flex max-h-32 flex-wrap gap-1 overflow-y-auto">
              {items.map((i) => {
                const on = f.affected.includes(i.number);
                return <button key={i.id} type="button" onClick={() => setF({ ...f, affected: on ? f.affected.filter((x) => x !== i.number) : [...f.affected, i.number] })} className={cn("rounded-sm border px-1.5 py-0.5 font-mono text-[11px]", on ? "border-primary bg-primary/15 text-primary" : "border-border text-muted-foreground")}>{i.number}</button>;
              })}
            </div>
          </div>
        </div>
        <DialogFooter><Button onClick={save}>Submit to CCB</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
