import { NextResponse } from "next/server";
import { createClient } from "../../../../lib/supabase/server.js";
import {
  DomainRegistrarError,
  assertRegistrarUserAllowed,
  checkDomains,
} from "../../../../lib/domains/cloudflare-registrar.js";

function failure(error) {
  const status = error instanceof DomainRegistrarError ? error.status : 500;
  return NextResponse.json({
    success: false,
    error: error instanceof DomainRegistrarError ? error.message : "Unable to check domain pricing.",
    code: error instanceof DomainRegistrarError ? error.code : "DOMAIN_CHECK_FAILED",
    ...(error instanceof DomainRegistrarError && error.details ? { details: error.details } : {}),
  }, { status });
}

export async function POST(request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ success: false, error: "Authentication required." }, { status: 401 });
    assertRegistrarUserAllowed(user);

    const body = await request.json().catch(() => ({}));
    const input = Array.isArray(body?.domains) ? body.domains : [body?.domainName];
    const domains = await checkDomains(input);
    return NextResponse.json({ success: true, domains, checkedAt: new Date().toISOString() });
  } catch (error) {
    console.error("Domain check error:", error?.code || error?.message || error);
    return failure(error);
  }
}
