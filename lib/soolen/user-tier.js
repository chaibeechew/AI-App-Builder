import { getAppBuilderAccess } from "../app-builder-access.js";

export async function getSoolenSubscription(supabase, userId) {
  if (!supabase || !userId) {
    return { tier:"free", status:"none", planCode:null, planName:"Standard", currentPeriodEnd:null, professionalActive:false };
  }

  const access=await getAppBuilderAccess(supabase,userId);
  if(access.professional.active){
    return {
      tier:"pro",
      status:"active",
      planCode:"professional_365",
      planName:"Professional",
      currentPeriodEnd:access.professional.validUntil,
      professionalActive:true,
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
    standardProjectCredits:access.standard.projectCredits,
  };
}

export function requirePaidTier(subscription) {
  return subscription?.professionalActive === true || subscription?.tier === "pro" || subscription?.tier === "business";
}
