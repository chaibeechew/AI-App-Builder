import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  assertRegistrarUserAllowed,
  assertRegistrationIntent,
  normalizeDomain,
  registrarPurchasesEnabled,
} from "../lib/domains/cloudflare-registrar.js";

const root = process.cwd();

assert.equal(normalizeDomain(" LANERIQAI.COM. "), "laneriqai.com");
assert.throws(() => normalizeDomain("https://laneriqai.com"), /ASCII domain names|valid domain/i);
assert.throws(() => normalizeDomain("laneriq_ai.com"), /ASCII domain names|valid domain/i);
assert.throws(() => normalizeDomain("例子.com"), /ASCII domain names/i);

assert.equal(registrarPurchasesEnabled({ DOMAIN_REGISTRAR_PURCHASE_ENABLED: "false" }), false);
assert.equal(registrarPurchasesEnabled({ DOMAIN_REGISTRAR_PURCHASE_ENABLED: "true" }), true);
assert.equal(registrarPurchasesEnabled({}), false);

assert.throws(
  () => assertRegistrarUserAllowed({ email: "owner@example.com" }, {}),
  (error) => error?.code === "DOMAIN_REGISTRAR_ALLOWLIST_REQUIRED" && error?.status === 503,
);
assert.equal(
  assertRegistrarUserAllowed(
    { email: "Owner@Example.com" },
    { DOMAIN_REGISTRAR_ALLOWED_EMAILS: "admin@example.com, owner@example.com" },
  ),
  true,
);
assert.throws(
  () => assertRegistrarUserAllowed(
    { email: "attacker@example.com" },
    { DOMAIN_REGISTRAR_ALLOWED_EMAILS: "owner@example.com" },
  ),
  (error) => error?.code === "DOMAIN_REGISTRAR_FORBIDDEN" && error?.status === 403,
);

const checked = {
  name: "laneriqai.com",
  registrable: true,
  tier: "standard",
  pricing: { currency: "USD", registration_cost: "8.57", renewal_cost: "8.57" },
};

assert.deepEqual(
  assertRegistrationIntent({
    domainName: "laneriqai.com",
    checkedDomain: checked,
    expectedRegistrationCost: "8.57",
    expectedCurrency: "USD",
    acknowledgement: "REGISTER laneriqai.com",
    env: { DOMAIN_REGISTRAR_MAX_USD: "25" },
  }),
  { domain: "laneriqai.com", currency: "USD", registrationCost: "8.57", tier: "standard" },
);

assert.throws(
  () => assertRegistrationIntent({
    domainName: "laneriqai.com",
    checkedDomain: checked,
    expectedRegistrationCost: "6.79",
    expectedCurrency: "USD",
    acknowledgement: "REGISTER laneriqai.com",
    env: { DOMAIN_REGISTRAR_MAX_USD: "25" },
  }),
  (error) => error?.code === "DOMAIN_PRICE_CHANGED",
);

assert.throws(
  () => assertRegistrationIntent({
    domainName: "laneriqai.com",
    checkedDomain: { ...checked, pricing: { ...checked.pricing, registration_cost: "30.00" } },
    expectedRegistrationCost: "30.00",
    expectedCurrency: "USD",
    acknowledgement: "REGISTER laneriqai.com",
    env: { DOMAIN_REGISTRAR_MAX_USD: "25" },
  }),
  (error) => error?.code === "DOMAIN_PRICE_LIMIT_EXCEEDED",
);

assert.throws(
  () => assertRegistrationIntent({
    domainName: "laneriqai.com",
    checkedDomain: { ...checked, tier: "premium" },
    expectedRegistrationCost: "8.57",
    expectedCurrency: "USD",
    acknowledgement: "REGISTER laneriqai.com",
    env: { DOMAIN_REGISTRAR_MAX_USD: "25" },
  }),
  (error) => error?.code === "PREMIUM_DOMAIN_REQUIRES_APPROVAL",
);

assert.throws(
  () => assertRegistrationIntent({
    domainName: "laneriqai.com",
    checkedDomain: checked,
    expectedRegistrationCost: "8.57",
    expectedCurrency: "USD",
    acknowledgement: "yes",
    env: { DOMAIN_REGISTRAR_MAX_USD: "25" },
  }),
  (error) => error?.code === "DOMAIN_REGISTRATION_CONFIRMATION_REQUIRED",
);

const registerRoute = fs.readFileSync(path.join(root, "app/api/domains/register/route.js"), "utf8");
const domainPage = fs.readFileSync(path.join(root, "app/domains/page.js"), "utf8");
assert.match(registerRoute, /registrarPurchasesEnabled\(\)/, "Billable registration must be protected by the server purchase switch.");
assert.match(registerRoute, /checkDomains\(\[domainName\]\)/, "Registration must re-check registry price immediately before purchase.");
assert.match(registerRoute, /assertRegistrarUserAllowed\(user\)/, "Registration must require an explicit operator allowlist.");
assert.doesNotMatch(domainPage, /CLOUDFLARE_REGISTRAR_API_TOKEN|CLOUDFLARE_REGISTRAR_ACCOUNT_ID/, "Registrar secrets must never appear in the client page.");

console.log("Domain registrar contract tests passed.");
