/**
 * Soolen AI data-minimization and local-first security policy.
 * These rules are application defaults, not a guarantee of zero security risk.
 */
export const DATA_PROTECTION_POLICY = Object.freeze({
  dataMinimization: true,
  collectOnlyUserRequestedData: true,
  noUnrequestedDeviceScanning: true,
  noContactsAccessByDefault: true,
  noSmsAccessByDefault: true,
  noPhotoLibraryAccessByDefault: true,
  noFileAccessByDefault: true,
  noSilentBackgroundAi: true,
  localAiFirst: true,
  noUserContentTrainingByDefault: true,
  noAdTargetingFromUserContent: true,
  noSaleOfUserData: true,
  cloudAiRequiresUserRequestedTask: true,
});

const FORBIDDEN_UNREQUESTED_SOURCES = new Set([
  "contacts",
  "sms",
  "call_logs",
  "photo_library",
  "microphone",
  "camera",
  "device_files",
  "location_history",
]);

export function assertUserRequestedInput({ source, userRequested = false } = {}) {
  if (!userRequested && FORBIDDEN_UNREQUESTED_SOURCES.has(String(source))) {
    throw new Error(`Soolen AI blocked unrequested access to ${source}.`);
  }
  return true;
}

export function canSendToCloudAI({ userRequested = false, taskRequiresCloud = false } = {}) {
  return Boolean(userRequested && taskRequiresCloud);
}

export function canRunBackgroundAI({ explicitBackgroundConsent = false } = {}) {
  return Boolean(explicitBackgroundConsent);
}

export const SECURITY_PRINCIPLES = [
  "User-provided data remains the user's data.",
  "Only data needed for a user-requested function may be processed.",
  "Unrequested device data access is blocked by default.",
  "Local AI is preferred where practical.",
  "Cloud AI is used only for a user-requested task that requires it.",
  "AI must not silently continue in the background by default.",
  "User content is not used for model training by default.",
];
