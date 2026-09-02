import crypto from 'node:crypto';
import dns from 'node:dns/promises';
import http from 'node:http';
import net from 'node:net';
import tls from 'node:tls';

const MAX_BODY_BYTES=96*1024;
const CLOCK_SKEW_MS=5*60*1000;
const PORT=Math.max(1,Math.min(65535,Number(process.env.PORT)||8080));
const DOMAIN=String(process.env.LANERIQ_MAIL_DOMAIN||'').trim().toLowerCase();
const SELECTOR=String(process.env.LANERIQ_MAIL_DKIM_SELECTOR||'lq1').trim().toLowerCase();
const PRIVATE_KEY=String(process.env.LANERIQ_MAIL_DKIM_PRIVATE_KEY||'').replace(/\\n/g,'\n');
const TRANSPORT_SECRET=String(process.env.LANERIQ_EMAIL_TRANSPORT_SECRET||'');
const HELO_NAME=String(process.env.LANERIQ_MAIL_HELO_NAME||`mail.${DOMAIN}`).trim().toLowerCase();
const ENVELOPE_FROM=String(process.env.LANERIQ_MAIL_ENVELOPE_FROM||`bounce@${DOMAIN}`).trim().toLowerCase();
const FROM_HEADER=String(process.env.EMAIL_FROM||`LANERIQ AI <verify@${DOMAIN}>`).trim();
const REQUIRE_STARTTLS=String(process.env.LANERIQ_MAIL_REQUIRE_STARTTLS||'true').toLowerCase()!=='false';

function configured(){
  return Boolean(
    DOMAIN&&/^[a-z0-9.-]+$/.test(DOMAIN)&&
    SELECTOR&&/^[a-z0-9_-]+$/.test(SELECTOR)&&
    PRIVATE_KEY.includes('PRIVATE KEY')&&
    TRANSPORT_SECRET.length>=32&&
    HELO_NAME&&ENVELOPE_FROM&&FROM_HEADER
  );
}
function timingEqual(a,b){
  const left=Buffer.from(String(a||''));
  const right=Buffer.from(String(b||''));
  return left.length===right.length&&crypto.timingSafeEqual(left,right);
}
function requestHmac(timestamp,raw){return crypto.createHmac('sha256',TRANSPORT_SECRET).update(`${timestamp}.${raw}`).digest('hex');}
function verifyRequest(req,raw){
  if(!configured())return false;
  const timestamp=String(req.headers['x-laneriq-timestamp']||'');
  const signature=String(req.headers['x-laneriq-signature']||'');
  if(!/^\d{13}$/.test(timestamp)||!/^[a-f0-9]{64}$/i.test(signature))return false;
  if(Math.abs(Date.now()-Number(timestamp))>CLOCK_SKEW_MS)return false;
  return timingEqual(signature,requestHmac(timestamp,raw));
}
function safeHeader(value,max=320){return String(value||'').trim().slice(0,max).replace(/[\r\n]+/g,' ');}
function mailbox(value){
  const raw=safeHeader(value,320);
  const angle=raw.match(/<([^<>]+)>/);
  const address=(angle?angle[1]:raw).trim().toLowerCase();
  if(!/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(address))throw new Error('invalid_mailbox');
  return address;
}
function encodeHeader(value){
  const clean=safeHeader(value,180);
  return /^[\x20-\x7E]*$/.test(clean)?clean:`=?UTF-8?B?${Buffer.from(clean,'utf8').toString('base64')}?=`;
}
function canonicalBody(value){
  const lines=String(value||'').replace(/\r?\n/g,'\n').split('\n').map(line=>line.replace(/[ \t]+$/g,'').replace(/[ \t]+/g,' '));
  while(lines.length&&lines.at(-1)==='')lines.pop();
  return `${lines.join('\r\n')}\r\n`;
}
function canonicalHeader(line){
  const index=line.indexOf(':');
  if(index<1)throw new Error('invalid_header');
  return `${line.slice(0,index).toLowerCase()}:${line.slice(index+1).replace(/\r?\n[ \t]+/g,' ').replace(/[ \t]+/g,' ').trim()}\r\n`;
}
function buildMime({to,subject,text,html,messageId}){
  const date=new Date().toUTCString();
  const id=safeHeader(messageId,160).replace(/[^a-zA-Z0-9._-]/g,'-')||crypto.randomUUID();
  const headers=[
    `From: ${safeHeader(FROM_HEADER,320)}`,
    `To: ${mailbox(to)}`,
    `Subject: ${encodeHeader(subject)}`,
    `Date: ${date}`,
    `Message-ID: <${id}@${DOMAIN}>`,
    'MIME-Version: 1.0',
  ];
  let body;
  if(html){
    const boundary=`lq_${crypto.randomBytes(12).toString('hex')}`;
    headers.push(`Content-Type: multipart/alternative; boundary="${boundary}"`);
    body=[
      `--${boundary}`,
      'Content-Type: text/plain; charset="UTF-8"',
      'Content-Transfer-Encoding: 8bit','',String(text||''),
      `--${boundary}`,
      'Content-Type: text/html; charset="UTF-8"',
      'Content-Transfer-Encoding: 8bit','',String(html||''),
      `--${boundary}--`,''
    ].join('\r\n');
  }else{
    headers.push('Content-Type: text/plain; charset="UTF-8"','Content-Transfer-Encoding: 8bit');
    body=String(text||'').replace(/\r?\n/g,'\r\n');
  }
  return {headers,body:canonicalBody(body)};
}
function dkimSign({headers,body}){
  const signedNames=['from','to','subject','date','message-id','mime-version','content-type'];
  const selected=signedNames.map(name=>headers.find(line=>line.toLowerCase().startsWith(`${name}:`))).filter(Boolean);
  const actualNames=selected.map(line=>line.slice(0,line.indexOf(':')).toLowerCase());
  const bh=crypto.createHash('sha256').update(Buffer.from(body,'utf8')).digest('base64');
  const base=`DKIM-Signature: v=1; a=rsa-sha256; c=relaxed/relaxed; d=${DOMAIN}; s=${SELECTOR}; t=${Math.floor(Date.now()/1000)}; h=${actualNames.join(':')}; bh=${bh}; b=`;
  const signingInput=selected.map(canonicalHeader).join('')+canonicalHeader(base);
  const signature=crypto.sign('RSA-SHA256',Buffer.from(signingInput,'utf8'),PRIVATE_KEY).toString('base64');
  return `${base}${signature}`;
}
function dotStuff(message){return message.replace(/^\./gm,'..');}

