import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Cpu, Lock, Mail, UserRound, Loader2 } from "lucide-react";

export const Route = createFileRoute("/auth")({
  ssr: false,
  head: () => ({ meta: [{ title: "Sign in · Cortanex PLM" }, { name: "description", content: "Sign in to Cortanex PLM." }, { property: "og:title", content: "Sign in · Cortanex PLM" }, { property: "og:description", content: "Secure access to Cortanex PLM." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: Auth,
});

function Auth() {
  const nav = useNavigate();
  const [mode, setMode] = useState<"in" | "up" | "reset">("in");
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true); setNotice("");
    try {
    if (mode === "reset") {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: `${window.location.origin}/reset-password` });
      if (error) throw error;
      setNotice("If an account exists for this email, a password reset link has been sent. Check your inbox and spam folder.");
      return;
    }
    const r = mode === "in"
      ? await supabase.auth.signInWithPassword({ email: email.trim(), password: pw })
      : await supabase.auth.signUp({ email: email.trim(), password: pw, options: { emailRedirectTo: window.location.origin, data: { full_name: name } } });
    if (r.error) throw r.error;
    if (!r.data.session) { setNotice("Check your email to confirm your account. If you already have an account, sign in or reset your password."); return; }
    await nav({ to: "/", replace: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to connect. Please try again.";
      setNotice(message === "Invalid login credentials" ? "Email or password was not accepted. Use Forgot password to recover your existing account." : message);
      toast.error(message);
    } finally { setBusy(false); }
  };
  return (
    <div className="grid min-h-screen place-items-center bg-background px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-6 flex items-center gap-3"><div className="mes-brand grid h-11 w-11 place-items-center rounded-xl text-primary-foreground shadow-[var(--shadow-glow)]"><Cpu className="h-5 w-5" /></div><div><h1 className="font-display text-xl font-semibold">Cortanex PLM</h1><p className="text-xs text-muted-foreground">Product Lifecycle Management</p></div></div>
        <div className="glass-panel rounded-2xl p-6">
          <div className="mb-4 flex gap-1 rounded-lg border border-border/60 bg-background/40 p-1" role="tablist" aria-label="Account access">
            <Button role="tab" aria-selected={mode === "in"} variant={mode === "in" ? "default" : "ghost"} className="h-8 flex-1 rounded-md text-xs" onClick={() => setMode("in")}>Sign in</Button>
            <Button role="tab" aria-selected={mode === "up"} variant={mode === "up" ? "default" : "ghost"} className="h-8 flex-1 rounded-md text-xs" onClick={() => setMode("up")}>Create account</Button>
          </div>
          <form onSubmit={submit} className="space-y-3">
            {mode === "up" && <label className="block"><span className="text-[11px] uppercase tracking-wider text-muted-foreground">Full name</span><div className="relative mt-1"><UserRound className="pointer-events-none absolute left-2.5 top-1/2 z-10 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" /><Input placeholder="Full name" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} className="h-10 rounded-lg border-border/60 bg-background/50 pl-8" /></div></label>}
            <label className="block"><span className="text-[11px] uppercase tracking-wider text-muted-foreground">Email</span><div className="relative mt-1"><Mail className="pointer-events-none absolute left-2.5 top-1/2 z-10 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" /><Input type="email" autoComplete="email" placeholder="you@company.com" value={email} onChange={(e) => setEmail(e.target.value)} required className="h-10 rounded-lg border-border/60 bg-background/50 pl-8" /></div></label>
            {mode !== "reset" && <label className="block"><span className="text-[11px] uppercase tracking-wider text-muted-foreground">Password</span><div className="relative mt-1"><Lock className="pointer-events-none absolute left-2.5 top-1/2 z-10 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" /><Input type="password" autoComplete={mode === "in" ? "current-password" : "new-password"} placeholder="••••••••" value={pw} onChange={(e) => setPw(e.target.value)} required minLength={mode === "up" ? 8 : undefined} className="h-10 rounded-lg border-border/60 bg-background/50 pl-8" /></div></label>}
            {notice && <p role="status" className="text-sm text-muted-foreground">{notice}</p>}
            <Button className="h-10 w-full rounded-lg" disabled={busy}>{busy && <Loader2 className="animate-spin" />}{mode === "reset" ? "Send reset link" : mode === "in" ? "Sign in" : "Create account"}</Button>
            <Button type="button" variant="ghost" className="w-full" disabled={busy} onClick={() => { setNotice(""); setMode(mode === "reset" ? "in" : "reset"); }}>{mode === "reset" ? "Back to sign in" : "Forgot password?"}</Button>
          </form>
        </div>
      </div>
    </div>
  );
}
