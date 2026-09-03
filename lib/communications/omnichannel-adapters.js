import { laneriqEmailProviderStatus, sendLaneriqEmail } from "../email-provider/server.js";
import { integrationStatus, sendManagedWhatsApp } from "../integrations/server.js";
import { ADAPTER_METHODS, OMNICHANNELS, adapterContractStatus, normalizeCommunicationChannel } from "./channel-contract.js";
import { inAppProviderStatus, sendInAppNotification } from "./in-app-sender.js";
import { lineProviderStatus, sendLineMessage, sendTelegramMessage, sendWeChatMessage, telegramProviderStatus, wechatProviderStatus } from "./provider-senders.js";
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
function safeRecipient(value){
  const recipient=String(value||"").trim();
  if(!recipient||recipient.length>500)throw new Error("LANERIQ communication recipient is invalid.");
  return recipient;
}
function safeResultStatus(value){
  const status=String(value||"").trim().toLowerCase();
  return ["completed","sent","delivered","queued","deferred","failed","integration_required"].includes(status)?status:"unknown";
}
function createContractAdapter(channel,sender=null){
  const safeChannel=normalizeCommunicationChannel(channel);
  return {
    channel:safeChannel,
    async send(payload={}){
      safeRecipient(payload?.to);
      if(typeof sender!=="function")return {status:"integration_required",channel:safeChannel,evidenceLevel:"CODE"};
      return sender(payload);
    },
    validateRecipient(value){return {valid:Boolean(safeRecipient(value)),channel:safeChannel};},
    checkCapability(){return {channel:safeChannel,contractReady:true,sendImplemented:typeof sender==="function",evidenceLevel:"CODE"};},
    normalizeReceipt(result={}){return {channel:safeChannel,status:safeResultStatus(result?.status),messageId:result?.messageId?String(result.messageId).slice(0,300):null};},
    normalizeError(error){
      const code=String(error?.code||"").trim().toLowerCase();
      return {channel:safeChannel,errorCode:/^[a-z0-9_:-]{1,80}$/.test(code)?code:"delivery_failed"};
    },
    async handleWebhook(){return {accepted:false,channel:safeChannel,status:"provider_webhook_not_enabled",evidenceLevel:"CODE"};},
    async getDeliveryStatus(){return {channel:safeChannel,status:"provider_status_not_enabled",evidenceLevel:"CODE"};},
  };
}

export function implementedOmnichannelSenders(){
  return {
    in_app:payload=>sendInAppNotification(payload),
    email:payload=>sendLaneriqEmail({
      to:payload?.to,
      subject:payload?.subject,
      text:payload?.body||payload?.text,
      html:payload?.html,
      purpose:payload?.purpose||"transactional",
    }),
    telegram:payload=>sendTelegramMessage(payload),
    line:payload=>sendLineMessage(payload),
    wechat:payload=>sendWeChatMessage(payload),
    whatsapp:payload=>sendManagedWhatsApp({to:payload?.to,body:payload?.body||payload?.text}),
  };
}

export function omnichannelContractAdapters(){
  const senders=implementedOmnichannelSenders();
  return Object.fromEntries(OMNICHANNELS.map(channel=>[channel,createContractAdapter(channel,senders[channel]||null)]));
}

export function omnichannelAdapterStatus(){
  const integration=integrationStatus();
  const inApp=inAppProviderStatus();
  const email=laneriqEmailProviderStatus();
  const telegram=telegramProviderStatus();
  const line=lineProviderStatus();
  const wechat=wechatProviderStatus();
  const gmailFreeQuota=String(process.env.SMTP_HOST||"").trim().toLowerCase()==="smtp.gmail.com";
  const contracts=omnichannelContractAdapters();
  const statuses={
    in_app:descriptor({channel:"in_app",runtimeReady:Boolean(inApp.ready),sendImplemented:true,costClass:COST_CLASS.FREE,health:inApp.ready?"ready":"down"}),
    push:descriptor({channel:"push",runtimeReady:envFlag("LANERIQ_PUSH_PROVIDER_READY"),sendImplemented:false,costClass:envCost("push",COST_CLASS.FREE)}),
    email:descriptor({
      channel:"email",
      runtimeReady:Boolean(email.ready),
      sendImplemented:true,
      costClass:envCost("email",gmailFreeQuota?COST_CLASS.FREE_QUOTA:COST_CLASS.UNKNOWN),
      quotaRemaining:envQuota("LANERIQ_EMAIL_FREE_QUOTA_REMAINING"),
      health:email.ready?"ready":"down",
    }),
    telegram:descriptor({channel:"telegram",runtimeReady:Boolean(telegram.configured),sendImplemented:true,costClass:envCost("telegram",COST_CLASS.UNKNOWN),quotaRemaining:envQuota("LANERIQ_TELEGRAM_FREE_QUOTA_REMAINING"),health:telegram.configured?"configured":"down"}),
    line:descriptor({channel:"line",runtimeReady:Boolean(line.configured),sendImplemented:true,costClass:envCost("line",COST_CLASS.UNKNOWN),quotaRemaining:envQuota("LANERIQ_LINE_FREE_QUOTA_REMAINING"),health:line.configured?"configured":"down"}),
    wechat:descriptor({channel:"wechat",runtimeReady:Boolean(wechat.configured),sendImplemented:true,costClass:envCost("wechat",COST_CLASS.UNKNOWN),quotaRemaining:envQuota("LANERIQ_WECHAT_FREE_QUOTA_REMAINING"),health:wechat.configured?"configured":"down"}),
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
  for(const channel of OMNICHANNELS){
    const contract=adapterContractStatus(contracts[channel]);
    statuses[channel].contractReady=contract.contractReady;
    statuses[channel].adapterMethods=Object.fromEntries(ADAPTER_METHODS.map(method=>[method,contract.methods[method]]));
  }
  return statuses;
}
