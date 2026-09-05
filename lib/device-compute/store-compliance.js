export const MOTHER_AI_COMPUTE_DISCLOSURE_VERSION = "2026-09-05.1";

function text(value) { return String(value || "").trim().toLowerCase(); }

export function classifyDistribution(input = {}) {
  const ua = String(input.userAgent || "");
  const nativePlatform = text(input.nativePlatform);
  const channel = text(input.distributionChannel);
  const ios = nativePlatform === "ios" || nativePlatform === "ipados" || /iphone|ipad/i.test(ua);
  const android = nativePlatform === "android" || /android/i.test(ua);
  const desktop = ["macos","windows","linux"].includes(nativePlatform) || (!ios && !android && /macintosh|windows nt|linux/i.test(ua));
  const appStore = channel === "app_store" || channel === "apple_app_store";
  const googlePlay = channel === "google_play" || channel === "play_store";
  return Object.freeze({ ios, android, desktop, appStore, googlePlay, mobileStoreBuild: (ios && appStore) || (android && googlePlay) });
}

export function computeStoreCompliance(input = {}) {
  const distribution = classifyDistribution(input);
  const lowPowerMode = input.lowPowerMode === true;
  const thermalState = text(input.thermalState || "unknown");
  const foreground = input.visibility !== "hidden";
  const userInitiatedTask = input.userInitiatedTask !== false;

  const personalComputeAllowed = userInitiatedTask && !["serious","critical"].includes(thermalState) && !lowPowerMode;
  const backgroundPersonalComputeAllowed = distribution.ios
    ? Boolean(input.systemScheduledBackgroundTask === true && userInitiatedTask && !lowPowerMode && !["fair","serious","critical"].includes(thermalState))
    : distribution.android
      ? Boolean(input.systemManagedBackgroundWork === true && userInitiatedTask && !lowPowerMode && !["serious","critical"].includes(thermalState))
      : true;

  // Store-distributed mobile builds do not execute community workloads. This keeps
  // mobile compute tied directly to the user's own LANERIQ functionality.
  const communityComputePreferenceOffered = !distribution.mobileStoreBuild;
  const communityComputeExecutionAllowed = false;

  return Object.freeze({
    disclosureVersion: MOTHER_AI_COMPUTE_DISCLOSURE_VERSION,
    distribution,
    personalComputeAllowed,
    foregroundPersonalComputePreferred: true,
    backgroundPersonalComputeAllowed,
    communityComputePreferenceOffered,
    communityComputeExecutionAllowed,
    unrelatedBackgroundComputeAllowed: false,
    bypassSystemPowerManagementAllowed: false,
    downloadedExecutableWorkloadsAllowed: false,
    privateContentPermissionImpliedByComputeConsent: false,
    prominentDisclosureRequired: true,
    affirmativeConsentRequired: true,
    consentWithdrawalRequired: true,
    privacyNoticeRequired: true,
    dataMinimizationRequired: true,
    sensitiveCommunityWorkloadsAllowed: false,
    reason: distribution.mobileStoreBuild
      ? "mobile_store_personal_compute_only"
      : foreground ? "personal_compute_store_safe" : "background_requires_platform_controls",
  });
}

export function buildComputeConsentReceipt(input = {}) {
  const now = typeof input.timestamp === "string" && input.timestamp ? input.timestamp : new Date().toISOString();
  const purpose = input.purpose === "community_compute" ? "community_compute" : "personal_compute";
  const maxResourceShare = Math.max(0, Math.min(0.05, Number(input.maxResourceShare || 0)));
  return Object.freeze({
    receiptVersion: "mother-ai-compute-consent-v1",
    disclosureVersion: MOTHER_AI_COMPUTE_DISCLOSURE_VERSION,
    purpose,
    affirmativeAction: true,
    timestamp: now,
    withdrawnAt: null,
    platformClass: text(input.platformClass || "unknown"),
    distributionChannel: text(input.distributionChannel || "unknown"),
    mode: text(input.mode || "balanced"),
    maxResourceShare,
    backgroundCompute: input.backgroundCompute === true,
    communityCompute: purpose === "community_compute",
    privateContentPermissionGranted: false,
  });
}
