export const COST_CLASS=Object.freeze({
  FREE:"free",
  FREE_QUOTA:"free_quota",
  CUSTOMER_BILLED:"customer_billed",
  PAID:"paid",
  UNKNOWN:"unknown",
});

export const ZERO_COST_COMMUNICATION_POLICY=Object.freeze({
  mode:"zero",
  externalSpendCap:0,
  currency:"MYR",
  meteredProvidersAllowed:false,
  unknownCostProvidersAllowed:false,
  freeQuotaOverageAllowed:false,
  autoChargeCustomer:false,
  customerBilledProviderAutoSelect:false,
  paidSmsAllowed:false,
  paidWhatsAppAllowed:false,
  failClosed:true,
  channelPriority:Object.freeze([
    "in_app",
    "push",
    "email",
    "telegram",
    "line",
    "wechat",
    "whatsapp",
    "sms",
  ]),
});

function finiteQuota(value){
  if(value===null||value===undefined||value==="")return null;
  const number=Number(value);
  return Number.isFinite(number)?Math.max(0,number):null;
}

export function normalizeCostClass(value){
  const normalized=String(value||"").trim().toLowerCase();
  return Object.values(COST_CLASS).includes(normalized)?normalized:COST_CLASS.UNKNOWN;
}

export function zeroCostEligibility(adapter,{allowCustomerBilledProvider=false}={}){
  const costClass=normalizeCostClass(adapter?.costClass);
  const quotaRemaining=finiteQuota(adapter?.quotaRemaining);
  if(!adapter?.contractReady)return {allowed:false,reason:"adapter_contract_unavailable",costClass,quotaRemaining};
  if(!adapter?.runtimeReady)return {allowed:false,reason:"channel_not_ready",costClass,quotaRemaining};
  if(adapter?.health==="down")return {allowed:false,reason:"channel_unhealthy",costClass,quotaRemaining};
  if(costClass===COST_CLASS.FREE)return {allowed:true,reason:"free_route",costClass,quotaRemaining};
  if(costClass===COST_CLASS.FREE_QUOTA){
    if(quotaRemaining===null)return {allowed:false,reason:"free_quota_unknown",costClass,quotaRemaining};
    if(quotaRemaining<=0)return {allowed:false,reason:"free_quota_exhausted",costClass,quotaRemaining};
    return {allowed:true,reason:"free_quota_available",costClass,quotaRemaining};
  }
  if(costClass===COST_CLASS.CUSTOMER_BILLED){
    return allowCustomerBilledProvider
      ? {allowed:true,reason:"customer_billed_explicitly_allowed",costClass,quotaRemaining}
      : {allowed:false,reason:"customer_billed_requires_explicit_consent",costClass,quotaRemaining};
  }
  if(costClass===COST_CLASS.PAID)return {allowed:false,reason:"paid_provider_blocked_in_zero_mode",costClass,quotaRemaining};
  return {allowed:false,reason:"unknown_cost_blocked_in_zero_mode",costClass,quotaRemaining};
}

export function zeroCostPolicy(){return ZERO_COST_COMMUNICATION_POLICY;}
