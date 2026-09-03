import { laneriqEmailProviderStatus, sendLaneriqEmail } from "../email-provider/server.js";
import { integrationStatus, sendManagedWhatsApp } from "../integrations/server.js";
import { COST_CLASS, normalizeCostClass } from "./zero-cost-policy.js";

function envFlag(name){return String(process.env[name]||"").trim().toLowerCase()==="true";}
function envQuota(name){
  const raw=String(process.env[name]||"").trim();
  if(!raw)return null;
  const number=Number(raw);
  return Number.isFinite(number)?Math.max(0,number):null;
}
function envCost(channel,fallback=COST_CLASS.UNKNOWN){
  const key=`LANERIQ_${channel.toUpperCase()}_COST_CLASS`;
  const configured=String(process.env[key]||"").trim();
  return configured?normalizeCostClass(configured):fallback;
}
function descriptor({channel,runtimeReady=false,sendImplemented=false,costClass=COST_CLASS.UNKNOWN,quotaRemaining=null,health="unknown"}){
  return {
    channel,
    contractReady:true,
    runtimeReady:Boolean(runtimeReady&&sendImplemented),
    providerReady:Boolean(runtimeReady&&sendImplemented),
    sendImplemented:Boolean(sendImplemented),
    liveVerified:false,
    costClass,
    quotaRemaining,
    health,
    evidenceLevel:"CODE",
  };
}

export function omnichannelAdapterStatus(){
  const integration=integrationStatus();
  const email=laneriqEmailProviderStatus();
  const gmailFreeQuota=String(process.env.SMTP_HOST||"").trim().toLowerCase()==="smtp.gmail.com";
  return {
    in_app:descriptor({channel:"in_app",runtimeReady:false,sendImplemented:false,costClass:COST_CLASS.FREE}),
    push:descriptor({channel:"push",runtimeReady:envFlag("LANERIQ_PUSH_PROVIDER_READY"),sendImplemented:false,costClass:envCost("push",COST_CLASS.FREE)}),
    email:descriptor({
      channel:"email",
      runtimeReady:Boolean(email.ready),
      sendImplemented:true,
      costClass:envCost("email",gmailFreeQuota?COST_CLASS.FREE_QUOTA:COST_CLASS.UNKNOWN),
      quotaRemaining:envQuota("LANERIQ_EMAIL_FREE_QUOTA_REMAINING"),
      health:email.ready?"ready":"down",
    }),
    telegram:descriptor({channel:"telegram",runtimeReady:envFlag("LANERIQ_TELEGRAM_PROVIDER_READY"),sendImplemented:false,costClass:envCost("telegram",COST_CLASS.UNKNOWN),quotaRemaining:envQuota("LANERIQ_TELEGRAM_FREE_QUOTA_REMAINING")}),
    line:descriptor({channel:"line",runtimeReady:envFlag("LANERIQ_LINE_PROVIDER_READY"),sendImplemented:false,costClass:envCost("line",COST_CLASS.UNKNOWN),quotaRemaining:envQuota("LANERIQ_LINE_FREE_QUOTA_REMAINING")}),
    wechat:descriptor({channel:"wechat",runtimeReady:envFlag("LANERIQ_WECHAT_PROVIDER_READY"),sendImplemented:false,costClass:envCost("wechat",COST_CLASS.UNKNOWN),quotaRemaining:envQuota("LANERIQ_WECHAT_FREE_QUOTA_REMAINING")}),
    whatsapp:descriptor({
      channel:"whatsapp",
      runtimeReady:Boolean(integration.whatsapp?.ready),
      sendImplemented:true,
      costClass:envCost("whatsapp",COST_CLASS.PAID),
      quotaRemaining:envQuota("LANERIQ_WHATSAPP_FREE_QUOTA_REMAINING"),
      health:integration.whatsapp?.ready?"ready":"down",
    }),
    sms:descriptor({channel:"sms",runtimeReady:envFlag("LANERIQ_SMS_PROVIDER_READY"),sendImplemented:false,costClass:envCost("sms",COST_CLASS.PAID),quotaRemaining:envQuota("LANERIQ_SMS_FREE_QUOTA_REMAINING")}),
  };
}

export function implementedOmnichannelSenders(){
  return {
    email:payload=>sendLaneriqEmail({
      to:payload?.to,
      subject:payload?.subject,
      text:payload?.body||payload?.text,
      html:payload?.html,
      purpose:payload?.purpose||"transactional",
    }),
    whatsapp:payload=>sendManagedWhatsApp({to:payload?.to,body:payload?.body||payload?.text}),
  };
}