function smtpReader(socket){
  let buffer='';
  let code=null;
  let lines=[];
  const queue=[];
  const waiters=[];
  let terminalError=null;
  const deliver=value=>{const waiter=waiters.shift();if(waiter)waiter.resolve(value);else queue.push(value);};
  const fail=error=>{if(terminalError)return;terminalError=error instanceof Error?error:new Error('smtp_connection_failed');while(waiters.length)waiters.shift().reject(terminalError);};
  socket.on('data',chunk=>{
    buffer+=chunk.toString('utf8');
    let index;
    while((index=buffer.indexOf('\r\n'))>=0){
      const line=buffer.slice(0,index);buffer=buffer.slice(index+2);
      const match=line.match(/^(\d{3})([ -])/);if(!match)continue;
      if(code===null)code=Number(match[1]);
      lines.push(line);
      if(Number(match[1])===code&&match[2]===' '){deliver({code,lines});code=null;lines=[];}
    }
  });
  socket.on('error',()=>fail(new Error('smtp_connection_failed')));
  socket.on('timeout',()=>{fail(new Error('smtp_timeout'));socket.destroy();});
  socket.on('close',()=>{if(waiters.length)fail(new Error('smtp_closed'));});
  return {next(){if(queue.length)return Promise.resolve(queue.shift());if(terminalError)return Promise.reject(terminalError);return new Promise((resolve,reject)=>waiters.push({resolve,reject}));}};
}
function smtpClass(code){if(code>=200&&code<400)return 'ok';if(code>=400&&code<500)return 'deferred';return 'failed';}
function expect(response,codes){
  if(!response||!codes.includes(response.code)){
    const error=new Error(smtpClass(response?.code)==='deferred'?'smtp_deferred':'smtp_rejected');
    error.smtpCode=response?.code||0;
    throw error;
  }
}
async function openConnection(host){
  const socket=net.connect({host,port:25});
  socket.setTimeout(20000);
  const reader=smtpReader(socket);
  expect(await reader.next(),[220]);
  socket.write(`EHLO ${HELO_NAME}\r\n`);
  const ehlo=await reader.next();expect(ehlo,[250]);
  const supportsTls=ehlo.lines.some(line=>/STARTTLS/i.test(line));
  if(!supportsTls){
    if(REQUIRE_STARTTLS){socket.destroy();throw new Error('starttls_required');}
    return {socket,reader};
  }
  socket.write('STARTTLS\r\n');expect(await reader.next(),[220]);
  const secure=tls.connect({socket,servername:host,rejectUnauthorized:true});
  secure.setTimeout(20000);
  await new Promise((resolve,reject)=>{secure.once('secureConnect',resolve);secure.once('error',reject);});
  const secureReader=smtpReader(secure);
  secure.write(`EHLO ${HELO_NAME}\r\n`);expect(await secureReader.next(),[250]);
  return {socket:secure,reader:secureReader};
}
async function deliverDirect(payload){
  const recipient=mailbox(payload.to);
  const domain=recipient.split('@')[1];
  const mx=(await dns.resolveMx(domain)).sort((a,b)=>a.priority-b.priority);
  if(!mx.length)throw new Error('mx_not_found');
  const mime=buildMime(payload);
  const dkim=dkimSign(mime);
  const message=`${dkim}\r\n${mime.headers.join('\r\n')}\r\n\r\n${mime.body}`;
  let lastError=new Error('smtp_unavailable');
  for(const record of mx.slice(0,4)){
    let connection;
    try{
      connection=await openConnection(record.exchange);
      const {socket,reader}=connection;
      socket.write(`MAIL FROM:<${mailbox(ENVELOPE_FROM)}>\r\n`);expect(await reader.next(),[250]);
      socket.write(`RCPT TO:<${recipient}>\r\n`);expect(await reader.next(),[250,251]);
      socket.write('DATA\r\n');expect(await reader.next(),[354]);
      socket.write(`${dotStuff(message)}\r\n.\r\n`);expect(await reader.next(),[250]);
      socket.write('QUIT\r\n');
      return {status:'sent'};
    }catch(error){lastError=error;try{connection?.socket?.destroy();}catch{}}
  }
  throw lastError;
}
function payloadFrom(raw){
  const data=JSON.parse(raw);
  const messageId=safeHeader(data?.messageId,160);
  const to=mailbox(data?.to);
  const subject=safeHeader(data?.subject,180);
  const text=String(data?.text||'').slice(0,12000);
  const html=data?.html?String(data.html).slice(0,20000):'';
  if(!/^lqem_[a-zA-Z0-9_-]{10,}$/.test(messageId)||!subject||(!text&&!html))throw new Error('invalid_payload');
  return {messageId,to,subject,text,html};
}

