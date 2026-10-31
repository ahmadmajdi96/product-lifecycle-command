import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Lock, Unlock, Eye, Upload } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { FilePreview } from "@/components/plm/file-preview";
import { RecordButton } from "@/components/plm/record-profiles";
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
                  <td className={td}><RecordButton record={{ kind: "docs", id: d.id }}>{d.title}</RecordButton></td>
                  <td className={td}><Mono>{d.kind}</Mono></td>
                  <td className={td}><Mono className="rounded-sm bg-secondary px-1.5 py-0.5">{d.rev}</Mono></td>
                  <td className={td}><Status value={d.status} /></td>
                  <td className={td}><Mono>{d.linkedItem ?? "—"}</Mono></td>
                  <td className={td}>{d.checkedOutBy ? <span className="flex items-center gap-1 text-warning"><Lock className="h-3.5 w-3.5" /><Mono>{d.checkedOutBy}</Mono></span> : <span className="flex items-center gap-1 text-muted-foreground"><Unlock className="h-3.5 w-3.5" /><Mono>Available</Mono></span>}</td>
                  <td className={td}><Mono>{d.updatedAt}</Mono></td>
                  <td className={td}>
                    <div className="flex justify-end gap-1">
                      <Button size="sm" variant="ghost" className="h-7" title="Preview document" aria-label={`Preview ${d.number}`} onClick={() => { setPreview(d); audit("VIEW", `${d.number} Rev ${d.rev}`, "Controlled copy viewed"); }}><Eye className="h-3.5 w-3.5" /></Button>
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
        onSign={(m) => { if (!signing) return; const to = NEXT_STATE[signing.status]; if (!to) return; set(signing.id, { status: to }); audit("E-SIGN", `${signing.number} Rev ${signing.rev}`, `${signing.status} → ${to} · ${m}`, true); toast.success(`${signing.number} → ${to}`); }} />
      <UploadDialog open={upload} onOpenChange={setUpload} />
    </div>
  );
}

function PreviewDialog({ doc, onClose }: { doc: Doc | null; onClose: () => void }) {
  return (
    <Dialog open={!!doc} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl">
        <DialogHeader><DialogTitle className="font-mono">{doc?.number} · Rev {doc?.rev} · {doc?.title}</DialogTitle></DialogHeader>
        {doc && <FilePreview doc={doc} />}
      </DialogContent>
    </Dialog>
  );
}

function UploadDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const [f, setF] = useState({ number: "", title: "", kind: "SOP" as Doc["kind"], linkedItem: "" });
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const save = async () => {
    if (!f.number || !f.title) return toast.error("Number and title required");
    setBusy(true);
    try {
      const id = uid();
      let filePath: string | undefined;
      if (file) {
        filePath = `${id}/${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
        const { error } = await supabase.storage.from("controlled-documents").upload(filePath, file);
        if (error) throw error;
      }
      const d: Doc = { id, number: f.number.toUpperCase(), title: f.title, kind: f.kind, rev: "A", status: "DRAFT", linkedItem: f.linkedItem || undefined, sizeKb: file ? Math.ceil(file.size / 1024) : 0, updatedAt: new Date().toISOString().slice(0, 10), filePath, fileName: file?.name, mimeType: file?.type };
      const { error } = await supabase.from("docs").insert({ id, number: d.number, title: d.title, kind: d.kind, rev: d.rev, status: d.status, linked_item: d.linkedItem ?? null, size_kb: d.sizeKb, updated_at: d.updatedAt, file_path: filePath ?? null, file_name: file?.name ?? null, mime_type: file?.type ?? null });
      if (error) { if (filePath) await supabase.storage.from("controlled-documents").remove([filePath]); throw error; }
      await import("@/lib/plm-store").then((store) => store.loadAll());
      audit("REGISTER", `${d.number} Rev A`, `Document registered${file ? ` (${file.name})` : ""}`);
      toast.success(`${d.number} registered`); onOpenChange(false);
    } catch (error) { toast.error(error instanceof Error ? error.message : "Document could not be saved"); }
    finally { setBusy(false); }
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
          <div><Label>File</Label><Input type="file" onChange={(e) => setFile(e.target.files?.[0] ?? null)} /></div>
        </div>
        <DialogFooter><Button disabled={busy} onClick={save}>{busy ? "Saving…" : "Register"}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
