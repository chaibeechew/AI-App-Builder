export const OMNICHANNELS=Object.freeze([
  "in_app",
  "push",
  "email",
  "telegram",
  "line",
  "wechat",
  "whatsapp",
  "sms",
]);

export const ADAPTER_METHODS=Object.freeze([
  "send",
  "validateRecipient",
  "checkCapability",
  "normalizeReceipt",
  "normalizeError",
  "handleWebhook",
  "getDeliveryStatus",
]);

const CHANNEL_SET=new Set(OMNICHANNELS);

export function normalizeCommunicationChannel(value){
  const channel=String(value||"").trim().toLowerCase().replace(/[-\s]+/g,"_");
  if(!CHANNEL_SET.has(channel))throw new Error("Unsupported LANERIQ communication channel.");
  return channel;
}

export function adapterContractStatus(adapter){
  const channel=normalizeCommunicationChannel(adapter?.channel);
  const methods=Object.fromEntries(ADAPTER_METHODS.map(method=>[method,typeof adapter?.[method]==="function"]));
  return {
    channel,
    contractReady:ADAPTER_METHODS.every(method=>methods[method]),
    methods,
  };
}

export function assertCommunicationAdapter(adapter){
  const status=adapterContractStatus(adapter);
  if(!status.contractReady){
    const missing=ADAPTER_METHODS.filter(method=>!status.methods[method]);
    throw new Error(`LANERIQ ${status.channel} adapter is missing: ${missing.join(", ")}.`);
  }
  return adapter;
}

export function providerReadyStatus({channel,configured=false,sendImplemented=false,liveVerified=false}={}){
  return {
    channel:normalizeCommunicationChannel(channel),
    contractReady:true,
    providerReady:Boolean(configured&&sendImplemented),
    liveVerified:Boolean(liveVerified&&configured&&sendImplemented),
  };
}
