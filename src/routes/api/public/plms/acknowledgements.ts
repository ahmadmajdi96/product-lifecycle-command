import { createFileRoute } from "@tanstack/react-router";
import { acknowledgementSchema } from "@/lib/integration-contracts";
export const Route = createFileRoute("/api/public/plms/acknowledgements")({ server: { handlers: {
  POST: async ({ request }) => {
    const secret = process.env["PLMS_CONSUMER_SECRET"];
    const org = process.env["PLMS_CONSUMER_ORGANIZATION_ID"];
    const consumer = process.env["PLMS_CONSUMER_SYSTEM"];
    const site = process.env["PLMS_CONSUMER_SITE_ID"];
    if (!secret || !org || !consumer) return Response.json({ error: "Consumer contract not configured" }, { status: 503 });
    const timestamp = request.headers.get("x-plms-timestamp"), signature = request.headers.get("x-plms-signature");
    if (!timestamp || !signature || !/^\d{10,13}$/.test(timestamp) || Math.abs(Date.now() - Number(timestamp)) > 300000) return Response.json({ error: "Invalid signed request" }, { status: 401 });
    if (Number(request.headers.get("content-length") ?? 0) > 16384) return new Response("Request too large", { status: 413 });
    const body = await request.text(); if (body.length > 16384) return new Response("Request too large", { status: 413 });
    const { createHmac, timingSafeEqual } = await import("node:crypto");
    const expected = createHmac("sha256", secret).update(`${timestamp}.${body}`).digest("hex");
    if (!/^[a-f0-9]{64}$/.test(signature) || !timingSafeEqual(Buffer.from(expected), Buffer.from(signature))) return Response.json({ error: "Invalid signature" }, { status: 401 });
    let parsed: unknown; try { parsed = JSON.parse(body); } catch { return Response.json({ error: "Invalid JSON" }, { status: 400 }); }
    const result = acknowledgementSchema.safeParse(parsed);
    if (!result.success) return Response.json({ error: "Invalid acknowledgement" }, { status: 400 });
    if (result.data.organizationId !== org || result.data.consumer !== consumer || result.data.siteId !== (site ?? null)) return Response.json({ error: "Connector scope denied" }, { status: 403 });
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const saved = await supabaseAdmin.rpc("plm_receive_ack", { _body: result.data });
    if (saved.error) return Response.json({ error: "Acknowledgement rejected by contract validation" }, { status: 409 });
    return Response.json({ outcome: saved.data }, { headers: { "Cache-Control": "no-store" } });
  },
} } });