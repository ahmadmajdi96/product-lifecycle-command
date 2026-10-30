import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/auth")({
  ssr: false,
  head: () => ({ meta: [{ title: "Sign in · Cortanex PLM" }, { name: "description", content: "Sign in to Cortanex PLM." }, { property: "og:title", content: "Sign in · Cortanex PLM" }, { property: "og:description", content: "Secure access to Cortanex PLM." }] }),
  component: Auth,
});

function Auth() {
  const nav = useNavigate();
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true);
    const r = mode === "in"
      ? await supabase.auth.signInWithPassword({ email, password: pw })
      : await supabase.auth.signUp({ email, password: pw, options: { emailRedirectTo: window.location.origin, data: { full_name: name } } });
    setBusy(false);
    if (r.error) return toast.error(r.error.message);
    if (!r.data.session) return toast.success("Check your email to confirm your account.");
    nav({ to: "/", replace: true });
  };
  return (
    <div className="grid min-h-screen place-items-center px-4">
      <form onSubmit={submit} className="w-full max-w-sm space-y-3 rounded-xl border border-border bg-card p-6">
        <h1 className="text-xl font-bold">Cortanex PLM</h1>
        <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Command Access Hub identity</p>
        {mode === "up" && <Input placeholder="Full name" value={name} onChange={(e) => setName(e.target.value)} />}
        <Input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <Input type="password" placeholder="Password" value={pw} onChange={(e) => setPw(e.target.value)} required minLength={8} />
        <Button className="w-full" disabled={busy}>{mode === "in" ? "Sign in" : "Create account"}</Button>
        <button type="button" className="w-full text-xs text-muted-foreground" onClick={() => setMode(mode === "in" ? "up" : "in")}>{mode === "in" ? "First time? Create an account" : "Have an account? Sign in"}</button>
      </form>
    </div>
  );
}
