import { useEffect, useState } from "react";
import { Download, FileText } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Doc } from "@/lib/plm-data";
import { Button } from "@/components/ui/button";

export function FilePreview({ doc }: { doc: Doc }) {
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    setUrl(""); setError("");
    if (doc.filePath) void supabase.storage.from("controlled-documents").createSignedUrl(doc.filePath, 300).then(({ data, error: err }) => {
      if (active) { setUrl(data?.signedUrl ?? ""); setError(err ? "The file could not be opened." : ""); }
    });
    return () => { active = false; };
  }, [doc.filePath]);
  return <div className="space-y-3">
    <div className="flex items-center justify-between gap-2 text-xs"><span className="font-mono text-muted-foreground">{doc.fileName ?? "No file attached"}</span>{url && <Button asChild variant="outline" size="sm"><a href={url} target="_blank" rel="noopener noreferrer"><Download className="h-4 w-4" />Open file</a></Button>}</div>
    <div className="relative min-h-64 overflow-hidden rounded-sm border border-border bg-secondary">
      {url && doc.mimeType === "application/pdf" ? <iframe title={`${doc.number} preview`} src={url} className="h-[55vh] w-full" /> : url && doc.mimeType?.startsWith("image/") ? <img src={url} alt={doc.title} className="max-h-[55vh] w-full object-contain" /> : <div className="grid min-h-64 place-items-center p-6 text-center text-muted-foreground"><div><FileText className="mx-auto mb-3 h-12 w-12" /><p>{error || (doc.filePath ? url ? "Preview unavailable for this file type." : "Opening file…" : "This sample record has no attached file.")}</p></div></div>}
      <div className="pointer-events-none absolute bottom-0 left-0 right-0 bg-background/90 p-2 text-center font-mono text-xs text-warning">{doc.status === "EFFECTIVE" ? "CONTROLLED COPY" : `${doc.status.replaceAll("_", " ")} · NOT FOR PRODUCTION`} · REV {doc.rev}</div>
    </div>
  </div>;
}