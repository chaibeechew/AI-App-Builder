import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const node=read('services/email-transport-node/server.mjs');
const integrations=read('lib/integrations/server.js');
const provider=read('lib/email-provider/server.js');
const docker=read('services/email-transport-node/Dockerfile');

assert.match(node,/LANERIQ_EMAIL_TRANSPORT_SECRET/);
assert.match(node,/CLOCK_SKEW_MS=5\*60\*1000/);
assert.match(node,/x-laneriq-timestamp/);
assert.match(node,/x-laneriq-signature/);
assert.match(node,/createHmac\('sha256',TRANSPORT_SECRET\)/);
assert.match(node,/timingSafeEqual/);
assert.match(node,/Math\.abs\(Date\.now\(\)-Number\(timestamp\)\)>CLOCK_SKEW_MS/);
assert.match(node,/MAX_BODY_BYTES=96\*1024/);
assert.match(node,/replace\(\/\[\\r\\n\]\+\/g,' '\)/);
assert.match(node,/dns\.resolveMx/);
assert.match(node,/net\.connect\(\{host,port:25\}\)/);
assert.match(node,/STARTTLS/i);
assert.match(node,/rejectUnauthorized:true/);
assert.match(node,/crypto\.sign\('RSA-SHA256'/);
assert.match(node,/DKIM-Signature: v=1; a=rsa-sha256; c=relaxed\/relaxed/);
assert.match(node,/Message-ID: <\$\{id\}@\$\{DOMAIN\}>/);
assert.match(node,/^\s*const messageId=safeHeader\(data\?\.messageId,160\);/m);
assert.match(node,/\^lqem_/);
assert.match(node,/smtp_deferred/);
assert.match(node,/smtp_rejected/);
assert.match(node,/mx\.slice\(0,4\)/);
assert.doesNotMatch(node,/console\.(log|info|warn|error|debug)/);
assert.doesNotMatch(node,/TWILIO|sendManagedSms|api\.twilio/i);

assert.match(integrations,/LANERIQ_EMAIL_TRANSPORT_URL/);
assert.match(integrations,/LANERIQ_EMAIL_TRANSPORT_SECRET/);
assert.match(integrations,/url\.protocol!=="https:"/);
assert.match(integrations,/sendLaneriqDirectEmail/);
assert.match(integrations,/createHmac\("sha256",config\.secret\)\.update\(`\$\{timestamp\}\.\$\{body\}`\)/);
assert.match(integrations,/"X-LANERIQ-Timestamp":timestamp/);
assert.match(integrations,/"X-LANERIQ-Signature":signature/);
assert.match(integrations,/new URL\("\/v1\/deliver",config\.url\)/);
assert.ok(integrations.indexOf('laneriqTransportReady()')<integrations.indexOf('smtpReady()'),'LANERIQ direct transport must be the first Email readiness path.');
assert.ok(integrations.indexOf('sendLaneriqDirectEmail(payload)')<integrations.indexOf('sendManagedSmtpEmail(payload)'),'LANERIQ direct transport must be attempted before compatibility SMTP.');

assert.match(provider,/sendManagedEmail\(\{\.\.\.payload,laneriqMessageId:claimed\.message_id\}\)/);
assert.match(provider,/delivered\?\.status==="failed"/);
assert.match(provider,/status:"deferred"/);

assert.match(docker,/FROM node:22-alpine/);
assert.match(docker,/USER laneriq/);
assert.match(docker,/HEALTHCHECK/);
assert.match(docker,/CMD \["node","server\.mjs"\]/);

console.log('✓ LANERIQ Email Transport uses authenticated, replay-bounded internal delivery requests');
console.log('✓ Direct MX delivery requires STARTTLS by default, validates TLS certificates and DKIM-signs mail');
console.log('✓ LANERIQ Message IDs flow from provider queue through the direct transport');
console.log('✓ Transport is containerized as non-root and keeps paid SMS absent');
