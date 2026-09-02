import crypto from "node:crypto";

export function integrationStatus(){
  return {
    email:{ready:Boolean(process.env.RESEND_API_KEY&&process.env.EMAIL_FROM),managed:true},
    calendar:{ready:Boolean(process.env.GOOGLE_CALENDAR_CLIENT_EMAIL&&process.env.GOOGLE_CALENDAR_PRIVATE_KEY&&process.env.GOOGLE_CALENDAR_ID),managed:true},
    payments:{ready:Boolean(process.env.STRIPE_SECRET_KEY),managed:true},
    maps:{ready:Boolean(process.env.GOOGLE_MAPS_API_KEY),managed:true},
    whatsapp:{ready:Boolean(process.env.WHATSAPP_ACCESS_TOKEN&&process.env.WHATSAPP_PHONE_NUMBER_ID),managed:true,provider:"meta_cloud_api"},
    whatsappAuth:{ready:Boolean(process.env.WHATSAPP_ACCESS_TOKEN&&process.env.WHATSAPP_PHONE_NUMBER_ID&&process.env.WHATSAPP_AUTH_TEMPLATE_NAME),managed:true,provider:"meta_cloud_api"},
  };
}

function safeText(value,max=3000){return String(value||"").trim().slice(0,max);}
function whatsappGraphVersion(){const value=safeText(process.env.WHATSAPP_GRAPH_VERSION||"v23.0",16);return /^v\d+\.\d+$/.test(value)?value:"v23.0";}
async function providerFetch(url,options={},timeoutMs=15000){
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),Math.max(1000,Math.min(30000,Number(timeoutMs)||15000)));
  try{return await fetch(url,{...options,signal:controller.signal});}
  catch(error){if(error?.name==="AbortError")throw new Error("External provider timed out. Please retry safely.");throw error;}
  finally{clearTimeout(timer);}
}

export async function sendManagedEmail({to,subject,text,html}){
  if(!integrationStatus().email.ready)return {status:"integration_required",channel:"email"};
  const response=await providerFetch("https://api.resend.com/emails",{method:"POST",headers:{Authorization:`Bearer ${process.env.RESEND_API_KEY}`,"Content-Type":"application/json"},body:JSON.stringify({from:process.env.EMAIL_FROM,to:[safeText(to,320)],subject:safeText(subject,180),text:safeText(text,12000),html:html?safeText(html,20000):undefined})});
  const data=await response.json().catch(()=>({}));
  if(!response.ok)throw new Error(data?.message||`Email delivery failed (${response.status}).`);
  return {status:"completed",channel:"email",messageId:data?.id||null};
}

export async function sendManagedWhatsApp({to,body}){
  if(!integrationStatus().whatsapp.ready)return {status:"integration_required",channel:"whatsapp"};
  const phoneId=encodeURIComponent(process.env.WHATSAPP_PHONE_NUMBER_ID);
  const response=await providerFetch(`https://graph.facebook.com/${whatsappGraphVersion()}/${phoneId}/messages`,{method:"POST",headers:{Authorization:`Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`,"Content-Type":"application/json"},body:JSON.stringify({messaging_product:"whatsapp",recipient_type:"individual",to:safeText(to,80).replace(/[^0-9]/g,""),type:"text",text:{preview_url:false,body:safeText(body,4000)}})});
  const data=await response.json().catch(()=>({}));
  if(!response.ok)throw new Error(data?.error?.message||`WhatsApp delivery failed (${response.status}).`);
  return {status:"completed",channel:"whatsapp",messageId:data?.messages?.[0]?.id||null};
}

export async function sendManagedWhatsAppAuthCode({to,code}){
  if(!integrationStatus().whatsappAuth.ready)return {status:"integration_required",channel:"whatsapp"};
  const otp=safeText(code,15);
  if(!/^\d{6,10}$/.test(otp))throw new Error("WhatsApp verification code format is invalid.");
  const recipient=safeText(to,80).replace(/[^0-9]/g,"");
  if(!/^\d{8,15}$/.test(recipient))throw new Error("WhatsApp destination number is invalid.");
  const phoneId=encodeURIComponent(process.env.WHATSAPP_PHONE_NUMBER_ID);
  const templateName=safeText(process.env.WHATSAPP_AUTH_TEMPLATE_NAME,512);
  const languageCode=safeText(process.env.WHATSAPP_AUTH_TEMPLATE_LANGUAGE||"en_US",32);
  const body={
    messaging_product:"whatsapp",
    recipient_type:"individual",
    to:recipient,
    type:"template",
    template:{
      name:templateName,
      language:{code:languageCode},
      components:[
        {type:"body",parameters:[{type:"text",text:otp}]},
        {type:"button",sub_type:"url",index:"0",parameters:[{type:"text",text:otp}]},
      ],
    },
  };
  const response=await providerFetch(`https://graph.facebook.com/${whatsappGraphVersion()}/${phoneId}/messages`,{method:"POST",headers:{Authorization:`Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`,"Content-Type":"application/json"},body:JSON.stringify(body)},10000);
  const data=await response.json().catch(()=>({}));
  if(!response.ok)throw new Error(data?.error?.message||`WhatsApp authentication delivery failed (${response.status}).`);
  return {status:"completed",channel:"whatsapp",messageId:data?.messages?.[0]?.id||null};
}

