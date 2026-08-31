import { createClient as createSupabaseClient } from "@supabase/supabase-js";

let cached=null;
export function createAdminClient(){
  if(cached)return cached;
  const url=String(process.env.NEXT_PUBLIC_SUPABASE_URL||"").trim();
  const key=String(process.env.SUPABASE_SECRET_KEY||process.env.SUPABASE_SERVICE_ROLE_KEY||"").trim();
  if(!url||!key)throw new Error("Server financial runtime is not configured.");
  cached=createSupabaseClient(url,key,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
  return cached;
}
