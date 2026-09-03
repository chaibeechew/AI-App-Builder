import crypto from 'node:crypto';
import { signServiceRequest } from '../lib/communications/service-auth.js';

const BASE=String(process.env.LANERIQ_COMMUNICATIONS_CANARY_URL||'').trim().replace(/\/$/,'');
const SECRET=String(process.env.LANERIQ_COMMUNICATIONS_SERVICE_SECRET||'').trim();
const CLIENT_ID=String(process.env.LANERIQ_COMMUNICATIONS_SERVICE_CLIENT_ID||'laneriq-ai').trim();
const USER_ID=String(process.env.LANERIQ_COMMUNICATIONS_CANARY_USER_ID||'').trim();
const STATUS_PATH='/api/communications/v1/status';
const DISPATCH_PATH='/api/communications/v1/dispatch';

function fail(message){throw new Error(message);}
if(!/^https:\/\//i.test(BASE))fail('LANERIQ_COMMUNICATIONS_CANARY_URL must be an HTTPS standalone service URL.');
if(SECRET.length<32)fail('LANERIQ_COMMUNICATIONS_SERVICE_SECRET must be at least 32 characters.');
if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(USER_ID))fail('LANERIQ_COMMUNICATIONS_CANARY_USER_ID must be a real test-user UUID.');

async function readJson(response){return response.json().catch(()=>({}));}
async function signedRequest(message,{nonce=crypto.randomBytes(18).toString('base64url')}={}){
  const body=JSON.stringify(message);
  const timestamp=String(Math.floor(Date.now()/1000));
  const signature=signServiceRequest({secret:SECRET,clientId:CLIENT_ID,timestamp,nonce,method:'POST',path:DISPATCH_PATH,body});
  const headers={'content-type':'application/json','x-laneriq-client-id':CLIENT_ID,'x-laneriq-timestamp':timestamp,'x-laneriq-nonce':nonce,'x-laneriq-signature':signature};
  const response=await fetch(`${BASE}${DISPATCH_PATH}`,{method:'POST',headers,body,redirect:'error'});
  return {response,data:await readJson(response),body,timestamp,nonce,signature,headers};
}

const statusResponse=await fetch(`${BASE}${STATUS_PATH}`,{headers:{accept:'application/json'},redirect:'error',cache:'no-store'});
const status=await readJson(statusResponse);
if(!statusResponse.ok)fail(`Standalone status failed HTTP ${statusResponse.status}.`);
if(status?.architecture!=='standalone_service_host')fail('Status endpoint is not reporting standalone_service_host.');
if(status?.externalSpendCap!==0)fail('Standalone service is not reporting externalSpendCap=0.');

const unsignedResponse=await fetch(`${BASE}${DISPATCH_PATH}`,{method:'POST',headers:{'content-type':'application/json'},body:'{}',redirect:'error'});
if(unsignedResponse.status!==401&&unsignedResponse.status!==503)fail(`Unsigned dispatch must fail closed, got HTTP ${unsignedResponse.status}.`);

const idempotencyKey=`standalone-canary:${Date.now()}:${crypto.randomBytes(6).toString('hex')}`;
const message={idempotencyKey,to:USER_ID,subject:'LANERIQ Communications Canary',body:'Standalone signed canary — zero external spend.',purpose:'canary',preferredChannels:['in_app'],metadata:{canary:true,externalSpendExpected:0}};
const first=await signedRequest(message);
if(!first.response.ok)fail(`Signed canary failed HTTP ${first.response.status}: ${JSON.stringify(first.data).slice(0,240)}`);
if(first.data?.result?.channel!=='in_app')fail('Signed canary did not use in_app channel.');
if(Number(first.data?.result?.externalSpend)!==0)fail('Signed canary did not prove externalSpend=0.');

const replayResponse=await fetch(`${BASE}${DISPATCH_PATH}`,{method:'POST',headers:first.headers,body:first.body,redirect:'error'});
const replay=await readJson(replayResponse);
if(replayResponse.status!==409||replay?.status!=='replay_blocked')fail(`Exact nonce replay was not blocked: HTTP ${replayResponse.status}.`);

const conflict={...message,body:'Mutated body must never reuse the same idempotency key.'};
const conflictAttempt=await signedRequest(conflict);
if(conflictAttempt.response.status!==409||conflictAttempt.data?.status!=='idempotency_conflict')fail(`Idempotency body conflict was not blocked: HTTP ${conflictAttempt.response.status}.`);

console.log(JSON.stringify({ok:true,evidenceLevel:'LIVE_CANARY',service:BASE,status:'standalone_ready',unsignedDispatch:'fail_closed',signedInApp:'delivered_once',replay:'blocked',idempotencyConflict:'blocked',externalSpend:0,requestId:first.data?.requestId||null,messageId:first.data?.result?.messageId||null},null,2));
