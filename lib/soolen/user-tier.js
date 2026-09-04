import { getAppBuilderAccess } from "../app-builder-access.js";

export async function getSoolenSubscription(supabase, userId) {
  if (!supabase || !userId) {
    return { tier:"free", status:"none", planCode:null, planName:"Standard", currentPeriodEnd:null, professionalActive:false, creatorSupportActive:false };
  }

  const access=await getAppBuilderAccess(supabase,userId);
  if(access.creatorSupport?.active){
    return {
      tier:"business",
      status:"active",
      planCode:"creator_support_3m_all_features",
      planName:"Creator Support",
      currentPeriodEnd:access.creatorSupport.validUntil,
      professionalActive:true,
      creatorSupportActive:true,
      individualOnly:true,
      allFeatures:true,
      daysRemaining:access.creatorSupport.daysRemaining,
      extensionCount:access.creatorSupport.extensionCount,
    };
  }
  if(access.professional.active){
    return {
      tier:"pro",
      status:"active",
      planCode:"professional_365",
      planName:"Professional",
      currentPeriodEnd:access.professional.validUntil,
      professionalActive:true,
      creatorSupportActive:false,
      daysRemaining:access.professional.daysRemaining,
    };
  }

  return {
    tier:"free",
    status:"standard",
    planCode:"standard",
    planName:"Standard",
    currentPeriodEnd:null,
    professionalActive:false,
    creatorSupportActive:false,
    standardProjectCredits:access.standard.projectCredits,
  };
}

export function requirePaidTier(subscription) {
  return subscription?.professionalActive === true || subscription?.creatorSupportActive === true || subscription?.tier === "pro" || subscription?.tier === "business";
}
