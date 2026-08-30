import crypto from "node:crypto";

export function integrationStatus(){
  return {
    email:{ready:Boolean(process.env.RESEND_API_KEY&&process.env.EMAIL_FROM),managed:true},
    sms:{ready:Boolean(process.env.TWILIO_ACCOUNT_SID&&process.env.TWILIO_AUTH_TOKEN&&process.env.TWILIO_FROM_NUMBER),managed:true},
    calendar:{ready:Boolean(process.env.GOOGLE_CALENDAR_CLIENT_EMAIL&&process.env.GOOGLE_CALENDAR_PRIVATE_KEY&&process.env.GOOGLE_CALENDAR_ID),managed:true},
    payments:{ready:Boolean(process.env.STRIPE_SECRET_KEY),managed:true},
    maps:{ready:Boolean(process.env.GOOGLE_MAPS_API_KEY),managed:true},
    whatsapp:{ready:Boolean(process.env.WHATSAPP_ACCESS_TOKEN&&process.env.WHATSAPP_PHONE_NUMBER_ID),managed:true},
  };
}

function safeText(value,max=3000){return String(value||"").trim().slice(0,max);}

export async function sendManagedEmail({to,subject,text,html}){
  if(!integrationStatus().email.ready)return {status:"integration_required",channel:"email"};
  const response=await fetch("https://api.resend.com/emails",{method:"POST",headers:{Authorization:`Bearer ${process.env.RESEND_API_KEY}`,"Content-Type":"application/json"},body:JSON.stringify({from:process.env.EMAIL_FROM,to:[safeText(to,320)],subject:safeText(subject,180),text:safeText(text,12000),html:html?safeText(html,20000):undefined})});
  const data=await response.json().catch(()=>({}));
  if(!response.ok)throw new Error(data?.message||`Email delivery failed (${response.status}).`);
  return {status:"completed",channel:"email",messageId:data?.id||null};
}

export async function sendManagedSms({to,body}){
  if(!integrationStatus().sms.ready)return {status:"integration_required",channel:"sms"};
  const sid=process.env.TWILIO_ACCOUNT_SID;const token=process.env.TWILIO_AUTH_TOKEN;
  const form=new URLSearchParams({To:safeText(to,80),From:process.env.TWILIO_FROM_NUMBER,Body:safeText(body,1500)});
  const response=await fetch(`https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(sid)}/Messages.json`,{method:"POST",headers:{Authorization:`Basic ${Buffer.from(`${sid}:${token}`).toString("base64")}`,"Content-Type":"application/x-www-form-urlencoded"},body:form.toString()});
  const data=await response.json().catch(()=>({}));
  if(!response.ok)throw new Error(data?.message||`SMS delivery failed (${response.status}).`);
  return {status:"completed",channel:"sms",messageId:data?.sid||null};
}

export async function sendManagedWhatsApp({to,body}){
  if(!integrationStatus().whatsapp.ready)return {status:"integration_required",channel:"whatsapp"};
  const phoneId=encodeURIComponent(process.env.WHATSAPP_PHONE_NUMBER_ID);
  const response=await fetch(`https://graph.facebook.com/v23.0/${phoneId}/messages`,{method:"POST",headers:{Authorization:`Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`,"Content-Type":"application/json"},body:JSON.stringify({messaging_product:"whatsapp",recipient_type:"individual",to:safeText(to,80).replace(/[^0-9]/g,""),type:"text",text:{preview_url:false,body:safeText(body,4000)}})});
  const data=await response.json().catch(()=>({}));
  if(!response.ok)throw new Error(data?.error?.message||`WhatsApp delivery failed (${response.status}).`);
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
  const response=await fetch("https://oauth2.googleapis.com/token",{method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded"},body:new URLSearchParams({grant_type:"urn:ietf:params:oauth:grant-type:jwt-bearer",assertion}).toString()});
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
  const response=await fetch(`https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events?sendUpdates=all`,{method:"POST",headers:{Authorization:`Bearer ${token}`,"Content-Type":"application/json"},body:JSON.stringify(event)});
  const data=await response.json().catch(()=>({}));
  if(!response.ok)throw new Error(data?.error?.message||`Calendar creation failed (${response.status}).`);
  return {status:"completed",channel:"calendar",eventId:data?.id||null,htmlLink:data?.htmlLink||null};
}

export async function createManagedCheckout({name,description,amount,currency="usd",mode="payment",successUrl,cancelUrl,clientReferenceId}){
  if(!integrationStatus().payments.ready)return {status:"integration_required",channel:"payments"};
  const cents=Math.round(Number(amount)*100);
  if(!Number.isFinite(cents)||cents<50)throw new Error("Payment amount is invalid.");
  const recurring=mode==="subscription";
  const form=new URLSearchParams();
  form.set("mode",recurring?"subscription":"payment");form.set("success_url",safeText(successUrl,1500));form.set("cancel_url",safeText(cancelUrl,1500));form.set("line_items[0][quantity]","1");form.set("line_items[0][price_data][currency]",safeText(currency,10).toLowerCase());form.set("line_items[0][price_data][unit_amount]",String(cents));form.set("line_items[0][price_data][product_data][name]",safeText(name,180));if(description)form.set("line_items[0][price_data][product_data][description]",safeText(description,500));if(recurring)form.set("line_items[0][price_data][recurring][interval]","month");if(clientReferenceId)form.set("client_reference_id",safeText(clientReferenceId,200));
  const response=await fetch("https://api.stripe.com/v1/checkout/sessions",{method:"POST",headers:{Authorization:`Bearer ${process.env.STRIPE_SECRET_KEY}`,"Content-Type":"application/x-www-form-urlencoded"},body:form.toString()});
  const data=await response.json().catch(()=>({}));
  if(!response.ok)throw new Error(data?.error?.message||`Payment checkout failed (${response.status}).`);
  return {status:"completed",channel:"payments",checkoutId:data?.id||null,url:data?.url||null};
}
