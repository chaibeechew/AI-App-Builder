import {
  DATA_PROTECTION_POLICY,
  assertCreateReferenceUse,
  assertUserRequestedInput,
  canRunBackgroundAI,
  canSendToCloudAI,
} from "./data-protection-policy.js";

export function validateCreateReference({ userRequested = false, purpose } = {}) {
  if (!userRequested) throw new Error("User action required before processing an uploaded reference.");
  return assertCreateReferenceUse({ purpose });
}

export function validateDeviceInput({ source, userRequested = false } = {}) {
  return assertUserRequestedInput({ source, userRequested });
}

export function validateCloudInference({ userRequested = false, taskRequiresCloud = false } = {}) {
  if (!canSendToCloudAI({ userRequested, taskRequiresCloud })) {
    throw new Error("Cloud AI blocked: task was not explicitly requested or does not require cloud inference.");
  }
  return true;
}

export function validateBackgroundInference({ explicitBackgroundConsent = false } = {}) {
  if (!canRunBackgroundAI({ explicitBackgroundConsent })) {
    throw new Error("Background AI blocked without explicit user consent.");
  }
  return true;
}

export function getSecurityPolicy() {
  return { ...DATA_PROTECTION_POLICY };
}
