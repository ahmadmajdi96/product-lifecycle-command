import { createContext, useContext, useState, type ReactNode } from "react";
import { usePlm } from "@/lib/plm-store";
import { resolveRecord, type RecordRef } from "@/lib/profile-records";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { FilePreview } from "./file-preview";

const ProfileContext = createContext<((record: RecordRef) => void) | null>(null);
export function RecordLink({ text, children }: { text: string; children?: ReactNode }) {
  const state = usePlm((s) => s);
  const open = useContext(ProfileContext);
  const ref = resolveRecord(state, text);
  return ref && open ? <Button variant="link" className="h-auto max-w-full justify-start whitespace-normal p-0 text-left font-inherit text-inherit" onClick={() => open(ref)}>{children ?? text}</Button> : <>{children ?? text}</>;
}
export function RecordButton({ record, children }: { record: RecordRef; children: ReactNode }) {
  const open = useContext(ProfileContext);
  return <Button variant="link" className="h-auto p-0 text-left" onClick={() => open?.(record)}>{children}</Button>;
}
const titles = { items: "Item Profile", boms: "BOM Profile", routings: "Routing Profile", changes: "Engineering Change Profile", docs: "Document Profile", workOrders: "Work Order Profile", workCenters: "Work Center Profile", profiles: "User Profile", syncs: "Integration Event", audit: "Audit Event" };
export function RecordProfiles({ children }: { children: ReactNode }) {
  const state = usePlm((s) => s);
  const [selected, setSelected] = useState<RecordRef | null>(null);
  const record = selected ? state[selected.kind].find((r) => r.id === selected.id) : undefined;
  const data = record as unknown as Record<string, unknown> | undefined;
  const relatedCode = typeof data?.["number"] === "string" ? data["number"] : typeof data?.["item"] === "string" ? data["item"] : typeof data?.["root"] === "string" ? data["root"] : undefined;
  const related = relatedCode ? [
    ...state.boms.filter((r) => r.root === relatedCode).map((r) => ({ kind: "boms" as const, id: r.id, label: `${r.kind} Rev ${r.rev}` })),
    ...state.routings.filter((r) => r.item === relatedCode).map((r) => ({ kind: "routings" as const, id: r.id, label: `${r.number} Rev ${r.rev}` })),
    ...state.docs.filter((r) => r.linkedItem === relatedCode).map((r) => ({ kind: "docs" as const, id: r.id, label: r.number })),
    ...state.workOrders.filter((r) => r.item === relatedCode).map((r) => ({ kind: "workOrders" as const, id: r.id, label: r.wo })),
    ...state.changes.filter((r) => r.affected.includes(relatedCode)).map((r) => ({ kind: "changes" as const, id: r.id, label: r.number })),
  ] : [];
  const doc = selected?.kind === "docs" ? state.docs.find((d) => d.id === selected.id) : undefined;
  return <ProfileContext.Provider value={setSelected}>{children}<Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}><DialogContent className="max-h-[85vh] max-w-3xl overflow-y-auto"><DialogHeader><DialogTitle>{selected ? titles[selected.kind] : "Profile"} · {String(data?.["number"] ?? data?.["wo"] ?? data?.["code"] ?? data?.["fullName"] ?? "")}</DialogTitle></DialogHeader>
    {data ? <><dl className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">{Object.entries(data).filter(([key, v]) => !["id", "filePath"].includes(key) && v != null && !Array.isArray(v)).map(([key, v]) => <div key={key} className="min-w-0 border-b border-border pb-2"><dt className="font-mono text-[10px] uppercase text-muted-foreground">{key.replace(/([A-Z])/g, " $1")}</dt><dd className="mt-1 break-words text-sm"><RecordLink text={String(v)} /></dd></div>)}</dl>
    {Object.entries(data).filter(([, v]) => Array.isArray(v)).map(([key, value]) => <section key={key} className="space-y-2"><h3 className="text-sm font-semibold uppercase">{key}</h3>{(value as unknown[]).map((v, i) => <div key={i} className="flex flex-wrap gap-x-4 gap-y-1 border-b border-border py-2 text-xs">{typeof v === "object" && v ? Object.entries(v).map(([k, x]) => <span key={k}><span className="text-muted-foreground">{k}: </span><RecordLink text={String(x)} /></span>) : <RecordLink text={String(v)} />}</div>)}</section>)}
    {selected?.kind === "profiles" && <div className="text-sm"><span className="text-muted-foreground">Local roles: </span>{state.roles.filter((r) => r.userId === selected.id).map((r) => r.role).join(", ") || "None"}</div>}
    {doc && <FilePreview doc={doc} />}
    {!!related.length && <section><h3 className="mb-2 text-sm font-semibold uppercase">Related Records</h3><div className="flex flex-wrap gap-3">{related.filter((r) => r.kind !== selected?.kind || r.id !== selected.id).map((r) => <RecordButton key={`${r.kind}-${r.id}`} record={r}>{r.label}</RecordButton>)}</div></section>}</> : <p className="text-muted-foreground">Record no longer available.</p>}
  </DialogContent></Dialog></ProfileContext.Provider>;
}