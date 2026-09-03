const CLOUDFLARE_API_BASE = "https://api.cloudflare.com/client/v4";

export class DomainRegistrarError extends Error {
  constructor(message, { code = "DOMAIN_REGISTRAR_ERROR", status = 400, details = null } = {}) {
    super(message);
    this.name = "DomainRegistrarError";
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

export function normalizeDomain(value) {
  const domain = String(value || "").trim().toLowerCase().replace(/\.$/, "");
  if (!domain || domain.length > 253) {
    throw new DomainRegistrarError("Enter a valid domain name.", { code: "INVALID_DOMAIN" });
  }
  if (!/^[a-z0-9.-]+$/.test(domain) || !domain.includes(".")) {
    throw new DomainRegistrarError("Only standard ASCII domain names are supported by this registrar flow.", { code: "INVALID_DOMAIN" });
  }
  const labels = domain.split(".");
  if (labels.some((label) => !label || label.length > 63 || !/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(label))) {
    throw new DomainRegistrarError("Enter a valid domain name.", { code: "INVALID_DOMAIN" });
  }
  return domain;
}

export function registrarConfig(env = process.env) {
  const accountId = String(env.CLOUDFLARE_REGISTRAR_ACCOUNT_ID || "").trim();
  const apiToken = String(env.CLOUDFLARE_REGISTRAR_API_TOKEN || "").trim();
  if (!accountId || !apiToken) {
    throw new DomainRegistrarError("Domain registrar is not configured yet.", {
      code: "DOMAIN_REGISTRAR_NOT_CONFIGURED",
      status: 503,
    });
  }
  return { accountId, apiToken };
}

export function registrarPurchasesEnabled(env = process.env) {
  return String(env.DOMAIN_REGISTRAR_PURCHASE_ENABLED || "false").trim().toLowerCase() === "true";
}

export function allowedRegistrarEmails(env = process.env) {
  return String(env.DOMAIN_REGISTRAR_ALLOWED_EMAILS || "")
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
}

export function assertRegistrarUserAllowed(user, env = process.env) {
  const email = String(user?.email || "").trim().toLowerCase();
  const allowed = allowedRegistrarEmails(env);
  if (!allowed.length) {
    throw new DomainRegistrarError("Domain purchase access is not configured.", {
      code: "DOMAIN_REGISTRAR_ALLOWLIST_REQUIRED",
      status: 503,
    });
  }
  if (!email || !allowed.includes(email)) {
    throw new DomainRegistrarError("You do not have permission to purchase domains from this account.", {
      code: "DOMAIN_REGISTRAR_FORBIDDEN",
      status: 403,
    });
  }
  return true;
}

export function maxRegistrationCostUsd(env = process.env) {
  const parsed = Number(env.DOMAIN_REGISTRAR_MAX_USD || 25);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 25;
}

function money(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : NaN;
}

export function assertRegistrationIntent({
  domainName,
  checkedDomain,
  expectedRegistrationCost,
  expectedCurrency,
  acknowledgement,
  allowPremium = false,
  env = process.env,
}) {
  const domain = normalizeDomain(domainName);
  const current = checkedDomain || {};
  const currentName = normalizeDomain(current.name || domain);
  if (currentName !== domain || current.registrable !== true) {
    throw new DomainRegistrarError("This domain is not registrable right now.", {
      code: "DOMAIN_NOT_REGISTRABLE",
      status: 409,
    });
  }

  const currency = String(current?.pricing?.currency || "").trim().toUpperCase();
  const registrationCost = String(current?.pricing?.registration_cost || "").trim();
  if (!currency || !registrationCost || !Number.isFinite(money(registrationCost))) {
    throw new DomainRegistrarError("Current registration pricing is unavailable.", {
      code: "DOMAIN_PRICE_UNAVAILABLE",
      status: 409,
    });
  }

  if (String(expectedCurrency || "").trim().toUpperCase() !== currency || String(expectedRegistrationCost || "").trim() !== registrationCost) {
    throw new DomainRegistrarError("The domain price changed. Review the latest price before purchasing.", {
      code: "DOMAIN_PRICE_CHANGED",
      status: 409,
      details: { currency, registrationCost },
    });
  }

  const tier = String(current.tier || "standard").trim().toLowerCase();
  if (tier !== "standard" && allowPremium !== true) {
    throw new DomainRegistrarError("Premium domains require a separate explicit approval flow.", {
      code: "PREMIUM_DOMAIN_REQUIRES_APPROVAL",
      status: 409,
    });
  }

  if (currency === "USD" && money(registrationCost) > maxRegistrationCostUsd(env)) {
    throw new DomainRegistrarError("This domain exceeds the configured purchase safety limit.", {
      code: "DOMAIN_PRICE_LIMIT_EXCEEDED",
      status: 409,
    });
  }

  const requiredAcknowledgement = `REGISTER ${domain}`;
  if (String(acknowledgement || "").trim() !== requiredAcknowledgement) {
    throw new DomainRegistrarError(`Type ${requiredAcknowledgement} to confirm this billable registration.`, {
      code: "DOMAIN_REGISTRATION_CONFIRMATION_REQUIRED",
      status: 400,
    });
  }

  return { domain, currency, registrationCost, tier };
}

function safeProviderErrors(payload) {
  const errors = Array.isArray(payload?.errors) ? payload.errors : [];
  return errors.slice(0, 5).map((item) => ({
    code: item?.code ?? null,
    message: String(item?.message || "Cloudflare Registrar request failed.").slice(0, 300),
  }));
}

export async function cloudflareRegistrarRequest(path, { method = "GET", body, preferAsync = false, env = process.env } = {}) {
  const { accountId, apiToken } = registrarConfig(env);
  const url = `${CLOUDFLARE_API_BASE}/accounts/${encodeURIComponent(accountId)}/registrar/${path}`;
  const headers = {
    Authorization: `Bearer ${apiToken}`,
    Accept: "application/json",
  };
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (preferAsync) headers.Prefer = "respond-async";

  let response;
  try {
    response = await fetch(url, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      cache: "no-store",
      signal: typeof AbortSignal?.timeout === "function" ? AbortSignal.timeout(15000) : undefined,
    });
  } catch (error) {
    throw new DomainRegistrarError("Unable to reach the domain registrar.", {
      code: "DOMAIN_REGISTRAR_UNAVAILABLE",
      status: 502,
      details: { message: String(error?.message || "Network error").slice(0, 200) },
    });
  }

  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload?.success !== true) {
    throw new DomainRegistrarError("Cloudflare Registrar rejected the request.", {
      code: "DOMAIN_REGISTRAR_API_ERROR",
      status: response.status >= 400 && response.status < 500 ? 409 : 502,
      details: { providerStatus: response.status, errors: safeProviderErrors(payload) },
    });
  }
  return { status: response.status, result: payload.result, messages: payload.messages || [] };
}

