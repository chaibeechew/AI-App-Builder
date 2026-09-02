export const LANERIQ_COMMUNICATIONS_SERVICE_POLICY = Object.freeze({
  name:"LANERIQ Launch Year Free",
  launchYearMonths:12,
  customerPlatformFee:0,
  currency:"MYR",
  channels:["email","whatsapp"],
  paidSmsEnabled:false,
  hiddenProviderFees:false,
  autoChargeCustomer:false,
  fairUse:true,
  abuseProtection:true,
  budgetProtection:true,
  overBudgetBehavior:"pause_or_use_available_free_route",
});

export function communicationServicePolicy(){
  return LANERIQ_COMMUNICATIONS_SERVICE_POLICY;
}
