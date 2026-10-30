import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Send, Factory, ShieldCheck, Wrench, Warehouse, CalendarClock, KeyRound } from "lucide-react";
import { usePlm, update, audit, uid } from "@/lib/plm-store";
import type { SyncJob } from "@/lib/plm-data";
import { PageHeader, Panel, Status, Mono, th, td } from "@/components/plm/ui";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/integrations")({
  head: () => ({
    meta: [
      { title: "Integration Hub · Cortanex PLM" },
      { name: "description", content: "Export released BOMs and routings to MES, sync inspection plans with CORTA QC, track tooling in Unified Command Center." },
      { property: "og:title", content: "Integration Hub · Cortanex PLM" },
      { property: "og:description", content: "MOS integration hub for released engineering data." },
    ],
  }),
  component: Hub,
});

const SYSTEMS = [
  { name: "MES Command Center", icon: Factory, role: "Released MBOM, routings, production versions" },
  { name: "CORTA QC", icon: ShieldCheck, role: "CTQ specs & inspection plans · NCR → ECR" },
  { name: "Unified Command Center", icon: Wrench, role: "Tooling & maintenance requirements" },
  { name: "MES Command Central", icon: Warehouse, role: "Material master & inventory exposure" },
  { name: "Production Command Center", icon: CalendarClock, role: "Effectivity-aware scheduling" },
  { name: "Command Access Hub", icon: KeyRound, role: "SSO identity & role claims" },
] as const;

function Hub() {
  const syncs = usePlm((s) => s.syncs);
  const boms = usePlm((s) => s.boms);
  const routings = usePlm((s) => s.routings);
  const items = usePlm((s) => s.items);
  const [payload, setPayload] = useState<string>("");

  const push = (target: SyncJob["target"], kind: string, entity: string, body: object) => {
    const job: SyncJob = { id: uid(), target, payload: kind, entity, status: "SENT", at: new Date().toISOString() };
    update((s) => ({ ...s, syncs: [job, ...s.syncs] }));
    audit("SYNC", entity, `${kind} → ${target}`);
    setPayload(JSON.stringify({ event: kind, target, sent_at: job.at, data: body }, null, 2));
    toast.success(`${kind} sent to ${target}`);
    setTimeout(() => update((s) => ({ ...s, syncs: s.syncs.map((x) => (x.id === job.id ? { ...x, status: "ACK" } : x)) })), 1200);
  };
  const ackQueued = () => update((s) => ({ ...s, syncs: s.syncs.map((x) => (x.status === "QUEUED" ? { ...x, status: "ACK" } : x)) }));

  const releasedBoms = boms.filter((b) => b.status === "EFFECTIVE" && b.kind === "MBOM");
  const releasedRts = routings.filter((r) => r.status === "EFFECTIVE");
  const ctqItems = items.filter((i) => i.ctq && i.status === "EFFECTIVE");
  const tools = items.filter((i) => i.type === "TOOL");

  return (
    <div className="space-y-4">
      <PageHeader code="SI-01 · SYSTEM INTEGRATIONS" title="MOS Integration Hub" desc="Bi-directional contracts with the Cortanex Manufacturing Operating System. Only EFFECTIVE revisions are eligible for handover." />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        {SYSTEMS.map((s) => {
          const n = syncs.filter((x) => x.target === s.name).length;
          return (
            <div key={s.name} className="rounded-md border border-border bg-card p-3">
              <div className="flex items-center justify-between"><s.icon className="h-5 w-5 text-primary" /><span className="h-2 w-2 rounded-full bg-success" /></div>
              <div className="mt-2 text-sm font-semibold">{s.name}</div>
              <div className="text-[11px] text-muted-foreground">{s.role}</div>
              <Mono className="mt-1 block text-[10px] text-muted-foreground">{n} events</Mono>
            </div>
          );
        })}
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <Panel title="Export to MES Command Center" code="bom.released · routing.released">
          <div className="space-y-2">
            {releasedBoms.map((b) => <Row key={b.id} label={`${b.root} MBOM Rev ${b.rev}`} sub={`${b.lines.length} lines`} onSend={() => push("MES Command Center", "bom.released", `${b.root} MBOM Rev ${b.rev}`, { material: b.root, revision: b.rev, components: b.lines.map((l) => ({ parent: l.parent, component: l.child, qty_per: l.qty, scrap_pct: l.scrap })) })} />)}
            {releasedRts.map((r) => <Row key={r.id} label={`${r.number} Rev ${r.rev}`} sub={`${r.kind} · ${r.ops.length} ops`} onSend={() => push("MES Command Center", "routing.released", `${r.number} Rev ${r.rev}`, { routing: r.number, material: r.item, type: r.kind, operations: r.ops })} />)}
          </div>
        </Panel>
        <Panel title="Sync with CORTA QC" code="inspection_plan.sync">
          <div className="space-y-2">
            {ctqItems.map((i) => <Row key={i.id} label={`${i.number} Rev ${i.rev}`} sub={i.ctq!} onSend={() => push("CORTA QC", "inspection_plan.sync", `${i.number} CTQ`, { material: i.number, revision: i.rev, characteristics: [{ name: i.ctq, sampling: "AQL 1.0", gauge_msa: "required" }] })} />)}
          </div>
        </Panel>
        <Panel title="Tooling → Unified Command Center" code="tooling.requirement">
          <div className="space-y-2">
            {tools.map((t) => <Row key={t.id} label={`${t.number} Rev ${t.rev}`} sub={`${t.name} · ${t.status}`} onSend={() => push("Unified Command Center", "tooling.requirement", `${t.number}`, { tool: t.number, revision: t.rev, description: t.name, pm_interval_cycles: 50000, requalify: t.status !== "EFFECTIVE" })} />)}
          </div>
        </Panel>
      </div>
      <div className="grid gap-4 lg:grid-cols-[1fr_420px]">
        <Panel title="Event Bus Log" code="WEBHOOK OUTBOX" actions={syncs.some((s) => s.status === "QUEUED") && <Button size="sm" variant="outline" onClick={ackQueued}>Flush Queue</Button>}>
          <table className="w-full text-sm">
            <thead><tr><th className={th}>Time</th><th className={th}>Target</th><th className={th}>Event</th><th className={th}>Entity</th><th className={th}>Status</th></tr></thead>
            <tbody>{syncs.slice(0, 15).map((s) => <tr key={s.id} className="border-t border-border"><td className={td}><Mono>{s.at.slice(5, 19).replace("T", " ")}</Mono></td><td className={td}>{s.target}</td><td className={td}><Mono className="text-primary">{s.payload}</Mono></td><td className={td}><Mono>{s.entity}</Mono></td><td className={td}><Status value={s.status} /></td></tr>)}</tbody>
          </table>
        </Panel>
        <Panel title="Last Payload" code="application/json">
          <pre className="max-h-96 overflow-auto rounded-sm bg-background p-3 font-mono text-[11px] text-primary">{payload || "// Send an export to inspect its payload"}</pre>
        </Panel>
      </div>
    </div>
  );
}

function Row({ label, sub, onSend }: { label: string; sub: string; onSend: () => void }) {
  return (
    <div className="flex items-center gap-2 rounded-sm border border-border p-2">
      <div className="min-w-0 flex-1"><Mono className="block font-semibold">{label}</Mono><div className="truncate text-[11px] text-muted-foreground">{sub}</div></div>
      <Button size="sm" variant="outline" className="h-7" onClick={onSend}><Send className="h-3.5 w-3.5" /></Button>
    </div>
  );
}
