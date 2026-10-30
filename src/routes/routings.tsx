import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Plus, Trash2, FileText } from "lucide-react";
import { usePlm, update, audit, uid, nextRev } from "@/lib/plm-store";
import { WORK_CENTERS, type Routing, type Operation } from "@/lib/plm-data";
import { PageHeader, Panel, Status, Mono, th, td, Kpi } from "@/components/plm/ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/routings")({
  head: () => ({
    meta: [
      { title: "Routings · Cortanex PLM" },
      { name: "description", content: "Standard and rework routings with work centers, setup and cycle times, linked SOPs." },
      { property: "og:title", content: "Routings · Cortanex PLM" },
      { property: "og:description", content: "Digital routings and operation sequences." },
    ],
  }),
  component: Routings,
});

function Routings() {
  const routings = usePlm((s) => s.routings);
  const docs = usePlm((s) => s.docs);
  const [sel, setSel] = useState(routings[0]?.id);
  const r = routings.find((x) => x.id === sel) ?? routings[0];
  const editable = r.status === "DRAFT";
  const setOps = (ops: Operation[]) => update((s) => ({ ...s, routings: s.routings.map((x) => (x.id === r.id ? { ...x, ops } : x)) }));
  const setOp = (seq: number, p: Partial<Operation>) => setOps(r.ops.map((o) => (o.seq === seq ? { ...o, ...p } : o)));
  const totalSetup = r.ops.reduce((s, o) => s + o.setupMin, 0);
  const totalCycle = r.ops.reduce((s, o) => s + o.cycleSec, 0);

  const newRev = () => {
    const nr: Routing = { ...r, id: uid(), rev: nextRev(r.rev), status: "DRAFT", ops: r.ops.map((o) => ({ ...o })) };
    update((s) => ({ ...s, routings: [...s.routings, nr] }));
    audit("REVISE", r.number, `Rev ${r.rev} → Rev ${nr.rev} (DRAFT)`);
    setSel(nr.id);
    toast.success(`${r.number} Rev ${nr.rev} drafted`);
  };

  return (
    <div className="space-y-4">
      <PageHeader code="PD-03 · PRODUCT DEFINITION" title="Digital Routings & Operation Sequencer" desc="Standard and rework routings mapped to work centers with setup/cycle standards and linked SOPs / work instructions." />
      <div className="flex flex-wrap gap-2">
        {routings.map((x) => (
          <button key={x.id} onClick={() => setSel(x.id)} className={cn("flex items-center gap-2 rounded-md border px-3 py-1.5", x.id === r.id ? "border-primary bg-primary/10" : "border-border bg-card hover:bg-accent/30")}>
            <Mono className="font-semibold">{x.number}</Mono><Mono className={x.kind === "REWORK" ? "text-warning" : "text-muted-foreground"}>{x.kind} · Rev {x.rev}</Mono><Status value={x.status} />
          </button>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Kpi label="Operations" value={r.ops.length} />
        <Kpi label="Total Setup" value={`${totalSetup}m`} />
        <Kpi label="Cycle / Unit" value={`${(totalCycle / 60).toFixed(1)}m`} />
        <Kpi label="Units / 8h Shift" value={Math.floor((480 - totalSetup) / (totalCycle / 60))} tone="success" />
      </div>
      <Panel title={`${r.number} · ${r.item} Rev ${r.rev}`} code={editable ? "EDITABLE" : "LOCKED · release via ECO"} actions={<Button size="sm" variant="outline" onClick={newRev}>New Revision</Button>}>
        <div className="mb-4 flex items-center gap-1 overflow-x-auto pb-1">
          {r.ops.map((o, i) => (
            <div key={o.seq} className="flex items-center">
              <div className="min-w-36 rounded-sm border border-primary/40 bg-primary/5 px-3 py-2">
                <Mono className="text-primary">OP {o.seq}</Mono>
                <div className="truncate text-xs">{o.name}</div>
                <Mono className="text-[10px] text-muted-foreground">{o.workCenter}</Mono>
              </div>
              {i < r.ops.length - 1 && <div className="h-px w-6 bg-primary/60" />}
            </div>
          ))}
        </div>
        <table className="w-full text-sm">
          <thead><tr><th className={th}>Seq</th><th className={th}>Operation</th><th className={th}>Work Center</th><th className={th}>Setup (min)</th><th className={th}>Cycle (sec)</th><th className={th}>Linked SOP / WI</th><th className={th}></th></tr></thead>
          <tbody>
            {r.ops.map((o) => {
              const doc = docs.find((d) => d.number === o.sop);
              return (
                <tr key={o.seq} className="border-t border-border">
                  <td className={td}><Mono className="text-primary">{o.seq}</Mono></td>
                  <td className={td}>{editable ? <Input value={o.name} onChange={(e) => setOp(o.seq, { name: e.target.value })} className="h-7 text-xs" /> : o.name}</td>
                  <td className={td}>{editable ? <select value={o.workCenter} onChange={(e) => setOp(o.seq, { workCenter: e.target.value })} className="h-7 rounded-md border border-input bg-background px-1 font-mono text-xs">{WORK_CENTERS.map((w) => <option key={w}>{w}</option>)}</select> : <Mono>{o.workCenter}</Mono>}</td>
                  <td className={td}>{editable ? <Input type="number" value={o.setupMin} onChange={(e) => setOp(o.seq, { setupMin: Number(e.target.value) })} className="h-7 w-20 font-mono text-xs" /> : <Mono>{o.setupMin}</Mono>}</td>
                  <td className={td}>{editable ? <Input type="number" value={o.cycleSec} onChange={(e) => setOp(o.seq, { cycleSec: Number(e.target.value) })} className="h-7 w-20 font-mono text-xs" /> : <Mono>{o.cycleSec}</Mono>}</td>
                  <td className={td}>
                    {editable ? (
                      <select value={o.sop ?? ""} onChange={(e) => setOp(o.seq, { sop: e.target.value || undefined })} className="h-7 rounded-md border border-input bg-background px-1 font-mono text-xs"><option value="">—</option>{docs.filter((d) => d.kind === "SOP" || d.kind === "WI").map((d) => <option key={d.id}>{d.number}</option>)}</select>
                    ) : o.sop ? (
                      <span className="flex items-center gap-1.5"><FileText className="h-3.5 w-3.5 text-primary" /><Mono>{o.sop}</Mono>{doc && <Status value={doc.status} />}</span>
                    ) : <span className="text-muted-foreground">—</span>}
                  </td>
                  <td className={td}>{editable && <button onClick={() => setOps(r.ops.filter((x) => x.seq !== o.seq))}><Trash2 className="h-3.5 w-3.5 text-destructive" /></button>}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {editable && <Button size="sm" className="mt-3" onClick={() => setOps([...r.ops, { seq: (r.ops.at(-1)?.seq ?? 0) + 10, name: "New operation", workCenter: WORK_CENTERS[0], setupMin: 0, cycleSec: 60 }])}><Plus className="h-3.5 w-3.5" />Add Operation</Button>}
      </Panel>
    </div>
  );
}
