import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { ShieldCheck } from "lucide-react";
import { usePlm } from "@/lib/plm-store";
import { PageHeader, Mono, th, td } from "@/components/plm/ui";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/_authenticated/audit")({
  head: () => ({
    meta: [
      { title: "Audit Trail · Cortanex PLM" },
      { name: "description", content: "Immutable 21 CFR Part 11 audit trail of PLM actions and electronic signatures." },
      { property: "og:title", content: "Audit Trail · Cortanex PLM" },
      { property: "og:description", content: "21 CFR Part 11 compliant audit log." },
    ],
  }),
  component: Audit,
});

function Audit() {
  const audit = usePlm((s) => s.audit);
  const [q, setQ] = useState("");
  const list = audit.filter((a) => (a.action + a.entity + a.user + a.detail).toLowerCase().includes(q.toLowerCase()));
  return (
    <div className="space-y-4">
      <PageHeader code="DV-02 · 21 CFR PART 11" title="Audit Trail & Electronic Signatures" desc="Append-only, time-stamped record of who did what, when, and the meaning of each signature." />
      <Input placeholder="Filter by user, action, entity…" value={q} onChange={(e) => setQ(e.target.value)} className="w-80" />
      <div className="overflow-x-auto rounded-md border border-border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted/40"><tr><th className={th}>Timestamp (UTC)</th><th className={th}>User</th><th className={th}>Action</th><th className={th}>Entity</th><th className={th}>Detail</th><th className={th}>Signature</th></tr></thead>
          <tbody>
            {list.map((a) => (
              <tr key={a.id} className="border-t border-border">
                <td className={td}><Mono>{a.at.slice(0, 19).replace("T", " ")}</Mono></td>
                <td className={td}>{a.user}</td>
                <td className={td}><Mono className="text-primary">{a.action}</Mono></td>
                <td className={td}><Mono>{a.entity}</Mono></td>
                <td className={td}>{a.detail}</td>
                <td className={td}>{a.signature ? <span className="flex items-center gap-1 text-success"><ShieldCheck className="h-3.5 w-3.5" /><Mono>{a.signature}</Mono></span> : <span className="text-muted-foreground">—</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
