import { createHash } from "node:crypto";

export const PRODUCTION_E2E_PROJECT_NAME = "LANERIQ Production E2E Validation";
export const PRODUCTION_E2E_ENTITLEMENT_SOURCE = "production_e2e_isolated_singleton";
export const PRODUCTION_E2E_CANONICAL_IDEA = [
  "LANERIQ AI Production E2E diagnostic project.",
  "Create a simple property CRM mobile app and responsive companion website with clients, properties, enquiries, appointments and notes.",
  "This is a fixed diagnostic build, not a customer-selected free project.",
  "Keep the project private and draft. Do not submit to an app store, send SMS, or require paid external providers.",
].join(" ");

export function productionE2ERequestId(userId) {
  const principal = String(userId || "").trim();
  if (!principal) return "";
  const digest = createHash("sha256")
    .update(`LANERIQ_AI_PRODUCTION_E2E_V4:${principal}`)
    .digest("hex")
    .slice(0, 32);
  return `production-e2e-v4-${digest}`;
}

export function isProductionE2ERequestId(userId, requestId) {
  const expected = productionE2ERequestId(userId);
  return Boolean(expected && String(requestId || "").trim() === expected);
}

export function publicProductionE2EIsolationPolicy() {
  return Object.freeze({
    testOnly: true,
    oneProjectPerAccount: true,
    canonicalInputEnforced: true,
    customerCreditsAllowed: false,
    projectCreditsAllowed: false,
    arbitraryPromptGenerationAllowed: false,
    storeSubmissionAllowed: false,
    smsExecutionAllowed: false,
  });
}
