import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { ChevronDown, ChevronRight, Plus, Trash2, Copy } from "lucide-react";
import { usePlm, update, audit, uid, nextRev } from "@/lib/plm-store";
import { diffBoms, type Bom, type BomLine } from "@/lib/plm-data";
import { PageHeader, Panel, Status, Mono, th, td } from "@/components/plm/ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/bom")({
  head: () => ({
    meta: [
      { title: "BOM Workbench · Cortanex PLM" },
      { name: "description", content: "Multi-level EBOM and MBOM tree with scrap factors and redline revision diff." },
      { property: "og:title", content: "BOM Workbench · Cortanex PLM" },
      { property: "og:description", content: "Multi-level EBOM/MBOM with redline revision comparison." },
    ],
  }),
  component: BomPage,
});

function BomPage() {
  const boms = usePlm((s) => s.boms);
  const items = usePlm((s) => s.items);
  const [sel, setSel] = useState(boms.find((b) => b.status === "EFFECTIVE")?.id ?? boms[0]?.id);
  const bom = boms.find((b) => b.id === sel) ?? boms[0];
  const [cmpA, setCmpA] = useState(boms[0]?.id);
  const [cmpB, setCmpB] = useState(boms[1]?.id);
  const name = (n: string) => items.find((i) => i.number === n);

  const newRev = () => {
    const nb: Bom = { ...bom, id: uid(), rev: nextRev(bom.rev), status: "DRAFT", lines: bom.lines.map((l) => ({ ...l, id: uid() })) };
    update((s) => ({ ...s, boms: [...s.boms, nb] }));
    audit("REVISE", `${bom.root} ${bom.kind}`, `Rev ${bom.rev} → Rev ${nb.rev} (DRAFT)`);
    setSel(nb.id);
    toast.success(`${bom.kind} Rev ${nb.rev} drafted`);
  };
  const editable = bom.status === "DRAFT";

  return (
    <div className="space-y-4">
      <PageHeader code="PD-02 · PRODUCT DEFINITION" title="EBOM / MBOM Workbench" desc="Multi-level structures with parent-child relations, quantity per, scrap factor and redline comparison between revisions." />
      <Tabs defaultValue="tree">
        <TabsList><TabsTrigger value="tree">Structure Tree</TabsTrigger><TabsTrigger value="diff">Redline Diff</TabsTrigger></TabsList>
        <TabsContent value="tree" className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {boms.map((b) => (
              <button key={b.id} onClick={() => setSel(b.id)} className={cn("flex items-center gap-2 rounded-md border px-3 py-1.5 text-left", b.id === bom.id ? "border-primary bg-primary/10" : "border-border bg-card hover:bg-accent/30")}>
                <Mono className="font-semibold">{b.root}</Mono><Mono className="text-muted-foreground">{b.kind} · Rev {b.rev}</Mono><Status value={b.status} />
              </button>
            ))}
          </div>
          <Panel title={`${bom.kind} · ${bom.root} Rev ${bom.rev}`} code={editable ? "EDITABLE" : "LOCKED · release via ECO"}
            actions={<Button size="sm" variant="outline" onClick={newRev}><Copy className="h-3.5 w-3.5" />New Revision</Button>}>
            <table className="w-full text-sm">
              <thead><tr><th className={th}>Structure</th><th className={th}>Find</th><th className={th}>Description</th><th className={th}>Qty/Per</th><th className={th}>Scrap %</th><th className={th}>Ext. Qty</th><th className={th}></th></tr></thead>
              <tbody><Tree bom={bom} parent={bom.root} level={0} mult={1} name={name} editable={editable} /></tbody>
            </table>
            {editable && <AddLine bom={bom} />}
          </Panel>
        </TabsContent>
        <TabsContent value="diff" className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <select value={cmpA} onChange={(e) => setCmpA(e.target.value)} className="h-9 rounded-md border border-input bg-background px-2 font-mono text-xs">{boms.map((b) => <option key={b.id} value={b.id}>{b.root} {b.kind} Rev {b.rev}</option>)}</select>
            <span className="font-mono text-xs text-muted-foreground">→</span>
            <select value={cmpB} onChange={(e) => setCmpB(e.target.value)} className="h-9 rounded-md border border-input bg-background px-2 font-mono text-xs">{boms.map((b) => <option key={b.id} value={b.id}>{b.root} {b.kind} Rev {b.rev}</option>)}</select>
          </div>
          <Diff a={boms.find((b) => b.id === cmpA)!} b={boms.find((b) => b.id === cmpB)!} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Tree({ bom, parent, level, mult, name, editable }: { bom: Bom; parent: string; level: number; mult: number; name: (n: string) => { name: string; rev: string } | undefined; editable: boolean }) {
  const kids = bom.lines.filter((l) => l.parent === parent).sort((a, b) => a.find - b.find);
  return <>{kids.map((l) => <Row key={l.id} l={l} bom={bom} level={level} mult={mult} name={name} editable={editable} />)}</>;
}

function Row({ l, bom, level, mult, name, editable }: { l: BomLine; bom: Bom; level: number; mult: number; name: (n: string) => { name: string; rev: string } | undefined; editable: boolean }) {
  const [open, setOpen] = useState(true);
  const hasKids = bom.lines.some((x) => x.parent === l.child);
  const ext = mult * l.qty * (1 + l.scrap / 100);
  const set = (patch: Partial<BomLine>) => update((s) => ({ ...s, boms: s.boms.map((b) => (b.id === bom.id ? { ...b, lines: b.lines.map((x) => (x.id === l.id ? { ...x, ...patch } : x)) } : b)) }));
  return (
    <>
      <tr className="border-t border-border hover:bg-accent/20">
        <td className={td}>
          <div className="flex items-center" style={{ paddingLeft: level * 20 }}>
            <span className="mr-1 font-mono text-muted-foreground">{level > 0 ? "└" : "├"}</span>
            {hasKids ? <button onClick={() => setOpen(!open)}>{open ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}</button> : <span className="w-3.5" />}
            <Mono className="ml-1 font-semibold text-primary">{l.child}</Mono>
            <Mono className="ml-2 text-muted-foreground">L{level + 1}</Mono>
          </div>
        </td>
        <td className={td}><Mono>{l.find}</Mono></td>
        <td className={td}>{name(l.child)?.name ?? <span className="text-destructive">Unknown item</span>}</td>
        <td className={td}>{editable ? <Input type="number" step="0.01" value={l.qty} onChange={(e) => set({ qty: Number(e.target.value) })} className="h-7 w-20 font-mono text-xs" /> : <Mono>{l.qty}</Mono>}</td>
        <td className={td}>{editable ? <Input type="number" step="0.1" value={l.scrap} onChange={(e) => set({ scrap: Number(e.target.value) })} className="h-7 w-20 font-mono text-xs" /> : <Mono className={l.scrap > 5 ? "text-warning" : ""}>{l.scrap}%</Mono>}</td>
        <td className={td}><Mono>{ext.toFixed(3)}</Mono></td>
        <td className={td}>{editable && <button onClick={() => update((s) => ({ ...s, boms: s.boms.map((b) => (b.id === bom.id ? { ...b, lines: b.lines.filter((x) => x.id !== l.id && x.parent !== l.child) } : b)) }))}><Trash2 className="h-3.5 w-3.5 text-destructive" /></button>}</td>
      </tr>
      {open && hasKids && <Tree bom={bom} parent={l.child} level={level + 1} mult={ext} name={name} editable={editable} />}
    </>
  );
}

function AddLine({ bom }: { bom: Bom }) {
  const items = usePlm((s) => s.items);
  const parents = [bom.root, ...new Set(bom.lines.map((l) => l.child))];
  const [p, setP] = useState(bom.root);
  const [c, setC] = useState("");
  const [qty, setQty] = useState("1");
  const add = () => {
    if (!c || c === p) return toast.error("Choose a valid child item");
    const find = (bom.lines.filter((l) => l.parent === p).length + 1) * 10;
    update((s) => ({ ...s, boms: s.boms.map((b) => (b.id === bom.id ? { ...b, lines: [...b.lines, { id: uid(), parent: p, child: c, qty: Number(qty) || 1, scrap: 0, find }] } : b)) }));
    audit("BOM_EDIT", `${bom.root} ${bom.kind} Rev ${bom.rev}`, `Added ${c} under ${p}`);
  };
  return (
    <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-border pt-3">
      <Mono className="text-muted-foreground">ADD LINE</Mono>
      <select value={p} onChange={(e) => setP(e.target.value)} className="h-8 rounded-md border border-input bg-background px-2 font-mono text-xs">{parents.map((x) => <option key={x}>{x}</option>)}</select>
      <span className="text-muted-foreground">⟶</span>
      <select value={c} onChange={(e) => setC(e.target.value)} className="h-8 rounded-md border border-input bg-background px-2 font-mono text-xs"><option value="">Child item…</option>{items.filter((i) => i.status !== "OBSOLETE").map((i) => <option key={i.id} value={i.number}>{i.number} · {i.name}</option>)}</select>
      <Input value={qty} onChange={(e) => setQty(e.target.value)} className="h-8 w-20 font-mono text-xs" />
      <Button size="sm" onClick={add}><Plus className="h-3.5 w-3.5" />Add</Button>
    </div>
  );
}

function Diff({ a, b }: { a: Bom; b: Bom }) {
  if (!a || !b) return null;
  const rows = diffBoms(a.lines, b.lines).sort((x, y) => x.key.localeCompare(y.key));
  const count = (k: string) => rows.filter((r) => r.kind === k).length;
  const cls = { ADDED: "bg-success/10 border-l-2 border-l-success", REMOVED: "bg-destructive/10 border-l-2 border-l-destructive line-through decoration-destructive/60", CHANGED: "bg-warning/10 border-l-2 border-l-warning", SAME: "" };
  return (
    <Panel title={`Redline · Rev ${a.rev} → Rev ${b.rev}`} code={`+${count("ADDED")} −${count("REMOVED")} Δ${count("CHANGED")}`}>
      <table className="w-full text-sm">
        <thead><tr><th className={th}>Δ</th><th className={th}>Parent</th><th className={th}>Child</th><th className={th}>Qty</th><th className={th}>Scrap %</th></tr></thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.key} className={cn("border-t border-border", cls[r.kind])}>
              <td className={td}><Mono className={cn(r.kind === "ADDED" && "text-success", r.kind === "REMOVED" && "text-destructive", r.kind === "CHANGED" && "text-warning")}>{r.kind}</Mono></td>
              <td className={td}><Mono>{r.parent}</Mono></td>
              <td className={td}><Mono className="text-primary">{r.child}</Mono></td>
              <td className={td}><Mono>{r.kind === "CHANGED" && r.from!.qty !== r.to!.qty ? <><s className="text-destructive">{r.from!.qty}</s> → <b className="text-success">{r.to!.qty}</b></> : (r.to ?? r.from)!.qty}</Mono></td>
              <td className={td}><Mono>{r.kind === "CHANGED" && r.from!.scrap !== r.to!.scrap ? <><s className="text-destructive">{r.from!.scrap}</s> → <b className="text-success">{r.to!.scrap}</b></> : (r.to ?? r.from)!.scrap}</Mono></td>
            </tr>
          ))}
        </tbody>
      </table>
    </Panel>
  );
}
