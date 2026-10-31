import { useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import type { Lifecycle } from "@/lib/plm-data";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CURRENT_USER } from "@/lib/plm-store";
import { ShieldCheck } from "lucide-react";
import { RecordLink } from "./record-profiles";
import { useServerFn } from "@tanstack/react-start";
import { verifySignatureIdentity } from "@/lib/signature.functions";
import { toast } from "sonner";

export function PageHeader({ code, title, desc, actions }: { code: string; title: string; desc?: string; actions?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4 border-b border-border pb-4">
      <div>
        <div className="font-mono text-[11px] uppercase tracking-widest text-primary">{code}</div>
        <h1 className="mt-1 text-2xl font-bold tracking-tight">{title}</h1>
        {desc && <p className="mt-1 max-w-3xl text-sm text-muted-foreground">{desc}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

const tone: Record<string, string> = {
  DRAFT: "border-muted-foreground/40 text-muted-foreground",
  UNDER_REVIEW: "border-warning/60 text-warning bg-warning/10",
  IN_REVIEW: "border-warning/60 text-warning bg-warning/10",
  OPEN: "border-muted-foreground/40 text-foreground",
  APPROVED: "border-primary/60 text-primary bg-primary/10",
  EFFECTIVE: "border-success/60 text-success bg-success/10",
  RELEASED: "border-success/60 text-success bg-success/10",
  ACK: "border-success/60 text-success bg-success/10",
  SENT: "border-primary/60 text-primary bg-primary/10",
  QUEUED: "border-warning/60 text-warning bg-warning/10",
  PHASED_OUT: "border-warning/40 text-warning/80",
  OBSOLETE: "border-destructive/50 text-destructive bg-destructive/10",
  REJECTED: "border-destructive/50 text-destructive bg-destructive/10",
  FAILED: "border-destructive/50 text-destructive bg-destructive/10",
  CRITICAL: "border-destructive/50 text-destructive bg-destructive/10",
  HIGH: "border-warning/60 text-warning",
  MEDIUM: "border-primary/50 text-primary",
  LOW: "border-muted-foreground/40 text-muted-foreground",
  PENDING: "border-muted-foreground/40 text-muted-foreground",
};

export function Status({ value }: { value: Lifecycle | string }) {
  return (
    <span className={cn("inline-flex items-center whitespace-nowrap rounded-sm border px-1.5 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wider", tone[value] ?? "border-border")}>
      {String(value).replace("_", " ")}
    </span>
  );
}

export function Mono({ children, className }: { children: ReactNode; className?: string }) {
  return <span className={cn("font-mono text-xs", className)}>{typeof children === "string" ? <RecordLink text={children} /> : children}</span>;
}

export function Panel({ title, code, children, className, actions }: { title: string; code?: string; children: ReactNode; className?: string; actions?: ReactNode }) {
  return (
    <section className={cn("rounded-md border border-border bg-card", className)}>
      <header className="flex items-center justify-between border-b border-border px-4 py-2">
        <div className="flex items-baseline gap-2">
          <h2 className="text-sm font-semibold uppercase tracking-wide">{title}</h2>
          {code && <span className="font-mono text-[10px] text-muted-foreground">{code}</span>}
        </div>
        {actions}
      </header>
      <div className="p-4">{children}</div>
    </section>
  );
}

export function Kpi({ label, value, sub, tone: t = "primary" }: { label: string; value: ReactNode; sub?: string; tone?: "primary" | "warning" | "destructive" | "success" }) {
  const c = { primary: "text-primary", warning: "text-warning", destructive: "text-destructive", success: "text-success" }[t];
  return (
    <div className="rounded-md border border-border bg-card p-4">
      <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className={cn("mt-2 font-mono text-3xl font-bold", c)}>{value}</div>
      {sub && <div className="mt-1 text-xs text-muted-foreground">{sub}</div>}
    </div>
  );
}

export const th = "px-3 py-2 text-left font-mono text-[10px] font-semibold uppercase tracking-wider text-muted-foreground";
export const td = "px-3 py-2 align-middle";

/** Reauthenticate the current identity before committing a signature action. */
export function ESignDialog({ open, onOpenChange, title, meaningOptions, onSign }: {
  open: boolean; onOpenChange: (o: boolean) => void; title: string; meaningOptions: string[]; onSign: (meaning: string) => void;
}) {
  const [pw, setPw] = useState("");
  const [meaning, setMeaning] = useState(meaningOptions[0]);
  const [busy, setBusy] = useState(false);
  const verify = useServerFn(verifySignatureIdentity);
  const commit = async () => {
    setBusy(true);
    try { await verify({ data: { password: pw } }); onSign(meaning); onOpenChange(false); setPw(""); }
    catch (error) { toast.error(error instanceof Error ? error.message : "Identity verification failed"); }
    finally { setBusy(false); }
  };
  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); setPw(""); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-primary" /> Electronic Signature</DialogTitle>
          <DialogDescription>{title} — confirm your identity and the meaning of this signature.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div><Label>Signer</Label><Input value={CURRENT_USER} disabled className="font-mono" /></div>
          <div>
            <Label>Meaning of signature</Label>
            <select value={meaning} onChange={(e) => setMeaning(e.target.value)} className="mt-1 h-9 w-full rounded-md border border-input bg-background px-2 text-sm">
              {meaningOptions.map((m) => <option key={m}>{m}</option>)}
            </select>
          </div>
          <div><Label>Password</Label><Input type="password" autoComplete="current-password" value={pw} onChange={(e) => setPw(e.target.value)} placeholder="Re-enter your account password" /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button disabled={!pw || busy} onClick={commit}>{busy ? "Verifying…" : "Sign & Commit"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