function base64url(value){return Buffer.from(value).toString("base64url");}
async function googleAccessToken(){
  const email=process.env.GOOGLE_CALENDAR_CLIENT_EMAIL;
  const privateKey=String(process.env.GOOGLE_CALENDAR_PRIVATE_KEY||"").replace(/\\n/g,"\n");
  if(!email||!privateKey)return null;
  const now=Math.floor(Date.now()/1000);
  const header=base64url(JSON.stringify({alg:"RS256",typ:"JWT"}));
  const payload=base64url(JSON.stringify({iss:email,scope:"https://www.googleapis.com/auth/calendar",aud:"https://oauth2.googleapis.com/token",iat:now,exp:now+3500}));
  const unsigned=`${header}.${payload}`;
  const signature=crypto.sign("RSA-SHA256",Buffer.from(unsigned),privateKey).toString("base64url");
  const assertion=`${unsigned}.${signature}`;
  const response=await providerFetch("https://oauth2.googleapis.com/token",{method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded"},body:new URLSearchParams({grant_type:"urn:ietf:params:oauth:grant-type:jwt-bearer",assertion}).toString()});
  const data=await response.json().catch(()=>({}));
  if(!response.ok||!data?.access_token)throw new Error(data?.error_description||"Calendar authentication failed.");
  return data.access_token;
}

export async function createManagedCalendarEvent({summary,description,start,end,timeZone="UTC",attendeeEmail}){
  if(!integrationStatus().calendar.ready)return {status:"integration_required",channel:"calendar"};
  const token=await googleAccessToken();
  const event={summary:safeText(summary,300),description:safeText(description,5000),start:{dateTime:new Date(start).toISOString(),timeZone},end:{dateTime:new Date(end).toISOString(),timeZone}};
  if(attendeeEmail)event.attendees=[{email:safeText(attendeeEmail,320)}];
  const calendarId=encodeURIComponent(process.env.GOOGLE_CALENDAR_ID);
  const response=await providerFetch(`https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events?sendUpdates=all`,{method:"POST",headers:{Authorization:`Bearer ${token}`,"Content-Type":"application/json"},body:JSON.stringify(event)});
  const data=await response.json().catch(()=>({}));
  if(!response.ok)throw new Error(data?.error?.message||`Calendar creation failed (${response.status}).`);
  return {status:"completed",channel:"calendar",eventId:data?.id||null,htmlLink:data?.htmlLink||null};
}

export async function createManagedCheckout({name,description,amount,currency="usd",mode="payment",successUrl,cancelUrl,clientReferenceId,idempotencyKey}){
  if(!integrationStatus().payments.ready)return {status:"integration_required",channel:"payments"};
  const cents=Math.round(Number(amount)*100);
  const safeCurrency=safeText(currency,3).toLowerCase();
  if(!Number.isFinite(cents)||cents<50||cents>100000000)throw new Error("Payment amount is outside the supported range.");
  if(!/^[a-z]{3}$/.test(safeCurrency))throw new Error("Payment currency is invalid.");
  if(!["payment","subscription"].includes(mode))throw new Error("Payment billing mode is invalid.");
  if(!safeText(name,180))throw new Error("Payment offer name is required.");
  const recurring=mode==="subscription";
  const form=new URLSearchParams();
  form.set("mode",recurring?"subscription":"payment");form.set("success_url",safeText(successUrl,1500));form.set("cancel_url",safeText(cancelUrl,1500));form.set("line_items[0][quantity]","1");form.set("line_items[0][price_data][currency]",safeCurrency);form.set("line_items[0][price_data][unit_amount]",String(cents));form.set("line_items[0][price_data][product_data][name]",safeText(name,180));if(description)form.set("line_items[0][price_data][product_data][description]",safeText(description,500));if(recurring)form.set("line_items[0][price_data][recurring][interval]","month");if(clientReferenceId)form.set("client_reference_id",safeText(clientReferenceId,200));
  const headers={Authorization:`Bearer ${process.env.STRIPE_SECRET_KEY}`,"Content-Type":"application/x-www-form-urlencoded"};
  const safeIdempotency=safeText(idempotencyKey,200).replace(/[^a-zA-Z0-9._:-]/g,"-");
  if(safeIdempotency)headers["Idempotency-Key"]=safeIdempotency;
  const response=await providerFetch("https://api.stripe.com/v1/checkout/sessions",{method:"POST",headers,body:form.toString()},20000);
  const data=await response.json().catch(()=>({}));
  if(!response.ok)throw new Error(data?.error?.message||`Payment checkout failed (${response.status}).`);
  if(!data?.id||!data?.url)throw new Error("Payment provider returned an incomplete checkout session.");
  return {status:"completed",channel:"payments",checkoutId:data.id,url:data.url};
}