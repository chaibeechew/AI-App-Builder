export const SOOLEN_CREATOR_RULES = Object.freeze({
  pricing: {
    transparent: true,
    showEstimateBeforeCharge: true,
    noHiddenFees: true,
    failedGenerationRefund: true,
    failedModificationRefund: true,
    modificationPricing: "complexity-based",
  },
  creation: {
    textIdea: true,
    voiceIdea: true,
    sketchUpload: true,
    referenceImageUpload: true,
    imageToAppTemplate: true,
    existingAppReferenceForModification: true,
  },
  quality: {
    selfTestBeforeSuccess: true,
    publishReadinessCheck: true,
    preserveExistingFunctionalityOnSimpleChanges: true,
    creativeIndustryAdaptation: true,
  },
  demo: {
    optional: true,
    paidUnlock: true,
    canBeEmbeddedInCreatedApp: true,
  },
  advertising: {
    maxAdsPerUserPerLocalDay: 1,
    doNotShowOnEveryAppOpen: true,
    resetByLocalCalendarDay: true,
    adFreePaidOptionSupported: true,
  },
  brand: {
    company: "Soolen AI Technologies Sdn. Bhd.",
    platform: "Soolen AI",
    primaryProduct: "AI App Builder",
  },
});

export function getDailyAdKey(userId, date = new Date()) {
  const localDate = date.toLocaleDateString("en-CA");
  return `soolen:daily-ad:${userId || "anonymous"}:${localDate}`;
}

export function shouldShowDailyAd(storage, userId, date = new Date()) {
  if (!storage) return false;
  return storage.getItem(getDailyAdKey(userId, date)) !== "shown";
}

export function markDailyAdShown(storage, userId, date = new Date()) {
  if (!storage) return false;
  storage.setItem(getDailyAdKey(userId, date), "shown");
  return true;
}
