import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
export const registerControlledFile = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .inputValidator((i: { revisionId: string; path: string; name: string }) => z.object({ revisionId: z.string().uuid(), path: z.string().min(1).max(500), name: z.string().min(1).max(255) }).parse(i))
  .handler(async ({ data, context }) => {
    const r = await context.supabase.from("plm_revisions").select("*").eq("id", data.revisionId).maybeSingle();
    if (!r.data || r.error || r.data.state !== "DRAFT" || !data.path.startsWith(`${context.userId}/`)) throw new Error("Document scope or upload ownership denied");
    const org = await context.supabase.from("plm_organizations").select("environment").eq("id", r.data.organization_id).single();
    if (org.data?.environment !== "SANDBOX") throw new Error("Production document registration requires Access Hub authority");
    const downloaded = await context.supabase.storage.from("controlled-documents").download(data.path);
    if (downloaded.error || !downloaded.data) throw new Error("Uploaded file unavailable");
    if (downloaded.data.size <= 0 || downloaded.data.size > 20 * 1024 * 1024) throw new Error("File must be at most 20 MB");
    const bytes = new Uint8Array(await downloaded.data.arrayBuffer());
    const prefix = new TextDecoder().decode(bytes.slice(0, 5));
    const mime = prefix === "%PDF-" ? "application/pdf" : bytes[0] === 137 && bytes[1] === 80 && bytes[2] === 78 && bytes[3] === 71 ? "image/png" : bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255 ? "image/jpeg" : null;
    if (!mime) throw new Error("Only verified PDF, PNG and JPEG files are supported");
    const hash = Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", bytes))).map((b) => b.toString(16).padStart(2, "0")).join("");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // Scope and upload ownership were checked before the server-only file transaction.
    const { createClient } = await import("@supabase/supabase-js");
    const url = process.env["SUPABASE_URL"], publishable = process.env["SUPABASE_PUBLISHABLE_KEY"];
    if (!url || !publishable) throw new Error("File registration unavailable");
    // The RPC uses the verified user's auth context; service-role execution alone cannot supply auth.uid().
    const result = await context.supabase.rpc("plm_register_file", { _revision: data.revisionId, _path: data.path, _name: data.name, _mime: mime, _size: bytes.length, _hash: hash });
    void supabaseAdmin; void createClient;
    if (result.error) throw new Error(result.error.message);
    return { hash, mime, size: bytes.length };
  });