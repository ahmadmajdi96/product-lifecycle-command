import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type HubPermission = { resource_key: string; kind: string; name: string; module: string; can_view: boolean; can_create: boolean; can_edit: boolean; can_delete: boolean };
export type HubAccess =
  | { configured: false }
  | { configured: true; reachable: false; error: string }
  | { configured: true; reachable: true; active: boolean; system: string; roles: string[]; permissions: HubPermission[]; user: { email: string; full_name: string | null; job_title: string | null } | null };

/**
 * Asks Command Access Hub what the signed-in person may do in PLM.
 * Uses the PLM system's API key (server-only secret); the email comes from the
 * verified session, never from the browser.
 */
export const getHubAccess = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<HubAccess> => {
    const base = process.env["ACCESS_HUB_URL"];
    const key = process.env["ACCESS_HUB_API_KEY"];
    if (!base || !key) return { configured: false };
    const email = (context.claims as { email?: string }).email;
    if (!email) return { configured: true, reachable: false, error: "Session has no email" };
    try {
      const res = await fetch(`${base.replace(/\/$/, "")}/api/public/v1/access?email=${encodeURIComponent(email)}`, { headers: { "x-api-key": key } });
      if (!res.ok) return { configured: true, reachable: false, error: `Access Hub replied ${res.status}` };
      const body = (await res.json()) as { system: string; active: boolean; roles: string[]; permissions: HubPermission[]; user: { email: string; full_name: string | null; job_title: string | null } | null };
      return { configured: true, reachable: true, active: body.active, system: body.system, roles: body.roles ?? [], permissions: body.permissions ?? [], user: body.user };
    } catch (e) {
      return { configured: true, reachable: false, error: e instanceof Error ? e.message : "Network error" };
    }
  });