const server=http.createServer(async(req,res)=>{
  res.setHeader('Content-Type','application/json');
  res.setHeader('Cache-Control','no-store');
  res.setHeader('X-Content-Type-Options','nosniff');
  if(req.method==='GET'&&req.url==='/health'){
    res.statusCode=configured()?200:503;
    res.end(JSON.stringify({service:'LANERIQ Email Transport',ready:configured(),domain:configured()?DOMAIN:null,dkimSelector:configured()?SELECTOR:null}));
    return;
  }
  if(req.method!=='POST'||req.url!=='/v1/deliver'){
    res.statusCode=404;res.end(JSON.stringify({error:'not_found'}));return;
  }
  let raw='';let size=0;
  try{
    for await(const chunk of req){
      size+=chunk.length;
      if(size>MAX_BODY_BYTES)throw new Error('payload_too_large');
      raw+=chunk.toString('utf8');
    }
    if(!verifyRequest(req,raw)){res.statusCode=401;res.end(JSON.stringify({error:'unauthorized'}));return;}
    const payload=payloadFrom(raw);
    await deliverDirect(payload);
    res.statusCode=200;res.end(JSON.stringify({success:true,status:'sent',messageId:payload.messageId}));
  }catch(error){
    const code=String(error?.message||'transport_failed');
    const temporary=['smtp_deferred','smtp_timeout','smtp_connection_failed','smtp_closed','smtp_unavailable'].includes(code);
    res.statusCode=temporary?503:422;
    res.end(JSON.stringify({success:false,status:temporary?'deferred':'failed',errorCode:code}));
  }
});
server.listen(PORT,'0.0.0.0');
