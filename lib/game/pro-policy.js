export const GAME_CREATOR_POLICY=Object.freeze({
  product:"LANERIQ AI Game Creator",
  accessTier:"professional",
  customerLabel:"PRO · FAIR PRICE · FAIR USE",
  pricingDisplayInFeatureCards:false,
  normalUseIncluded:true,
  noSurprisePerClickCharges:true,
  creatorFirst:true,
  accessPlans:{
    professional:{
      priceUsd:68,
      accessDays:365,
      autoRenew:false,
      progressiveCooldownMinutes:[30,60,120,240,480],
      maximumCooldownHours:8,
      cooldownResetsAfterQuietDays:7,
      ordinaryFeaturesRemainAvailableDuringCooldown:true,
    },
    full:{
      priceUsd:199,
      accessDays:365,
      autoRenew:false,
      ordinaryGameCooldownExempt:true,
      safetyAndAbuseProtectionStillApplies:true,
    }
  },
  commercialTerms:{
    buyoutLicenseAvailable:false,
    platformSalesSharePercent:5,
    salesShareBasis:"gross_game_sales_revenue_excluding_taxes_refunds_chargebacks",
    appliesTo:"laneriq_ai_generated_games",
    appliesAcrossAllSalesChannels:true,
    includedSalesChannels:["laneriq_ai","apple_app_store","google_play","steam","epic","console_stores","independent_website","direct_sales","other_marketplaces"],
    platformAndStoreCommissionsDoNotReduceShareBasis:true,
    continuesAfterProfessionalAccessEnds:true,
    cannotBeRemovedByBuyout:true,
    customerGameOwnershipPreserved:true,
    legalSalesReportingDefinitionRequiredBeforeProduction:true,
    customerFacingSummary:"Games are Pro-only and remain owned by the creator. Game projects do not offer a buyout license. Commercialized LANERIQ AI-generated games carry a continuing 5% LANERIQ AI share of game sales revenue across every sales channel, including sales outside LANERIQ AI."
  },
  fairUse:{
    maxNewGameStartsPerHour:8,
    protectSharedCompute:true,
    automatedAbuseRestricted:true,
    credentialSharingRestricted:true,
    resaleRestricted:true,
    heavyMediaMayUseAdaptiveLimits:true,
    preserveProjectsIfTemporarilyLimited:true,
    progressiveCooldownMinutes:[30,60,120,240,480],
    maximumCooldownHours:8,
    cooldownResetsAfterQuietDays:7,
    cooldownOnlyAffectsGameCreation:true,
    ordinaryFeaturesRemainAvailable:true,
    cooldownAutomaticallyExpires:true,
    fullAccessOrdinaryCooldownExempt:true,
  },
  platforms:["ios","android","web-preview"],
  media:["AI Art Generator","AI Video Generator","AI Photo & Video Generator","AI Avatar Creator"],
  rule:"LANERIQ AI encourages creation. Game creation requires active Professional or Full Access. Professional Game Creator uses progressive Game-only cooldowns of 30 minutes, 1 hour, 2 hours, 4 hours and at most 8 hours when unusually heavy repeated creation triggers Fair Use; App, Website and ordinary features stay available, and Game access resumes automatically when cooldown ends. Full Access removes the ordinary Game cooldown while safety and abuse protection remain. Game projects have no buyout license and carry a continuing 5% LANERIQ AI share of game sales revenue across all sales channels when commercialized."
});

export function gameFairUseMessage(){
  return "LANERIQ AI encourages creators to keep building. Professional Game Creator includes normal genuine use. If unusually heavy repeated Game creation triggers Fair Use, only new Game starts pause temporarily: 30 minutes, then 1 hour, 2 hours, 4 hours and at most 8 hours on repeated triggers. App, Website and other ordinary features remain available, saved projects are untouched, and Game creation resumes automatically when the cooldown ends. After 7 quiet days the escalation level resets. Full Access removes the ordinary Game cooldown; security and abuse safeguards still apply.";
}

export function gameCommercialTerms(){
  return GAME_CREATOR_POLICY.commercialTerms;
}
