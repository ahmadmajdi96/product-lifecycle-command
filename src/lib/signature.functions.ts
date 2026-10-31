import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const verifySignatureIdentity = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { password: string }) => {
    if (!input.password || input.password.length > 1024) throw new Error("Enter your password");
    return input;
  })
  .handler(async ({ data, context }) => {
    const { data: identity, error: identityError } = await context.supabase.auth.getUser();
    if (identityError || !identity.user?.email) throw new Error("Sign in again before signing");
    const url = process.env["SUPABASE_URL"];
    const key = process.env["SUPABASE_PUBLISHABLE_KEY"];
    if (!url || !key) throw new Error("Identity verification unavailable");
    const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false }, global: { fetch: (input, init) => {
      const headers = new Headers(init?.headers);
      if (key.startsWith("sb_") && headers.get("Authorization") === `Bearer ${key}`) headers.delete("Authorization");
      headers.set("apikey", key);
      return fetch(input, { ...init, headers });
    } } });
    const { data: verified, error } = await client.auth.signInWithPassword({ email: identity.user.email, password: data.password });
    if (error || verified.user?.id !== context.userId) throw new Error("Password verification failed");
    await client.auth.signOut({ scope: "local" });
    return { verified: true };
  });