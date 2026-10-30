import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Plus, ChevronRight, GitBranch } from "lucide-react";
import { usePlm, update, audit, uid, nextRev } from "@/lib/plm-store";
import { ITEM_TYPES, LIFECYCLES, NEXT_STATE, type Item, type ItemType } from "@/lib/plm-data";
import { PageHeader, Status, Mono, th, td, ESignDialog } from "@/components/plm/ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

export const Route = createFileRoute("/_authenticated/items")({
  head: () => ({
    meta: [
      { title: "Item Master · Cortanex PLM" },
      { name: "description", content: "Part catalog with revision control, lifecycle phases and date effectivity." },
      { property: "og:title", content: "Item Master · Cortanex PLM" },
      { property: "og:description", content: "Part catalog with revision control and date effectivity." },
    ],
  }),
  component: Items,
});

function Items() {
  const items = usePlm((s) => s.items);
  const [q, setQ] = useState("");
  const [type, setType] = useState<"ALL" | ItemType>("ALL");
  const [phase, setPhase] = useState("ALL");
  const [creating, setCreating] = useState(false);
  const [signing, setSigning] = useState<Item | null>(null);
  const list = items.filter((i) => (type === "ALL" || i.type === type) && (phase === "ALL" || i.status === phase) && (i.number + i.name).toLowerCase().includes(q.toLowerCase()));

  const promote = (it: Item, meaning: string) => {
    const to = NEXT_STATE[it.status]!;
    update((s) => ({ ...s, items: s.items.map((x) => (x.id === it.id ? { ...x, status: to, effectiveTo: to === "OBSOLETE" ? new Date().toISOString().slice(0, 10) : x.effectiveTo } : x)) }));
    audit("E-SIGN", `${it.number} Rev ${it.rev}`, `${it.status} → ${to} · ${meaning}`, true);
    toast.success(`${it.number} → ${to}`);
  };
  const revise = (it: Item) => {
    const r = nextRev(it.rev);
    update((s) => ({ ...s, items: s.items.map((x) => (x.id === it.id ? { ...x, rev: r, status: "DRAFT" } : x)) }));
    audit("REVISE", it.number, `Rev ${it.rev} → Rev ${r} (DRAFT)`);
    toast(`New revision ${it.number} Rev ${r} created`);
  };

  return (
    <div className="space-y-4">
      <PageHeader code="PD-01 · PRODUCT DEFINITION" title="Item Master & Part Catalog" desc="Raw materials, WIP, finished goods, packaging and tooling — governed by the lifecycle state machine and two-tier date effectivity."
        actions={<Button onClick={() => setCreating(true)}><Plus className="h-4 w-4" />New Item</Button>} />
      <div className="flex flex-wrap gap-2">
        <Input placeholder="Search part number or name…" value={q} onChange={(e) => setQ(e.target.value)} className="w-72" />
        <select value={type} onChange={(e) => setType(e.target.value as never)} className="h-9 rounded-md border border-input bg-background px-2 text-sm">
          <option value="ALL">All types</option>{Object.entries(ITEM_TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <select value={phase} onChange={(e) => setPhase(e.target.value)} className="h-9 rounded-md border border-input bg-background px-2 text-sm">
          <option value="ALL">All phases</option>{LIFECYCLES.map((l) => <option key={l}>{l}</option>)}
        </select>
      </div>
      <div className="overflow-x-auto rounded-md border border-border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted/40"><tr>
            <th className={th}>Part No.</th><th className={th}>Description</th><th className={th}>Type</th><th className={th}>UoM</th><th className={th}>Rev</th><th className={th}>Phase</th><th className={th}>Effective</th><th className={th}>Std Cost</th><th className={th}>Owner</th><th className={th}></th>
          </tr></thead>
          <tbody>
            {list.map((i) => (
              <tr key={i.id} className="border-t border-border hover:bg-accent/30">
                <td className={td}><Mono className="font-semibold text-primary">{i.number}</Mono></td>
                <td className={td}>{i.name}{i.ctq && <div className="font-mono text-[10px] text-warning">CTQ · {i.ctq}</div>}</td>
                <td className={td}><Mono>{i.type}</Mono></td>
                <td className={td}><Mono>{i.uom}</Mono></td>
                <td className={td}><Mono className="rounded-sm bg-secondary px-1.5 py-0.5">{i.rev}</Mono></td>
                <td className={td}><Status value={i.status} /></td>
                <td className={td}><Mono>{i.effectiveFrom}{i.effectiveTo ? ` → ${i.effectiveTo}` : " → ∞"}</Mono></td>
                <td className={td}><Mono>${i.cost.toFixed(2)}</Mono></td>
                <td className={td}>{i.owner}</td>
                <td className={td}>
                  <div className="flex justify-end gap-1">
                    {NEXT_STATE[i.status] && <Button size="sm" variant="outline" className="h-7 font-mono text-[10px]" onClick={() => setSigning(i)}>{NEXT_STATE[i.status]?.replace("_", " ")}<ChevronRight className="h-3 w-3" /></Button>}
                    {(i.status === "EFFECTIVE" || i.status === "APPROVED") && <Button size="sm" variant="ghost" className="h-7" title="Create next revision" onClick={() => revise(i)}><GitBranch className="h-3.5 w-3.5" /></Button>}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <ESignDialog open={!!signing} onOpenChange={(o) => !o && setSigning(null)} title={signing ? `Transition ${signing.number} Rev ${signing.rev} → ${NEXT_STATE[signing.status]}` : ""}
        meaningOptions={["Authored — I am the author", "Reviewed — technically correct", "Approved — released for use"]} onSign={(m) => signing && promote(signing, m)} />
      <NewItem open={creating} onOpenChange={setCreating} />
    </div>
  );
}

function NewItem({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const [f, setF] = useState({ number: "", name: "", type: "RAW" as ItemType, uom: "EA", cost: "0", effectiveFrom: new Date().toISOString().slice(0, 10) });
  const save = () => {
    if (!f.number || !f.name) return toast.error("Part number and name are required");
    const it: Item = { id: uid(), number: f.number.toUpperCase(), name: f.name, type: f.type, uom: f.uom, rev: "A", status: "DRAFT", effectiveFrom: f.effectiveFrom, owner: "A. Salameh", cost: Number(f.cost) || 0 };
    update((s) => ({ ...s, items: [it, ...s.items] }));
    audit("CREATE", `${it.number} Rev A`, "Item created in DRAFT");
    toast.success(`${it.number} created`);
    onOpenChange(false);
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>New Item · Rev A (DRAFT)</DialogTitle></DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <div><Label>Part number</Label><Input className="font-mono" value={f.number} onChange={(e) => setF({ ...f, number: e.target.value })} placeholder="RM-3006" /></div>
          <div><Label>Type</Label><select value={f.type} onChange={(e) => setF({ ...f, type: e.target.value as ItemType })} className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm">{Object.entries(ITEM_TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div>
          <div className="col-span-2"><Label>Description</Label><Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></div>
          <div><Label>UoM</Label><Input className="font-mono" value={f.uom} onChange={(e) => setF({ ...f, uom: e.target.value })} /></div>
          <div><Label>Std cost ($)</Label><Input className="font-mono" type="number" value={f.cost} onChange={(e) => setF({ ...f, cost: e.target.value })} /></div>
          <div className="col-span-2"><Label>Effective from</Label><Input className="font-mono" type="date" value={f.effectiveFrom} onChange={(e) => setF({ ...f, effectiveFrom: e.target.value })} /></div>
        </div>
        <DialogFooter><Button onClick={save}>Create</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