export async function searchDomains(query, { limit = 8, env = process.env } = {}) {
  const q = String(query || "").trim();
  if (!q) throw new DomainRegistrarError("Search text is required.", { code: "DOMAIN_SEARCH_REQUIRED" });
  const safeLimit = Math.max(1, Math.min(20, Number(limit) || 8));
  const response = await cloudflareRegistrarRequest(`domain-search?q=${encodeURIComponent(q)}&limit=${safeLimit}`, { env });
  return Array.isArray(response?.result?.domains) ? response.result.domains : [];
}

export async function checkDomains(domainNames, { env = process.env } = {}) {
  const domains = [...new Set((Array.isArray(domainNames) ? domainNames : [domainNames]).map(normalizeDomain))];
  if (!domains.length || domains.length > 20) {
    throw new DomainRegistrarError("Check between 1 and 20 domains at a time.", { code: "DOMAIN_CHECK_LIMIT" });
  }
  const response = await cloudflareRegistrarRequest("domain-check", {
    method: "POST",
    body: { domains },
    env,
  });
  return Array.isArray(response?.result?.domains) ? response.result.domains : [];
}

export async function registerDomain(domainName, { env = process.env } = {}) {
  const domain = normalizeDomain(domainName);
  return cloudflareRegistrarRequest("registrations", {
    method: "POST",
    body: { domain_name: domain },
    preferAsync: true,
    env,
  });
}

export async function registrationStatus(domainName, { env = process.env } = {}) {
  const domain = normalizeDomain(domainName);
  return cloudflareRegistrarRequest(`registrations/${encodeURIComponent(domain)}/registration-status`, { env });
}
