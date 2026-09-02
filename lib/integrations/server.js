import crypto from "node:crypto";
import tls from "node:tls";

function smtpReady(){
  return Boolean(process.env.SMTP_HOST&&process.env.SMTP_USER&&process.env.SMTP_PASS&&process.env.EMAIL_FROM);
}
function resendReady(){
  return Boolean(process.env.RESEND_API_KEY&&process.env.EMAIL_FROM);
}

export function integrationStatus(){
  return {
    email:{ready:smtpReady()||resendReady(),managed:true},
    calendar:{ready:Boolean(process.env.GOOGLE_CALENDAR_CLIENT_EMAIL&&process.env.GOOGLE_CALENDAR_PRIVATE_KEY&&process.env.GOOGLE_CALENDAR_ID),managed:true},
    payments:{ready:Boolean(process.env.STRIPE_SECRET_KEY),managed:true},
    maps:{ready:Boolean(process.env.GOOGLE_MAPS_API_KEY),managed:true},
    whatsapp:{ready:Boolean(process.env.WHATSAPP_ACCESS_TOKEN&&process.env.WHATSAPP_PHONE_NUMBER_ID),managed:true},
  };
}

function safeText(value,max=3000){return String(value||"").trim().slice(0,max);}
function safeHeader(value,max=320){return safeText(value,max).replace(/[\r\n]+/g," ").trim();}
function mailbox(value){
  const raw=safeHeader(value,320);
  const angle=raw.match(/<([^<>]+)>/);
  const address=(angle?angle[1]:raw).trim().toLowerCase();
  if(!/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(address))throw new Error("Email address is invalid.");
  return address;
}
function encodedHeader(value,max=180){
  const clean=safeHeader(value,max);
  return /^[\x20-\x7E]*$/.test(clean)?clean:`=?UTF-8?B?${Buffer.from(clean,"utf8").toString("base64")}?=`;
}
async function providerFetch(url,options={},timeoutMs=15000){
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),Math.max(1000,Math.min(30000,Number(timeoutMs)||15000)));
  try{return await fetch(url,{...options,signal:controller.signal});}
  catch(error){if(error?.name==="AbortError")throw new Error("External provider timed out. Please retry safely.");throw error;}
  finally{clearTimeout(timer);}
}

function smtpMessage({from,to,subject,text,html}){
  const boundary=`laneriq_${crypto.randomBytes(12).toString("hex")}`;
  const headers=[
    `From: ${safeHeader(from,320)}`,
    `To: ${mailbox(to)}`,
    `Subject: ${encodedHeader(subject,180)}`,
    `Date: ${new Date().toUTCString()}`,
    `Message-ID: <${crypto.randomUUID()}@laneriq.local>`,
    "MIME-Version: 1.0",
  ];
  const plain=safeText(text,12000).replace(/\r?\n/g,"\r\n");
  let body;
  if(html){
    const rich=safeText(html,20000).replace(/\r?\n/g,"\r\n");
    headers.push(`Content-Type: multipart/alternative; boundary="${boundary}"`);
    body=[
      `--${boundary}`,
      'Content-Type: text/plain; charset="UTF-8"',
      "Content-Transfer-Encoding: 8bit",
      "",
      plain,
      `--${boundary}`,
      'Content-Type: text/html; charset="UTF-8"',
      "Content-Transfer-Encoding: 8bit",
      "",
      rich,
      `--${boundary}--`,
      "",
    ].join("\r\n");
  }else{
    headers.push('Content-Type: text/plain; charset="UTF-8"',"Content-Transfer-Encoding: 8bit");
    body=plain;
  }
  return `${headers.join("\r\n")}\r\n\r\n${body}`.replace(/^\./gm,"..");
}

function smtpResponseClient(socket){
  let buffer="";
  let currentCode="";
  let currentLines=[];
  const queued=[];
  const waiters=[];
  let terminalError=null;

  function deliver(response){
    const waiter=waiters.shift();
    if(waiter)waiter.resolve(response);else queued.push(response);
  }
  function fail(error){
    if(terminalError)return;
    terminalError=error instanceof Error?error:new Error("Email delivery connection failed.");
    while(waiters.length)waiters.shift().reject(terminalError);
  }
  socket.on("data",chunk=>{
    buffer+=chunk.toString("utf8");
    let end;
    while((end=buffer.indexOf("\r\n"))>=0){
      const line=buffer.slice(0,end);
      buffer=buffer.slice(end+2);
      const match=line.match(/^(\d{3})([ -])/);
      if(!match)continue;
      if(!currentCode)currentCode=match[1];
      currentLines.push(line);
      if(match[1]===currentCode&&match[2]===" "){
        deliver({code:Number(currentCode),lines:currentLines});
        currentCode="";
        currentLines=[];
      }
    }
  });
  socket.on("error",()=>fail(new Error("Email delivery connection failed.")));
  socket.on("timeout",()=>{fail(new Error("Email delivery timed out."));socket.destroy();});
  socket.on("close",()=>{if(waiters.length)fail(new Error("Email delivery connection closed unexpectedly."));});
  return {
    next(){
      if(queued.length)return Promise.resolve(queued.shift());
      if(terminalError)return Promise.reject(terminalError);
      return new Promise((resolve,reject)=>waiters.push({resolve,reject}));
    },
  };
}

