import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ChevronRight, LogOut, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { CURRENT_USER_ID, usePlm } from "@/lib/plm-store";
import { supabase } from "@/integrations/supabase/client";
import { RecordButton } from "./record-profiles";
import { useQueryClient } from "@tanstack/react-query";
import { CommandPalette, NotificationBell } from "./command-tools";

export function TopBar() {
  const cache = useQueryClient();
  const state = usePlm((s) => s);
  const profile = state.profiles.find((p) => p.id === CURRENT_USER_ID);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const handle = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); setOpen((v) => !v); }
    };
    window.addEventListener("keydown", handle);
    return () => window.removeEventListener("keydown", handle);
  }, []);
  const name = profile?.fullName || profile?.email || "User";
  const initials = name.split(/[\s@.]+/).filter(Boolean).map((p) => p[0]).join("").slice(0, 2).toUpperCase();
  return <>
    <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border/60 bg-background/70 px-4 backdrop-blur-xl">
      <SidebarTrigger className="text-muted-foreground hover:text-foreground" />
      <div className="hidden items-center gap-1.5 text-xs text-muted-foreground sm:flex"><span>Cortanex MOS</span><ChevronRight className="h-3 w-3" /><Link to="/" className="text-foreground">PLM</Link><ChevronRight className="h-3 w-3" /><span className="hidden lg:inline">Product Definition</span></div>
      <div className="ml-auto flex min-w-0 items-center gap-2">
        <Button variant="outline" aria-label="Search everything" onClick={() => setOpen(true)} className="h-9 gap-2 rounded-lg border-border/60 bg-card/60 px-2.5 text-muted-foreground hover:border-primary/50 hover:bg-card md:w-64"><Search className="h-3.5 w-3.5" /><span className="hidden flex-1 text-left md:inline">Search everything…</span><kbd className="hidden rounded border border-border/60 px-1.5 font-mono text-[10px] md:inline">Ctrl K</kbd></Button>
        <NotificationBell />
        {profile && <div className="flex min-w-0 items-center gap-2 rounded-lg border border-border/60 bg-card/60 px-2 py-1"><div className="mes-brand grid h-6 w-6 shrink-0 place-items-center rounded-md text-[10px] font-bold text-primary-foreground">{initials}</div><div className="hidden max-w-40 text-xs leading-tight sm:block"><RecordButton record={{ kind: "profiles", id: profile.id }}>{name}</RecordButton><div className="truncate text-[10px] text-muted-foreground">{profile.jobTitle || "Member"}</div></div></div>}
        <Button variant="outline" size="icon" aria-label="Sign out" title="Sign out" className="rounded-lg border-border/60 bg-card/60 text-muted-foreground hover:bg-card hover:text-destructive" onClick={async () => { await cache.cancelQueries(); cache.clear(); await supabase.auth.signOut(); window.location.replace("/auth"); }}><LogOut /></Button>
      </div>
    </header>
    <CommandPalette open={open} onOpenChange={setOpen} />
  </>;
}