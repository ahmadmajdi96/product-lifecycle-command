import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { openControlledFile } from "@/lib/controlled.functions";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
export function ControlledFilePreview({ revisionId, revisionLabel, state }: { revisionId: string; revisionLabel: string; state: string }) {
  const open = useServerFn(openControlledFile);
  const [file, setFile] = useState<{ url: string; mime: string; name: string } | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    void open({ data: { revisionId } }).then((result) => { if (active) setFile(result); }).catch(() => { if (active) setError("File could not be opened in your authorized scope."); });
    return () => { active = false; };
  }, [revisionId, open]);
  return <div className="space-y-3"><div className="flex flex-wrap items-center justify-between gap-3 text-sm"><span>{file?.name ?? "Opening controlled file…"}</span>{file && <Button asChild variant="outline" size="sm"><a href={file.url} target="_blank" rel="noopener noreferrer"><Download />Open file</a></Button>}</div><div className="relative min-h-64 overflow-hidden rounded-lg border border-border bg-secondary">{error ? <p role="alert" className="p-5 text-destructive">{error}</p> : file?.mime === "application/pdf" ? <iframe src={file.url} title="Controlled document preview" className="h-[55vh] w-full" /> : file ? <img src={file.url} alt={file.name} className="max-h-[55vh] w-full object-contain" /> : <p className="p-5 text-muted-foreground">Opening file…</p>}<div className="pointer-events-none absolute inset-x-0 bottom-0 bg-background/90 p-3 text-center font-mono text-xs text-warning">{state === "RELEASED" ? "CONTROLLED COPY" : `${state} · NOT FOR PRODUCTION`} · REV {revisionLabel}</div></div></div>;
}