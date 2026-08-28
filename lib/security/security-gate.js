import { DATA_PROTECTION_POLICY, assertCreateReferenceUse, assertUserRequestedInput, canRunBackgroundAI, canSendToCloudAI } from "./data-protection-policy.js";

export const SECURITY_GATE_VERSION = "1.0.0";

export function enforceCreateReference({ source, purpose, userRequested = false } = {}) {
  assertUserRequestedInput({ source, userRequested });
  assertCreateReferenceUse({ purpose });
  return { allowed: true, policy: DATA_PROTECTION_POLICY.uploadedDataPurpose };
}

export function enforceCloudProvider({ userRequested = false, taskRequiresCloud = false } = {}) {
  return canSendToCloudAI({ userRequested, taskRequiresCloud });
}

export function enforceBackgroundRuntime({ explicitBackgroundConsent = false } = {}) {
  return canRunBackgroundAI({ explicitBackgroundConsent });
}

export function securityHeaders() {
  return {
    "Content-Security-Policy": "default-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self';",
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Permissions-Policy": "camera=(), microphone=(), geolocation=(), payment=()",
    "Cross-Origin-Opener-Policy": "same-origin",
    "Cross-Origin-Resource-Policy": "same-origin",
  };
}
