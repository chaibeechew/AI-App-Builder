import { NextResponse } from "next/server";
import { updateSession } from "./lib/supabase/proxy";

const SAFE_METHODS=new Set(["GET","HEAD","OPTIONS"]);
function configuredOrigins(){return new Set(String(process.env.LANERIQ_ALLOWED_MUTATION_ORIGINS||"").split(",").map(v=>v.trim()).filter(Boolean));}
function crossSiteMutation(request){
  if(SAFE_METHODS.has(request.method)||!request.nextUrl.pathname.startsWith("/api/"))return false;
  const fetchSite=String(request.headers.get("sec-fetch-site")||"").toLowerCase();
  if(fetchSite==="cross-site")return true;
  const origin=String(request.headers.get("origin")||"").trim();
  if(!origin)return false; // Server-to-server/webhook requests commonly have no browser Origin/Sec-Fetch-Site headers.
  try{
    const requestOrigin=request.nextUrl.origin;
    return new URL(origin).origin!==requestOrigin&&!configuredOrigins().has(new URL(origin).origin);
  }catch{return true;}
}

export async function proxy(request) {
  if(crossSiteMutation(request))return NextResponse.json({error:"Cross-site mutation blocked."},{status:403,headers:{"Cache-Control":"private, no-store, max-age=0","X-Content-Type-Options":"nosniff"}});
  return updateSession(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
