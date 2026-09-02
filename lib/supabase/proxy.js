import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";
import { isPublicAccountPath, protectedReturnPath, safeInternalNext } from "../auth/session-safety.js";

const PUBLIC_SERVER_WEBHOOKS = new Set(["/api/whatsapp/webhook"]);

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
      ? { success: false, error: "Authentication required.", code: "AUTHENTICATION_REQUIRED" }
      : { success: false, error: "Authentication service is not configured.", code: "AUTH_NOT_CONFIGURED" },
    { status },
  );
  response.headers.set("Cache-Control", "private, no-store, max-age=0");
  response.headers.set("Pragma", "no-cache");
  response.headers.set("X-Content-Type-Options", "nosniff");
  return response;
}

export async function updateSession(request) {
  let response = NextResponse.next({ request });
  const pathname = request.nextUrl.pathname;
  const isApiRequest = pathname === "/api" || pathname.startsWith("/api/");

  // Meta must be able to reach this exact server-to-server WhatsApp endpoint without a user session.
  // The route itself performs verify-token checks for GET and HMAC signature checks for POST.
  if (PUBLIC_SERVER_WEBHOOKS.has(pathname)) {
    response.headers.set("Cache-Control", "no-store, max-age=0");
    response.headers.set("X-Content-Type-Options", "nosniff");
    return response;
  }

  // Canonicalize any externally supplied auth return path before the page can use it.
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
    return response;
  }

  // Public discovery routes stay browseable before sign-in.
  // Authentication is still required when the user starts protected build actions.
  if (isPublicAccountPath(pathname)) return response;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !key) {
    return isApiRequest
      ? apiAuthFailure({ configured: false })
      : authRedirect(request, { error: "auth_not_configured" });
  }

  const supabase = createServerClient(supabaseUrl, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value, options }) => {
          request.cookies.set(name, value, options);
          response.cookies.set(name, value, options);
        });
        Object.entries(headers || {}).forEach(([headerName, value]) => {
          response.headers.set(headerName, value);
        });
      },
    },
  });

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return isApiRequest ? apiAuthFailure() : authRedirect(request);
  }

  // Protected project/account responses should not be retained as reusable browser cache after logout.
  response.headers.set("Cache-Control", "private, no-store, max-age=0");
  response.headers.set("Pragma", "no-cache");
  return response;
}