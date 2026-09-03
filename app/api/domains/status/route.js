import { NextResponse } from "next/server";
import { createClient } from "../../../../lib/supabase/server.js";
import {
  DomainRegistrarError,
  assertRegistrarUserAllowed,
  normalizeDomain,
  registrationStatus,
} from "../../../../lib/domains/cloudflare-registrar.js";

function failure(error) {
  const status = error instanceof DomainRegistrarError ? error.status : 500;
  return NextResponse.json({
    success: false,
    error: error instanceof DomainRegistrarError ? error.message : "Unable to read registration status.",
    code: error instanceof DomainRegistrarError ? error.code : "DOMAIN_STATUS_FAILED",
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
    const domainName = normalizeDomain(url.searchParams.get("domain"));
    const statusResult = await registrationStatus(domainName);
    return NextResponse.json({ success: true, domainName, registration: statusResult.result });
  } catch (error) {
    console.error("Domain status error:", error?.code || error?.message || error);
    return failure(error);
  }
}
