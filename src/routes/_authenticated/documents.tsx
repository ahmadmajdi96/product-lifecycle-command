import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Lock, Unlock, Eye, FileText, Upload } from "lucide-react";
import { usePlm, update, audit, uid, nextRev, CURRENT_USER } from "@/lib/plm-store";
import { NEXT_STATE, type Doc } from "@/lib/plm-data";
import { PageHeader, Status, Mono, th, td, ESignDialog } from "@/components/plm/ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

export const Route = createFileRoute("/_authenticated/documents")({
  head: () => ({
    meta: [
      { title: "Document Vault · Cortanex PLM" },
      { name: "description", content: "Controlled CAD, drawings and SOPs with checkout locking, watermarked preview and Part 11 signatures." },
      { property: "og:title", content: "Document Vault · Cortanex PLM" },
      { property: "og:description", content: "Controlled document vault with checkout/check-in locking." },
    ],
  }),
  component: Vault,
});

function Vault() {
  const docs = usePlm((s) => s.docs);
  const [preview, setPreview] = useState<Doc | null>(null);
  const [signing, setSigning] = useState<Doc | null>(null);
  const [upload, setUpload] = useState(false);
  const set = (id: string, p: Partial<Doc>) => update((s) => ({ ...s, docs: s.docs.map((d) => (d.id === id ? { ...d, ...p } : d)) }));

  const checkout = (d: Doc) => {
    if (d.checkedOutBy) return toast.error(`Locked by ${d.checkedOutBy}`);
    set(d.id, { checkedOutBy: CURRENT_USER });
    audit("CHECK_OUT", `${d.number} Rev ${d.rev}`, "Locked for editing");
    toast(`${d.number} checked out`);
  };
  const checkin = (d: Doc) => {
    const bump = d.status === "EFFECTIVE" || d.status === "APPROVED";
    const rev = bump ? nextRev(d.rev) : d.rev;
    set(d.id, { checkedOutBy: undefined, rev, status: bump ? "DRAFT" : d.status, updatedAt: new Date().toISOString().slice(0, 10) });
    audit("CHECK_IN", `${d.number} Rev ${rev}`, bump ? `New revision from Rev ${d.rev}` : "Changes committed");
    toast.success(`${d.number} checked in · Rev ${rev}`);
  };

  return (
    <div className="space-y-4">
      <PageHeader code="DV-01 · DOCUMENT VAULT" title="Controlled Document Vault" desc="CAD, drawings, SOPs and work instructions. Exclusive checkout locking, release-status watermarks, and 21 CFR Part 11 audit trail."
        actions={<Button onClick={() => setUpload(true)}><Upload className="h-4 w-4" />Register Document</Button>} />
      <div className="overflow-x-auto rounded-md border border-border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted/40"><tr><th className={th}>Doc No.</th><th className={th}>Title</th><th className={th}>Type</th><th className={th}>Rev</th><th className={th}>Status</th><th className={th}>Linked</th><th className={th}>Lock</th><th className={th}>Updated</th><th className={th}></th></tr></thead>
          <tbody>
            {docs.map((d) => {
              const mine = d.checkedOutBy === CURRENT_USER;
              return (
                <tr key={d.id} className="border-t border-border hover:bg-accent/20">
                  <td className={td}><Mono className="font-semibold text-primary">{d.number}</Mono></td>
                  <td className={td}>{d.title}</td>
                  <td className={td}><Mono>{d.kind}</Mono></td>
                  <td className={td}><Mono className="rounded-sm bg-secondary px-1.5 py-0.5">{d.rev}</Mono></td>
                  <td className={td}><Status value={d.status} /></td>
                  <td className={td}><Mono>{d.linkedItem ?? "—"}</Mono></td>
                  <td className={td}>{d.checkedOutBy ? <span className="flex items-center gap-1 text-warning"><Lock className="h-3.5 w-3.5" /><Mono>{d.checkedOutBy}</Mono></span> : <span className="flex items-center gap-1 text-muted-foreground"><Unlock className="h-3.5 w-3.5" /><Mono>Available</Mono></span>}</td>
                  <td className={td}><Mono>{d.updatedAt}</Mono></td>
                  <td className={td}>
                    <div className="flex justify-end gap-1">
                      <Button size="sm" variant="ghost" className="h-7" onClick={() => { setPreview(d); audit("VIEW", `${d.number} Rev ${d.rev}`, "Controlled copy viewed"); }}><Eye className="h-3.5 w-3.5" /></Button>
                      {mine ? <Button size="sm" className="h-7 text-xs" onClick={() => checkin(d)}>Check In</Button>
                        : <Button size="sm" variant="outline" className="h-7 text-xs" disabled={!!d.checkedOutBy || d.status === "OBSOLETE"} onClick={() => checkout(d)}>Check Out</Button>}
                      {NEXT_STATE[d.status] && !d.checkedOutBy && <Button size="sm" variant="outline" className="h-7 font-mono text-[10px]" onClick={() => setSigning(d)}>→ {NEXT_STATE[d.status]?.replace("_", " ")}</Button>}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <PreviewDialog doc={preview} onClose={() => setPreview(null)} />
      <ESignDialog open={!!signing} onOpenChange={(o) => !o && setSigning(null)} title={signing ? `${signing.number} Rev ${signing.rev} → ${NEXT_STATE[signing.status]}` : ""}
        meaningOptions={["Reviewed — content accurate", "Approved — released for production use"]}
        onSign={(m) => { if (!signing) return; const to = NEXT_STATE[signing.status]!; set(signing.id, { status: to }); audit("E-SIGN", `${signing.number} Rev ${signing.rev}`, `${signing.status} → ${to} · ${m}`, true); toast.success(`${signing.number} → ${to}`); }} />
      <UploadDialog open={upload} onOpenChange={setUpload} />
    </div>
  );
}

function PreviewDialog({ doc, onClose }: { doc: Doc | null; onClose: () => void }) {
  const ts = new Date().toISOString().slice(0, 19).replace("T", " ");
  const controlled = doc?.status === "EFFECTIVE" || doc?.status === "APPROVED";
  return (
    <Dialog open={!!doc} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl">
        <DialogHeader><DialogTitle className="font-mono">{doc?.number} · Rev {doc?.rev} · {doc?.title}</DialogTitle></DialogHeader>
        {doc && (
          <div className="relative aspect-[1.414] overflow-hidden rounded-sm border border-border bg-secondary">
            <div className="absolute inset-4 border-2 border-muted-foreground/40" />
            <div className="absolute inset-8 grid grid-cols-6 grid-rows-4 gap-2 opacity-40">
              {Array.from({ length: 24 }).map((_, i) => <div key={i} className="border border-dashed border-muted-foreground/50" />)}
            </div>
            <div className="absolute inset-0 grid place-items-center"><FileText className="h-20 w-20 text-muted-foreground/40" /></div>
            <div className="pointer-events-none absolute inset-0 grid place-items-center">
              <div className={`-rotate-[25deg] border-4 px-6 py-2 text-center font-mono text-2xl font-bold opacity-60 ${controlled ? "border-success text-success" : "border-destructive text-destructive"}`}>
                {controlled ? "CONTROLLED COPY" : `${doc.status.replace("_", " ")} — NOT FOR PRODUCTION`}
              </div>
            </div>
            <div className="absolute bottom-5 right-5 border border-muted-foreground/50 bg-background/80 p-2 font-mono text-[10px] leading-tight">
              <div>DOC {doc.number}  REV {doc.rev}</div><div>STATUS {doc.status}</div><div>VIEWED BY {CURRENT_USER}</div><div>VALID AS OF {ts} UTC</div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function UploadDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const [f, setF] = useState({ number: "", title: "", kind: "SOP" as Doc["kind"], linkedItem: "", file: "" });
  const save = () => {
    if (!f.number || !f.title) return toast.error("Number and title required");
    const d: Doc = { id: uid(), number: f.number.toUpperCase(), title: f.title, kind: f.kind, rev: "A", status: "DRAFT", linkedItem: f.linkedItem || undefined, sizeKb: 420, updatedAt: new Date().toISOString().slice(0, 10) };
    update((s) => ({ ...s, docs: [d, ...s.docs] }));
    audit("REGISTER", `${d.number} Rev A`, `Document registered${f.file ? ` (${f.file})` : ""}`);
    toast.success(`${d.number} registered`);
    onOpenChange(false);
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Register Controlled Document</DialogTitle></DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <div><Label>Doc number</Label><Input className="font-mono" value={f.number} onChange={(e) => setF({ ...f, number: e.target.value })} placeholder="SOP-150" /></div>
          <div><Label>Type</Label><select value={f.kind} onChange={(e) => setF({ ...f, kind: e.target.value as Doc["kind"] })} className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm">{["CAD", "DRAWING", "SOP", "SPEC", "WI"].map((k) => <option key={k}>{k}</option>)}</select></div>
          <div className="col-span-2"><Label>Title</Label><Input value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} /></div>
          <div><Label>Linked item</Label><Input className="font-mono" value={f.linkedItem} onChange={(e) => setF({ ...f, linkedItem: e.target.value })} placeholder="FG-1000" /></div>
          <div><Label>File</Label><Input type="file" onChange={(e) => setF({ ...f, file: e.target.files?.[0]?.name ?? "" })} /></div>
        </div>
        <DialogFooter><Button onClick={save}>Register</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
