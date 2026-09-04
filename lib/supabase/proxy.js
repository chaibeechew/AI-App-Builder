import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";
import {
  LANERIQ_SESSION_COOKIE,
  LANERIQ_SESSION_MODE_COOKIE,
  isLaneriqPrimarySessionMode,
  validateLaneriqSessionToken,
} from "../auth/laneriq-session.js";
import { isPublicAccountPath, protectedReturnPath, safeInternalNext } from "../auth/session-safety.js";

const PUBLIC_SERVER_ENDPOINTS = new Set(["/api/whatsapp/webhook","/api/auth/verification/request","/api/auth/verification/verify","/api/auth/verification/status","/api/auth/session"]);
const PUBLIC_READ_ONLY_OBSERVABILITY_ENDPOINTS = new Set(["/api/build-info","/api/images/readiness","/api/video/readiness"]);
const PUBLIC_CLOUD_READ_ONLY_STATUS_ENDPOINTS = new Set(["/api/cloud/service-status"]);
const PUBLIC_PROVIDER_ROUTER_READ_ONLY_STATUS_ENDPOINTS = new Set(["/api/ai/provider-router/status"]);
const PUBLIC_MALWARE_LIVE_CANARY_ENDPOINTS = new Set(["/api/malware/service-status"]);
const PUBLIC_MALWARE_INTERNAL_SERVICE_ENDPOINTS = new Set(["/api/malware/knowledge-store"]);
const PUBLIC_WEBSITE_ENQUIRY_POST=/^\/api\/public\/website\/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\/enquiries$/i;

function authRedirect(request, extra = {}) {
  const url = request.nextUrl.clone();
  const next = protectedReturnPath(request.nextUrl.pathname, request.nextUrl.search);
  url.pathname = "/auth";
  url.search = "";
  url.searchParams.set("next", next);
  for (const [key, value] of Object.entries(extra)) if (value) url.searchParams.set(key, value);
  return NextResponse.redirect(url);
}

function apiAuthFailure({ configured = true } = {}) {
  const status = configured ? 401 : 503;
  const response = NextResponse.json(
    configured
      ? { success: false, error: "Authentication required.", code: "AUTHENTICATION_REQUIRED", sessionAuthority: "laneriq" }
      : { success: false, error: "Authentication service is not configured.", code: "AUTH_NOT_CONFIGURED", sessionAuthority: "laneriq" },
    { status },
  );
  response.headers.set("Cache-Control", "private, no-store, max-age=0");
  response.headers.set("Pragma", "no-cache");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Vary", "Cookie");
  return response;
}

function apiSessionUnavailable() {
  const response = NextResponse.json(
    { success: false, error: "Authentication service is temporarily unavailable.", code: "SESSION_NOT_READY", sessionAuthority: "laneriq" },
    { status: 503 },
  );
  response.headers.set("Cache-Control", "private, no-store, max-age=0");
  response.headers.set("Pragma", "no-cache");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Vary", "Cookie");
  return response;
}

function protectedResponse(response) {
  response.headers.set("Cache-Control", "private, no-store, max-age=0");
  response.headers.set("Pragma", "no-cache");
  response.headers.set("Vary", "Cookie");
  return response;
}

export async function updateSession(request) {
  let response = NextResponse.next({ request });
  const pathname = request.nextUrl.pathname;
  const isApiRequest = pathname === "/api" || pathname.startsWith("/api/");

  if (PUBLIC_SERVER_ENDPOINTS.has(pathname)) {
    response.headers.set("Cache-Control", "no-store, max-age=0");
    response.headers.set("X-Content-Type-Options", "nosniff");
    response.headers.set("Vary", "Cookie");
    return response;
  }

  if (PUBLIC_MALWARE_INTERNAL_SERVICE_ENDPOINTS.has(pathname) && request.method === "POST") {
    response.headers.set("Cache-Control", "no-store, max-age=0");
    response.headers.set("X-Content-Type-Options", "nosniff");
    return response;
  }

  if(PUBLIC_WEBSITE_ENQUIRY_POST.test(pathname)&&request.method==="POST"){
    response.headers.set("Cache-Control","no-store, max-age=0");
    response.headers.set("X-Content-Type-Options","nosniff");
    return response;
  }

  if (PUBLIC_READ_ONLY_OBSERVABILITY_ENDPOINTS.has(pathname) && (request.method === "GET" || request.method === "HEAD")) {
    response.headers.set("Cache-Control", "no-store, max-age=0");
    response.headers.set("X-Content-Type-Options", "nosniff");
    return response;
  }

  // Cloud public observability is strictly read-only. Executable Cloud canary POSTs
  // must pass the normal session gate and the route-level LANERIQ admin authority check.
  if (PUBLIC_CLOUD_READ_ONLY_STATUS_ENDPOINTS.has(pathname) && (request.method === "GET" || request.method === "HEAD")) {
    response.headers.set("Cache-Control", "no-store, max-age=0");
    response.headers.set("X-Content-Type-Options", "nosniff");
    return response;
  }

  if (PUBLIC_PROVIDER_ROUTER_READ_ONLY_STATUS_ENDPOINTS.has(pathname) && (request.method === "GET" || request.method === "HEAD")) {
    response.headers.set("Cache-Control", "no-store, max-age=0");
    response.headers.set("X-Content-Type-Options", "nosniff");
    return response;
  }

  // Malware Defense access control remains owned by the Malware Defense window.
  if (PUBLIC_MALWARE_LIVE_CANARY_ENDPOINTS.has(pathname) && (request.method === "GET" || request.method === "HEAD")) {
    response.headers.set("Cache-Control", "no-store, max-age=0");
    response.headers.set("X-Content-Type-Options", "nosniff");
    return response;
  }

  if (pathname === "/auth") {
    const rawNext = request.nextUrl.searchParams.get("next");
    if (rawNext) {
      const safeNext = safeInternalNext(rawNext);
      if (safeNext !== rawNext) {
        const url = request.nextUrl.clone();
        url.searchParams.set("next", safeNext);
        return NextResponse.redirect(url);
      }
    }
    response.headers.set("Cache-Control", "private, no-store, max-age=0");
    response.headers.set("Vary", "Cookie");
    return response;
  }

  if (isPublicAccountPath(pathname)) return response;

  const laneriqToken=String(request.cookies.get(LANERIQ_SESSION_COOKIE)?.value||"");
  const laneriqMode=request.cookies.get(LANERIQ_SESSION_MODE_COOKIE)?.value;
  let laneriqSession=null;
  try{
    laneriqSession=await validateLaneriqSessionToken(laneriqToken);
  }catch{
    return isApiRequest ? apiSessionUnavailable() : authRedirect(request,{error:"session_not_ready"});
  }
  if(laneriqSession)return protectedResponse(response);

  if(isLaneriqPrimarySessionMode(laneriqMode)){
    return isApiRequest ? apiAuthFailure() : authRedirect(request);
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !key) {
    return isApiRequest ? apiAuthFailure({ configured: false }) : authRedirect(request, { error: "auth_not_configured" });
  }

  const supabase = createServerClient(supabaseUrl, key, {
    cookies: {
      getAll() { return request.cookies.getAll(); },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value, options }) => {
          request.cookies.set(name, value, options);
          response.cookies.set(name, value, options);
        });
        Object.entries(headers || {}).forEach(([headerName, value]) => response.headers.set(headerName, value));
      },
    },
  });

  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) return isApiRequest ? apiAuthFailure() : authRedirect(request);
  return protectedResponse(response);
}
