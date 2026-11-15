import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
export const createUserAccount = createServerFn({method:"POST"}).middleware([requireSupabaseAuth]).inputValidator((i:unknown)=>i).handler(async()=>{throw new Error("Command Access Hub owns account creation and role assignment");});
export const resetUserPassword = createServerFn({method:"POST"}).middleware([requireSupabaseAuth]).inputValidator((i:unknown)=>i).handler(async()=>{throw new Error("Command Access Hub owns account recovery; PLMS cannot reset another person's password");});
