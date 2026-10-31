import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { APP_ROLES, type AppRole } from "./plm-data";

async function assertAdmin(supabase: { rpc: (fn: "has_role", args: { _user_id: string; _role: AppRole }) => PromiseLike<{ data: boolean | null }> }, userId: string) {
  const { data } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
  if (!data) throw new Error("Only administrators can manage accounts");
}

export const createUserAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { email: string; password: string; fullName: string; jobTitle?: string; department?: string; role: AppRole }) => {
    const email = String(i.email ?? "").trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 255) throw new Error("Enter a valid email");
    if (String(i.password ?? "").length < 8) throw new Error("Password must be at least 8 characters");
    if (!APP_ROLES.includes(i.role)) throw new Error("Unknown role");
    return { email, password: String(i.password), fullName: String(i.fullName ?? "").slice(0, 120), jobTitle: i.jobTitle?.slice(0, 120), department: i.department?.slice(0, 120), role: i.role };
  })
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase as never, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
      email: data.email, password: data.password, email_confirm: false, user_metadata: { full_name: data.fullName || data.email.split("@")[0] },
    });
    if (error || !created.user) throw new Error(error?.message ?? "Could not create account");
    const id = created.user.id;
    await supabaseAdmin.from("profiles").update({ job_title: data.jobTitle ?? null, department: data.department ?? null }).eq("id", id);
    await supabaseAdmin.from("user_roles").delete().eq("user_id", id);
    await supabaseAdmin.from("user_roles").insert({ user_id: id, role: data.role });
    return { id };
  });

export const resetUserPassword = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { userId: string; password: string }) => {
    if (String(i.password ?? "").length < 8) throw new Error("Password must be at least 8 characters");
    return { userId: String(i.userId), password: String(i.password) };
  })
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase as never, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.auth.admin.updateUserById(data.userId, { password: data.password });
    if (error) throw new Error(error.message);
    return { ok: true };
  });
