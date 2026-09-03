import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { OMNICHANNELS, ADAPTER_METHODS, adapterContractStatus } from '../lib/communications/channel-contract.js';
import { COST_CLASS, ZERO_COST_COMMUNICATION_POLICY, zeroCostEligibility } from '../lib/communications/zero-cost-policy.js';
import { planZeroCostCommunication, deliverZeroCostCommunication } from '../lib/communications/omnichannel-router.js';

const root=process.cwd();
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const servicePolicy=read('lib/communications/service-policy.js');
const adaptersSource=read('lib/communications/omnichannel-adapters.js');
const deliverySource=read('lib/communications/zero-cost-delivery.js');

assert.deepEqual(OMNICHANNELS,[
  'in_app','push','email','telegram','line','wechat','whatsapp','sms',
]);
assert.deepEqual(ADAPTER_METHODS,[
  'send','validateRecipient','checkCapability','normalizeReceipt','normalizeError','handleWebhook','getDeliveryStatus',
]);
assert.equal(ZERO_COST_COMMUNICATION_POLICY.mode,'zero');
assert.equal(ZERO_COST_COMMUNICATION_POLICY.externalSpendCap,0);
assert.equal(ZERO_COST_COMMUNICATION_POLICY.meteredProvidersAllowed,false);
assert.equal(ZERO_COST_COMMUNICATION_POLICY.unknownCostProvidersAllowed,false);
assert.equal(ZERO_COST_COMMUNICATION_POLICY.freeQuotaOverageAllowed,false);
assert.equal(ZERO_COST_COMMUNICATION_POLICY.autoChargeCustomer,false);
assert.equal(ZERO_COST_COMMUNICATION_POLICY.customerBilledProviderAutoSelect,false);
assert.equal(ZERO_COST_COMMUNICATION_POLICY.paidSmsAllowed,false);
assert.equal(ZERO_COST_COMMUNICATION_POLICY.paidWhatsAppAllowed,false);
assert.equal(ZERO_COST_COMMUNICATION_POLICY.failClosed,true);

const fullAdapter={
  channel:'email',
  send(){},
  validateRecipient(){},
  checkCapability(){},
  normalizeReceipt(){},
  normalizeError(){},
  handleWebhook(){},
  getDeliveryStatus(){},
};
assert.equal(adapterContractStatus(fullAdapter).contractReady,true);
assert.equal(adapterContractStatus({...fullAdapter,getDeliveryStatus:null}).contractReady,false);

assert.deepEqual(
  zeroCostEligibility({contractReady:true,runtimeReady:true,costClass:COST_CLASS.PAID}),
  {allowed:false,reason:'paid_provider_blocked_in_zero_mode',costClass:'paid',quotaRemaining:null},
);
assert.deepEqual(
  zeroCostEligibility({contractReady:true,runtimeReady:true,costClass:COST_CLASS.UNKNOWN}),
  {allowed:false,reason:'unknown_cost_blocked_in_zero_mode',costClass:'unknown',quotaRemaining:null},
);
assert.equal(zeroCostEligibility({contractReady:true,runtimeReady:true,costClass:COST_CLASS.FREE_QUOTA,quotaRemaining:null}).allowed,false);
assert.equal(zeroCostEligibility({contractReady:true,runtimeReady:true,costClass:COST_CLASS.FREE_QUOTA,quotaRemaining:0}).allowed,false);
assert.equal(zeroCostEligibility({contractReady:true,runtimeReady:true,costClass:COST_CLASS.FREE_QUOTA,quotaRemaining:1}).allowed,true);
assert.equal(zeroCostEligibility({contractReady:true,runtimeReady:true,costClass:COST_CLASS.FREE}).allowed,true);
assert.equal(zeroCostEligibility({contractReady:true,runtimeReady:false,costClass:COST_CLASS.FREE}).allowed,false);
assert.equal(zeroCostEligibility({contractReady:true,runtimeReady:true,costClass:COST_CLASS.CUSTOMER_BILLED}).allowed,false);
assert.equal(zeroCostEligibility({contractReady:true,runtimeReady:true,costClass:COST_CLASS.CUSTOMER_BILLED},{allowCustomerBilledProvider:true}).allowed,true);

const adapters={
  in_app:{channel:'in_app',contractReady:true,runtimeReady:false,costClass:COST_CLASS.FREE},
  push:{channel:'push',contractReady:true,runtimeReady:false,costClass:COST_CLASS.FREE},
  email:{channel:'email',contractReady:true,runtimeReady:true,costClass:COST_CLASS.FREE_QUOTA,quotaRemaining:20},
  telegram:{channel:'telegram',contractReady:true,runtimeReady:true,costClass:COST_CLASS.FREE},
  line:{channel:'line',contractReady:true,runtimeReady:true,costClass:COST_CLASS.FREE_QUOTA,quotaRemaining:0},
  wechat:{channel:'wechat',contractReady:true,runtimeReady:true,costClass:COST_CLASS.UNKNOWN},
  whatsapp:{channel:'whatsapp',contractReady:true,runtimeReady:true,costClass:COST_CLASS.PAID},
  sms:{channel:'sms',contractReady:true,runtimeReady:true,costClass:COST_CLASS.PAID},
};

