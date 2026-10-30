import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { loadAll, setCurrentUser, useLoaded } from "@/lib/plm-store";
import { setAccess } from "@/lib/access";
import { getHubAccess } from "@/lib/hub.functions";
import type { AppRole } from "@/lib/plm-data";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
    return { user: data.user };
  },
  component: Gate,
});

function Gate() {
  const { user } = Route.useRouteContext();
  const loaded = useLoaded();
  useEffect(() => {
    (async () => {
      const [{ data: p }, { data: r }] = await Promise.all([
        supabase.from("profiles").select("full_name").eq("id", user.id).maybeSingle(),
        supabase.from("user_roles").select("role").eq("user_id", user.id),
      ]);
      setCurrentUser(user.id, p?.full_name || user.email || "User");
      const roles = (r ?? []).map((x) => x.role as AppRole);
      setAccess({ configured: false }, roles);
      await loadAll();
      getHubAccess().then((h) => setAccess(h, roles)).catch(() => {});
    })();
  }, [user.id, user.email]);
  if (!loaded) return <div className="grid min-h-[50vh] place-items-center text-sm text-muted-foreground">Loading engineering data…</div>;
  return <Outlet />;
}
