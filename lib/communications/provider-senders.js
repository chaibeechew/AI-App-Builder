const MAX_BODY_CHARS=12000;
const REQUEST_TIMEOUT_MS=8000;

function text(value,max=MAX_BODY_CHARS){return String(value??"").trim().slice(0,max);}
function requireValue(name,value){const safe=text(value,10000);if(!safe)throw Object.assign(new Error(`${name} is not configured.`),{code:"provider_configuration_required"});return safe;}
function env(name){return text(process.env[name]||"",10000);}
function destination(payload={}){return requireValue("recipient",payload?.to);}
function messageBody(payload={}){return requireValue("message body",payload?.body||payload?.text);}

async function fetchJson(url,options={}){
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),REQUEST_TIMEOUT_MS);
  try{
    const response=await fetch(url,{...options,signal:controller.signal,cache:"no-store"});
    const raw=await response.text();
    let data={};
    try{data=raw?JSON.parse(raw):{};}catch{data={};}
    if(!response.ok){
      const error=new Error(`Provider request failed with HTTP ${response.status}.`);
      error.code=`provider_http_${response.status}`;
      error.status=response.status;
      throw error;
    }
    return data;
  }catch(error){
    if(error?.name==="AbortError")throw Object.assign(new Error("Provider request timed out."),{code:"provider_timeout"});
    throw error;
  }finally{clearTimeout(timer);}
}

export function telegramProviderStatus(){return {configured:Boolean(env("LANERIQ_TELEGRAM_BOT_TOKEN")),evidenceLevel:"CODE"};}
export async function sendTelegramMessage(payload={}){
  const token=requireValue("LANERIQ_TELEGRAM_BOT_TOKEN",env("LANERIQ_TELEGRAM_BOT_TOKEN"));
  const data=await fetchJson(`https://api.telegram.org/bot${encodeURIComponent(token)}/sendMessage`,{
    method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({chat_id:destination(payload),text:messageBody(payload),disable_web_page_preview:true}),
  });
  return {status:data?.ok?"sent":"failed",messageId:data?.result?.message_id?String(data.result.message_id):null,evidenceLevel:"PROVIDER_RESPONSE"};
}

export function lineProviderStatus(){return {configured:Boolean(env("LANERIQ_LINE_CHANNEL_ACCESS_TOKEN")),evidenceLevel:"CODE"};}
export async function sendLineMessage(payload={}){
  const token=requireValue("LANERIQ_LINE_CHANNEL_ACCESS_TOKEN",env("LANERIQ_LINE_CHANNEL_ACCESS_TOKEN"));
  await fetchJson("https://api.line.me/v2/bot/message/push",{
    method:"POST",headers:{authorization:`Bearer ${token}`,"content-type":"application/json"},body:JSON.stringify({to:destination(payload),messages:[{type:"text",text:messageBody(payload)}]}),
  });
  return {status:"sent",messageId:null,evidenceLevel:"PROVIDER_RESPONSE"};
}

export function wechatProviderStatus(){return {configured:Boolean(env("LANERIQ_WECHAT_APP_ID")&&env("LANERIQ_WECHAT_APP_SECRET")),evidenceLevel:"CODE"};}
async function wechatAccessToken(){
  const appId=requireValue("LANERIQ_WECHAT_APP_ID",env("LANERIQ_WECHAT_APP_ID"));
  const appSecret=requireValue("LANERIQ_WECHAT_APP_SECRET",env("LANERIQ_WECHAT_APP_SECRET"));
  const url=`https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${encodeURIComponent(appId)}&secret=${encodeURIComponent(appSecret)}`;
  const data=await fetchJson(url);
  if(!data?.access_token)throw Object.assign(new Error("WeChat access token was not issued."),{code:`wechat_token_${String(data?.errcode||"missing")}`});
  return data.access_token;
}
export async function sendWeChatMessage(payload={}){
  const accessToken=await wechatAccessToken();
  const data=await fetchJson(`https://api.weixin.qq.com/cgi-bin/message/custom/send?access_token=${encodeURIComponent(accessToken)}`,{
    method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({touser:destination(payload),msgtype:"text",text:{content:messageBody(payload)}}),
  });
  if(Number(data?.errcode||0)!==0)throw Object.assign(new Error("WeChat provider rejected the message."),{code:`wechat_${String(data?.errcode||"unknown")}`});
  return {status:"sent",messageId:data?.msgid?String(data.msgid):null,evidenceLevel:"PROVIDER_RESPONSE"};
}
