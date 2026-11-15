import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { commandSchema, assertIndependent, type DefinitionEntity, type DefinitionRevision } from "./controlled-model";

export const getDefinitionWorkspace = createServerFn({ method: "GET" }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  const [orgs, sites, entities, revisions, audits, decisions, outbox, inbox, attempts, files, locks, references, memberships] = await Promise.all([
    context.supabase.from("plm_organizations").select("*"), context.supabase.from("plm_sites").select("*"),
    context.supabase.from("plm_entities").select("*"), context.supabase.from("plm_revisions").select("*"),
    context.supabase.from("plm_audit_events").select("*").order("occurred_at", { ascending: false }).limit(1000),
    context.supabase.from("plm_decisions").select("*"), context.supabase.from("plm_outbox").select("*"),
    context.supabase.from("plm_inbox").select("*"), context.supabase.from("plm_delivery_attempts").select("*"),
    context.supabase.from("plm_document_files").select("*"), context.supabase.from("plm_document_locks").select("*"),
    context.supabase.from("plm_external_references").select("*"), context.supabase.from("plm_memberships").select("*"),
  ]);
  const err = [orgs, sites, entities, revisions, audits, decisions, outbox, inbox, attempts, files, locks, references, memberships].find((r) => r.error)?.error;
  if (err) throw new Error("Definition workspace could not load. Your unsaved edits have been retained.");
  return { organizations: orgs.data ?? [], sites: sites.data ?? [], entities: (entities.data ?? []) as DefinitionEntity[], revisions: (revisions.data ?? []) as unknown as DefinitionRevision[], audits: audits.data ?? [], decisions: decisions.data ?? [], outbox: outbox.data ?? [], inbox: inbox.data ?? [], attempts: attempts.data ?? [], files: files.data ?? [], locks: locks.data ?? [], references: references.data ?? [], memberships: memberships.data ?? [], userId: context.userId };
});
export const createSandboxWorkspace = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .inputValidator((i: { name: string }) => z.object({ name: z.string().trim().min(2).max(120) }).parse(i))
  .handler(async ({ data, context }) => { const r = await context.supabase.rpc("plm_sandbox_workspace", { _name: data.name }); if (r.error) throw new Error(r.error.message); return r.data; });

export const definitionCommand = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => commandSchema.parse(i)).handler(async ({ data, context }) => {
    const { password, ...command } = data;
    let authorizationId: string | undefined;
    if (["approve", "reject", "release", "withdraw", "supersede", "publish"].includes(data.action)) {
      if (!data.revisionId) throw new Error("Select a revision");
      const { data: revision, error } = await context.supabase.from("plm_revisions").select("*").eq("id", data.revisionId).eq("organization_id", data.organizationId).maybeSingle();
      if (error || !revision) throw new Error("Revision not available in permitted scope");
      if (["approve", "reject"].includes(data.action)) assertIndependent(revision.author_id, context.userId);
      const { data: scope } = await context.supabase.rpc("plm_has_scope", { _org: data.organizationId, ...(data.siteId ? { _site: data.siteId } : {}) });
      if (!scope) throw new Error("Unauthorized organization/site");
      const base = process.env["ACCESS_HUB_URL"], key = process.env["ACCESS_HUB_API_KEY"];
      if (!base || !key) throw new Error("Command Access Hub is not configured. Controlled actions are blocked.");
      const { data: identity } = await context.supabase.auth.getUser();
      if (!identity.user?.email) throw new Error("Sign in again");
      const resource = data.action === "publish" ? "integrations" : "definitions";
      const hubResponse = await fetch(`${base.replace(/\/$/, "")}/api/public/v1/access?email=${encodeURIComponent(identity.user.email)}`, { headers: { "x-api-key": key }, signal: AbortSignal.timeout(8000) });
      if (!hubResponse.ok) throw new Error("Access Hub could not verify permission. Controlled action blocked.");
      const access = z.object({ active: z.boolean(), permissions: z.array(z.object({ resource_key: z.string(), can_edit: z.boolean() })), organization_ids: z.array(z.string().uuid()), site_ids: z.array(z.string().uuid()).optional() }).safeParse(await hubResponse.json());
      if (!access.success || !access.data.active || !access.data.organization_ids.includes(data.organizationId) || data.siteId && !access.data.site_ids?.includes(data.siteId) || !access.data.permissions.some((p) => [resource, `plm.${resource}`, `plm.${data.action}`].includes(p.resource_key) && p.can_edit)) throw new Error("Access Hub has not supplied this action's organization/site authority.");
      if (!password) throw new Error("Re-enter your password for this controlled action");
      const url = process.env["SUPABASE_URL"], publishable = process.env["SUPABASE_PUBLISHABLE_KEY"];
      if (!url || !publishable) throw new Error("Identity verification unavailable");
      const { createClient } = await import("@supabase/supabase-js");
      const verifier = createClient(url, publishable, { auth: { persistSession: false, autoRefreshToken: false }, global: { fetch: (input, init) => { const headers = new Headers(init?.headers); if (publishable.startsWith("sb_") && headers.get("Authorization") === `Bearer ${publishable}`) headers.delete("Authorization"); headers.set("apikey", publishable); return fetch(input, { ...init, headers }); } } });
      const verified = await verifier.auth.signInWithPassword({ email: identity.user.email, password });
      if (verified.error || verified.data.user?.id !== context.userId) throw new Error("Password verification failed");
      await verifier.auth.signOut({ scope: "local" });
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const ticket = await supabaseAdmin.from("plm_action_authorizations").insert({ organization_id: data.organizationId, site_id: data.siteId ?? null, user_id: context.userId, revision_id: data.revisionId, candidate_hash: revision.content_hash, action: data.action, expires_at: new Date(Date.now() + 30000).toISOString() }).select("id").single();
      if (ticket.error) throw new Error("Could not authorize controlled action");
      authorizationId = ticket.data.id;
    }
    const result = await context.supabase.rpc("plm_command", { _command: JSON.parse(JSON.stringify({ ...command, ...(authorizationId ? { authorizationId } : {}) })) });
    if (result.error) throw new Error(result.error.message);
    return result.data as unknown as { revision: DefinitionRevision; findings: string[] };
  });

export const openControlledFile = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .inputValidator((i: { revisionId: string }) => z.object({ revisionId: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const file = await context.supabase.from("plm_document_files").select("*").eq("revision_id", data.revisionId).maybeSingle();
    if (file.error || !file.data) throw new Error("File not available in permitted scope");
    const result = await context.supabase.storage.from("controlled-documents").createSignedUrl(file.data.storage_path, 120);
    if (result.error) throw new Error("File could not be opened");
    return { url: result.data.signedUrl, mime: file.data.mime_type, name: file.data.original_name };
  });