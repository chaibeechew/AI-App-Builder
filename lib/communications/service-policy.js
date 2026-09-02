export const LANERIQ_COMMUNICATIONS_SERVICE_POLICY = Object.freeze({
  name:"LANERIQ Launch Year Free",
  version:"2026-09-hardening-v2",
  launchYearMonths:12,
  customerPlatformFee:0,
  currency:"MYR",
  channels:Object.freeze(["email","whatsapp"]),
  paidSmsEnabled:false,
  paidSmsFallback:false,
  providerFallbackAcrossChannels:false,
  hiddenProviderFees:false,
  passThroughProviderFees:false,
  autoChargeCustomer:false,
  providerCostAbsorbedByLaneriqDuringLaunchYear:true,
  fairUse:true,
  abuseProtection:true,
  budgetProtection:true,
  idempotencyRequired:true,
  persistentRateLimits:true,
  recipientStoredAsHashOnly:true,
  messageBodyStored:false,
  providerOpaqueToGeneratedApps:true,
  storeAdapterReplaceable:true,
  deliveryAdapterReplaceable:true,
  overBudgetBehavior:"pause_or_use_available_free_route",
  billingFailureBehavior:"never_auto_charge_customer",
});

export function communicationServicePolicy(){
  return LANERIQ_COMMUNICATIONS_SERVICE_POLICY;
}
