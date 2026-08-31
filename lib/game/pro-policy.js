export const GAME_CREATOR_POLICY=Object.freeze({
  product:"Mobile Game Creator",
  accessTier:"professional",
  customerLabel:"PRO · FAIR PRICE · FAIR USE",
  pricingDisplayInFeatureCards:false,
  normalUseIncluded:true,
  noSurprisePerClickCharges:true,
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
  rule:"Game creation requires active Professional access. Fair Use protects shared compute while normal genuine creation remains included. Do not show copied third-party prices or create surprise per-click charges."
});

export function gameFairUseMessage(){
  return "Professional Game Creator uses Fair Price · Fair Use. Normal genuine creation is included; temporary safeguards may apply to unusually heavy or automated usage so service remains reliable for everyone.";
}
