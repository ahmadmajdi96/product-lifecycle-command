import { createFileRoute, Link } from "@tanstack/react-router";
import { usePlm } from "@/lib/plm-store";
import { LIFECYCLES } from "@/lib/plm-data";
import { PageHeader, Kpi, Panel, Status, Mono, th, td } from "@/components/plm/ui";

export const Route = createFileRoute("/_authenticated/")({
  head: () => ({
    meta: [
      { title: "Command Overview · Cortanex PLM" },
      { name: "description", content: "Engineering command overview: lifecycle status, open changes, and MOS sync health." },
      { property: "og:title", content: "Command Overview · Cortanex PLM" },
      { property: "og:description", content: "Engineering command overview for the Cortanex Manufacturing Operating System." },
    ],
  }),
  component: Overview,
});

function Overview() {
  const items = usePlm((s) => s.items);
  const changes = usePlm((s) => s.changes);
  const docs = usePlm((s) => s.docs);
  const syncs = usePlm((s) => s.syncs);
  const audit = usePlm((s) => s.audit);
  const workOrders = usePlm((s) => s.workOrders);
  const open = changes.filter((c) => c.status !== "RELEASED" && c.status !== "REJECTED");
  const pendingEff = items.filter((i) => i.status === "APPROVED");
  return (
    <div className="space-y-6">
      <PageHeader code="CTRL-00 · CONTROL CENTER" title="Engineering Command Overview" desc="Single source of truth for product definition across MES, CORTA QC and Unified Command Center." />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Kpi label="Active Items" value={items.filter((i) => i.status === "EFFECTIVE").length} sub={`${items.length} total in catalog`} />
        <Kpi label="Open Changes" value={open.length} sub="ECR / ECO in flight" tone="warning" />
        <Kpi label="Pending Effectivity" value={pendingEff.length} sub="Approved, awaiting T_eff" tone="warning" />
        <Kpi label="Docs Checked Out" value={docs.filter((d) => d.checkedOutBy).length} sub="Locked in vault" />
        <Kpi label="Sync Health" value={`${Math.round((syncs.filter((s) => s.status === "ACK").length / Math.max(1, syncs.length)) * 100)}%`} sub="MOS acknowledgements" tone="success" />
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <Panel title="Lifecycle Distribution" code="ITEM MASTER">
          <div className="space-y-2">
            {LIFECYCLES.map((l) => {
              const n = items.filter((i) => i.status === l).length;
              return (
                <div key={l} className="flex items-center gap-3">
                  <div className="w-28"><Status value={l} /></div>
                  <div className="h-2 flex-1 rounded-sm bg-muted"><div className="h-2 rounded-sm bg-primary" style={{ width: `${(n / items.length) * 100}%` }} /></div>
                  <Mono className="w-6 text-right">{n}</Mono>
                </div>
              );
            })}
          </div>
        </Panel>
        <Panel title="Change Queue" code="ECM" className="lg:col-span-2" actions={<Link to="/changes/$kind" params={{ kind: "ecr" }} className="font-mono text-[11px] text-primary">VIEW ALL →</Link>}>
          <table className="w-full text-sm">
            <thead><tr><th className={th}>Number</th><th className={th}>Title</th><th className={th}>Priority</th><th className={th}>CCB</th><th className={th}>Status</th></tr></thead>
            <tbody>
              {open.map((c) => (
                <tr key={c.id} className="border-t border-border">
                  <td className={td}><Mono className="text-primary">{c.number}</Mono></td>
                  <td className={td}>{c.title}</td>
                  <td className={td}><Status value={c.priority} /></td>
                  <td className={td}><Mono>{c.approvals.filter((a) => a.decision === "APPROVED").length}/{c.approvals.length}</Mono></td>
                  <td className={td}><Status value={c.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>
        <Panel title="Active Work Orders" code="MES COMMAND CENTER" className="lg:col-span-2">
          <table className="w-full text-sm">
            <thead><tr><th className={th}>WO</th><th className={th}>Item</th><th className={th}>Line</th><th className={th}>Progress</th></tr></thead>
            <tbody>
              {workOrders.map((w) => (
                <tr key={w.wo} className="border-t border-border">
                  <td className={td}><Mono>{w.wo}</Mono></td><td className={td}><Mono className="text-primary">{w.item}</Mono></td><td className={td}><Mono>{w.line}</Mono></td>
                  <td className={td}><div className="flex items-center gap-2"><div className="h-1.5 w-32 rounded-sm bg-muted"><div className="h-1.5 rounded-sm bg-success" style={{ width: `${(w.done / w.qty) * 100}%` }} /></div><Mono>{w.done}/{w.qty}</Mono></div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>
        <Panel title="Recent Audit Events" code="21 CFR 11">
          <ul className="space-y-2 text-xs">
            {audit.slice(0, 6).map((a) => (
              <li key={a.id} className="border-l-2 border-primary/50 pl-2">
                <div className="font-mono text-[10px] text-muted-foreground">{a.at.slice(0, 16).replace("T", " ")} · {a.user}</div>
                <div><span className="font-mono text-primary">{a.action}</span> {a.entity}</div>
              </li>
            ))}
          </ul>
        </Panel>
      </div>
    </div>
  );
}
