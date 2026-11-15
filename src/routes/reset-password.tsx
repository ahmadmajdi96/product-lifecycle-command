import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/reset-password")({
  ssr: false,
  head: () => ({ meta: [
    { title: "Reset password · Cortanex PLM" },
    { name: "description", content: "Recover access to your Cortanex PLM account." },
    { property: "og:title", content: "Reset password · Cortanex PLM" },
    { property: "og:description", content: "Secure password recovery for Cortanex PLM." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: ResetPassword,
});

function ResetPassword() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("Checking your recovery link…");
  useEffect(() => {
    let active = true;
    const recovery = new URLSearchParams(window.location.hash.slice(1)).get("type") === "recovery" || sessionStorage.getItem("plm-password-recovery") === "true";
    void supabase.auth.getUser().then(({ data, error }) => {
      if (!active) return;
      if (recovery && !error && data.user) { setReady(true); setMessage(""); }
      else setMessage("This recovery link is missing or expired. Request a new link from the sign-in page.");
    }).catch(() => { if (active) setMessage("Unable to verify your link. Request a new password reset link."); });
    return () => { active = false; };
  }, []);
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (password !== confirmation) { setMessage("Passwords do not match."); return; }
    setBusy(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      sessionStorage.removeItem("plm-password-recovery");
      setReady(false); setMessage("Password updated. You can now sign in with your new password.");
      await supabase.auth.signOut({ scope: "local" });
    } catch (error) { setMessage(error instanceof Error ? error.message : "Password could not be updated."); }
    finally { setBusy(false); }
  }
  return <div className="grid min-h-screen place-items-center bg-background px-4 py-10"><div className="w-full max-w-md space-y-5"><h1 className="font-display text-xl font-semibold">Reset password · Cortanex PLM</h1>{message && <p role="status" className="text-sm text-muted-foreground">{message}</p>}{ready && <form onSubmit={submit} className="space-y-4"><label className="block space-y-2"><span className="text-sm">New password</span><Input type="password" autoComplete="new-password" required minLength={8} value={password} onChange={(event) => setPassword(event.target.value)} /></label><label className="block space-y-2"><span className="text-sm">Confirm password</span><Input type="password" autoComplete="new-password" required minLength={8} value={confirmation} onChange={(event) => setConfirmation(event.target.value)} /></label><Button disabled={busy} className="w-full">{busy ? "Updating…" : "Update password"}</Button></form>}<Button variant="outline" onClick={() => navigate({ to: "/auth", replace: true })}>Back to sign in</Button></div></div>;
}