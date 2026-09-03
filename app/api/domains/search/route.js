import { NextResponse } from "next/server";
import { createClient } from "../../../../lib/supabase/server.js";
import {
  DomainRegistrarError,
  assertRegistrarUserAllowed,
  searchDomains,
} from "../../../../lib/domains/cloudflare-registrar.js";

function failure(error) {
  const status = error instanceof DomainRegistrarError ? error.status : 500;
  return NextResponse.json({
    success: false,
    error: error instanceof DomainRegistrarError ? error.message : "Unable to search domains.",
    code: error instanceof DomainRegistrarError ? error.code : "DOMAIN_SEARCH_FAILED",
    ...(error instanceof DomainRegistrarError && error.details ? { details: error.details } : {}),
  }, { status });
}

export async function GET(request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ success: false, error: "Authentication required." }, { status: 401 });
    assertRegistrarUserAllowed(user);

    const url = new URL(request.url);
    const query = String(url.searchParams.get("q") || "").trim();
    const limit = Number(url.searchParams.get("limit") || 8);
    const domains = await searchDomains(query, { limit });
    return NextResponse.json({ success: true, domains });
  } catch (error) {
    console.error("Domain search error:", error?.code || error?.message || error);
    return failure(error);
  }
}