function expectSmtp(response,allowed){
  if(!response||!allowed.includes(response.code))throw new Error("Email delivery failed.");
}

async function sendManagedSmtpEmail({to,subject,text,html}){
  const host=safeHeader(process.env.SMTP_HOST,255);
  const portValue=Number(process.env.SMTP_PORT||465);
  const port=Number.isInteger(portValue)&&portValue>0&&portValue<=65535?portValue:465;
  const user=mailbox(process.env.SMTP_USER);
  const pass=String(process.env.SMTP_PASS||"");
  const from=String(process.env.EMAIL_FROM||"");
  const envelopeFrom=mailbox(from);
  const recipient=mailbox(to);
  if(!host||!pass)throw new Error("Email delivery is not configured.");

  const socket=tls.connect({host,port,servername:host,rejectUnauthorized:true});
  socket.setTimeout(Math.max(5000,Math.min(30000,Number(process.env.SMTP_TIMEOUT_MS)||15000)));
  const responses=smtpResponseClient(socket);
  try{
    const greeting=await responses.next();
    expectSmtp(greeting,[220]);
    socket.write("EHLO laneriq.local\r\n");
    expectSmtp(await responses.next(),[250]);
    const auth=Buffer.from(`\u0000${user}\u0000${pass}`,"utf8").toString("base64");
    socket.write(`AUTH PLAIN ${auth}\r\n`);
    expectSmtp(await responses.next(),[235]);
    socket.write(`MAIL FROM:<${envelopeFrom}>\r\n`);
    expectSmtp(await responses.next(),[250]);
    socket.write(`RCPT TO:<${recipient}>\r\n`);
    expectSmtp(await responses.next(),[250,251]);
    socket.write("DATA\r\n");
    expectSmtp(await responses.next(),[354]);
    socket.write(`${smtpMessage({from,to:recipient,subject,text,html})}\r\n.\r\n`);
    expectSmtp(await responses.next(),[250]);
    socket.write("QUIT\r\n");
    expectSmtp(await responses.next(),[221]);
    return {status:"completed",channel:"email",messageId:null};
  }finally{
    socket.end();
  }
}

async function sendManagedResendEmail({to,subject,text,html}){
  const response=await providerFetch("https://api.resend.com/emails",{method:"POST",headers:{Authorization:`Bearer ${process.env.RESEND_API_KEY}`,"Content-Type":"application/json"},body:JSON.stringify({from:process.env.EMAIL_FROM,to:[mailbox(to)],subject:safeHeader(subject,180),text:safeText(text,12000),html:html?safeText(html,20000):undefined})});
  const data=await response.json().catch(()=>({}));
  if(!response.ok)throw new Error(data?.message||`Email delivery failed (${response.status}).`);
  return {status:"completed",channel:"email",messageId:data?.id||null};
}

export async function sendManagedEmail(payload){
  if(smtpReady())return sendManagedSmtpEmail(payload);
  if(resendReady())return sendManagedResendEmail(payload);
  return {status:"integration_required",channel:"email"};
}

export async function sendManagedWhatsApp({to,body}){
  if(!integrationStatus().whatsapp.ready)return {status:"integration_required",channel:"whatsapp"};
  const phoneId=encodeURIComponent(process.env.WHATSAPP_PHONE_NUMBER_ID);
  const response=await providerFetch(`https://graph.facebook.com/v23.0/${phoneId}/messages`,{method:"POST",headers:{Authorization:`Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`,"Content-Type":"application/json"},body:JSON.stringify({messaging_product:"whatsapp",recipient_type:"individual",to:safeText(to,80).replace(/[^0-9]/g,""),type:"text",text:{preview_url:false,body:safeText(body,4000)}})});
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
  const response=await providerFetch("https://oauth2.googleapis.com/token",{method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded"},body:new URLSearchParams({grant_type:"urn:ietf:params:oauth2:jwt-bearer",assertion}).toString()});
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
  form.set("mode",recurring?"subscription":"payment");form.set("success_url",safeText(successUrl,1500));form.set("cancel_url",safeText(cancelUrl,1500));form.set("line_items[0][quantity]","1");form.set("line_items[0][price_data][currency]",safeCurrency);form.set("line_items[0][unit_amount]",String(cents));form.set("line_items[0][price_data][product_data][name]",safeText(name,180));if(description)form.set("line_items[0][price_data][product_data][description]",safeText(description,500));if(recurring)form.set("line_items[0][price_data][recurring][interval]","month");if(clientReferenceId)form.set("client_reference_id",safeText(clientReferenceId,200));
  const headers={Authorization:`Bearer ${process.env.STRIPE_SECRET_KEY}`,"Content-Type":"application/x-www-form-urlencoded"};
  const safeIdempotency=safeText(idempotencyKey,200).replace(/[^a-zA-Z0-9._:-]/g,"-");
  if(safeIdempotency)headers["Idempotency-Key"]=safeIdempotency;
  const response=await providerFetch("https://api.stripe.com/v1/checkout/sessions",{method:"POST",headers,body:form.toString()},20000);
  const data=await response.json().catch(()=>({}));
  if(!response.ok)throw new Error(data?.error?.message||`Payment checkout failed (${response.status}).`);
  if(!data?.id||!data?.url)throw new Error("Payment provider returned an incomplete checkout session.");
  return {status:"completed",channel:"payments",checkoutId:data.id,url:data.url};
}
