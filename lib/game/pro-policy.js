export const GAME_CREATOR_POLICY=Object.freeze({
  product:"LANERIQ AI Game Creator",
  accessTier:"professional",
  customerLabel:"PRO · FAIR PRICE · FAIR USE",
  pricingDisplayInFeatureCards:false,
  normalUseIncluded:true,
  noSurprisePerClickCharges:true,
  commercialTerms:{
    buyoutLicenseAvailable:false,
    platformProfitSharePercent:5,
    profitShareBasis:"game_profit",
    appliesTo:"laneriq_ai_generated_games",
    continuesAfterProfessionalAccessEnds:true,
    cannotBeRemovedByBuyout:true,
    customerGameOwnershipPreserved:true,
    legalProfitDefinitionRequiredBeforeProduction:true,
    customerFacingSummary:"Games are Pro-only. Game projects do not offer a buyout license. Commercialized games created with LANERIQ AI carry a continuing 5% LANERIQ AI profit share."
  },
  fairUse:{
    maxNewGameStartsPerHour:8,
    protectSharedCompute:true,
    automatedAbuseRestricted:true,
    credentialSharingRestricted:true,
    resaleRestricted:true,
    heavyMediaMayUseAdaptiveLimits:true,
    preserveProjectsIfTemporarilyLimited:true,
  },
  platforms:["ios","android","web-preview"],
  media:["AI Art Generator","AI Video Generator","AI Photo & Video Generator","AI Avatar Creator"],
  rule:"Game creation requires active Professional access. Game projects have no buyout license and carry a continuing 5% LANERIQ AI profit share when commercialized. Fair Use protects shared compute while normal genuine creation remains included. Do not show copied third-party prices or create surprise per-click charges."
});

export function gameFairUseMessage(){
  return "LANERIQ AI Professional Game Creator uses Fair Price · Fair Use. Normal genuine creation is included; temporary safeguards may apply to unusually heavy or automated usage so service remains reliable for everyone. Game projects do not offer a buyout license and commercialized LANERIQ AI-generated games carry a continuing 5% LANERIQ AI profit share.";
}

export function gameCommercialTerms(){
  return GAME_CREATOR_POLICY.commercialTerms;
}
