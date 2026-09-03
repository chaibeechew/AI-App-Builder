import { NextResponse } from "next/server";
import { createClient } from "../../../../lib/supabase/server.js";
import {
  DomainRegistrarError,
  assertRegistrarUserAllowed,
  assertRegistrationIntent,
  checkDomains,
  normalizeDomain,
  registerDomain,
  registrarPurchasesEnabled,
} from "../../../../lib/domains/cloudflare-registrar.js";

function failure(error) {
  const status = error instanceof DomainRegistrarError ? error.status : 500;
  return NextResponse.json({
    success: false,
    error: error instanceof DomainRegistrarError ? error.message : "Unable to register domain.",
    code: error instanceof DomainRegistrarError ? error.code : "DOMAIN_REGISTRATION_FAILED",
    ...(error instanceof DomainRegistrarError && error.details ? { details: error.details } : {}),
  }, { status });
}

export async function POST(request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ success: false, error: "Authentication required." }, { status: 401 });
    assertRegistrarUserAllowed(user);

    if (!registrarPurchasesEnabled()) {
      throw new DomainRegistrarError("Domain purchasing is safely disabled. Enable it only when the billing account is ready.", {
        code: "DOMAIN_PURCHASES_DISABLED",
        status: 503,
      });
    }

    const body = await request.json().catch(() => ({}));
    const domainName = normalizeDomain(body?.domainName);

    // Cloudflare Search is cached discovery data. Always perform a fresh registry Check immediately before a billable registration.
    const checkedDomains = await checkDomains([domainName]);
    const checkedDomain = checkedDomains.find((item) => String(item?.name || "").toLowerCase() === domainName);
    const intent = assertRegistrationIntent({
      domainName,
      checkedDomain,
      expectedRegistrationCost: body?.expectedRegistrationCost,
      expectedCurrency: body?.expectedCurrency,
      acknowledgement: body?.acknowledgement,
      allowPremium: false,
    });

    const registration = await registerDomain(intent.domain);
    const status = registration.status === 202 ? 202 : 201;
    return NextResponse.json({
      success: true,
      domainName: intent.domain,
      chargedPrice: { currency: intent.currency, registrationCost: intent.registrationCost },
      registration: registration.result,
      providerStatus: registration.status,
    }, { status });
  } catch (error) {
    console.error("Domain registration error:", error?.code || error?.message || error);
    return failure(error);
  }
}