const plan=planZeroCostCommunication({adapters,preferredChannels:['sms','email','telegram']});
assert.equal(plan.externalSpendCap,0);
assert.equal(plan.failClosed,true);
assert.equal(plan.selected,'email');
assert.deepEqual(plan.routes.map(route=>route.channel),['email','telegram']);
assert.equal(plan.blocked.find(route=>route.channel==='sms')?.reason,'paid_provider_blocked_in_zero_mode');
assert.equal(plan.blocked.find(route=>route.channel==='wechat')?.reason,'unknown_cost_blocked_in_zero_mode');
assert.equal(plan.blocked.find(route=>route.channel==='line')?.reason,'free_quota_exhausted');

let smsCalls=0;
let emailCalls=0;
let telegramCalls=0;
const delivered=await deliverZeroCostCommunication({
  adapters,
  preferredChannels:['sms','email','telegram'],
  payload:{to:'redacted',body:'verification'},
  senders:{
    sms:async()=>{smsCalls+=1;return {status:'completed'};},
    email:async()=>{emailCalls+=1;return {status:'failed'};},
    telegram:async()=>{telegramCalls+=1;return {status:'completed'};},
  },
});
assert.equal(delivered.status,'completed');
assert.equal(delivered.channel,'telegram');
assert.equal(delivered.externalSpend,0);
assert.equal(smsCalls,0,'Paid SMS must never be invoked in ZERO mode.');
assert.equal(emailCalls,1);
assert.equal(telegramCalls,1);

const noFreeRoute=await deliverZeroCostCommunication({
  adapters:{sms:adapters.sms,whatsapp:adapters.whatsapp},
  preferredChannels:['sms','whatsapp'],
  payload:{body:'x'},
  senders:{
    sms:async()=>{throw new Error('paid sender must not run');},
    whatsapp:async()=>{throw new Error('paid sender must not run');},
  },
});
assert.equal(noFreeRoute.status,'zero_cost_route_unavailable');
assert.equal(noFreeRoute.externalSpend,0);
assert.equal(noFreeRoute.attempts.length,0);

assert.match(servicePolicy,/defaultMode:"zero"/);
assert.match(servicePolicy,/externalSpendCap:0/);
assert.match(servicePolicy,/channels:Object\.freeze\(\["in_app","push","email","telegram","line","wechat","whatsapp","sms"\]\)/);
assert.match(servicePolicy,/omnichannelRouterEnabled:true/);
assert.match(servicePolicy,/paidSmsEnabled:false/);
assert.match(servicePolicy,/paidSmsFallback:false/);
assert.match(servicePolicy,/meteredProvidersAllowedInZeroMode:false/);
assert.match(servicePolicy,/unknownCostProvidersAllowedInZeroMode:false/);
assert.match(servicePolicy,/freeQuotaOverageAllowed:false/);
assert.match(servicePolicy,/customerBilledProviderAutoSelect:false/);
assert.match(servicePolicy,/fallbackRequiresZeroCostEligibility:true/);
assert.match(servicePolicy,/costMetadataRequiredBeforeZeroModeSend:true/);
assert.match(servicePolicy,/quotaMetadataRequiredForFreeQuotaRoutes:true/);
assert.match(servicePolicy,/configuredProvider:"PROVIDER_READY"/);
assert.match(servicePolicy,/successfulExternalDelivery:"LIVE"/);
assert.match(servicePolicy,/physicalPhoneReceipt:"DEVICE_VERIFIED"/);

assert.match(adaptersSource,/email:descriptor/);
assert.match(adaptersSource,/whatsapp:descriptor/);
assert.match(adaptersSource,/sms:descriptor/);
assert.match(adaptersSource,/wechat:descriptor/);
assert.match(adaptersSource,/line:descriptor/);
assert.match(adaptersSource,/telegram:descriptor/);
assert.match(adaptersSource,/push:descriptor/);
assert.match(adaptersSource,/in_app:descriptor/);
assert.match(adaptersSource,/liveVerified:false/);
assert.match(adaptersSource,/evidenceLevel:"CODE"/);
assert.match(adaptersSource,/sms.*sendImplemented:false/s);
assert.match(adaptersSource,/wechat.*sendImplemented:false/s);
assert.match(adaptersSource,/line.*sendImplemented:false/s);
assert.match(adaptersSource,/telegram.*sendImplemented:false/s);
assert.match(adaptersSource,/whatsapp[\s\S]*COST_CLASS\.PAID/);
assert.match(adaptersSource,/sms[\s\S]*COST_CLASS\.PAID/);
assert.match(adaptersSource,/LANERIQ_EMAIL_FREE_QUOTA_REMAINING/);
assert.match(deliverySource,/deliverWithZeroExternalSpend/);
assert.match(deliverySource,/externalSpendCap/);
assert.match(deliverySource,/evidenceLevel:"CODE"/);
assert.match(deliverySource,/liveVerified:false/);

console.log('✓ LANERIQ OmniChannel contract covers In-App, Push, Email, Telegram, LINE, WeChat, WhatsApp and SMS');
console.log('✓ ZERO mode is fail-closed with RM0 external spend cap and blocks PAID/UNKNOWN routes');
console.log('✓ FREE_QUOTA routes require explicit remaining quota and cannot overrun into paid usage');
console.log('✓ Paid SMS and paid WhatsApp cannot be invoked by ZERO-mode fallback');
console.log('✓ Customer-billed/BYOP routes require explicit consent and are never auto-selected');
console.log('✓ Multi-channel failover can continue across eligible free routes without touching blocked providers');
console.log('✓ Provider-ready/LIVE/DEVICE evidence remains explicitly separated from CODE');
