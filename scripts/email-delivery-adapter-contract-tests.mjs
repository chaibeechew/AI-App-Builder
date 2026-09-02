import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const integrations=fs.readFileSync(path.join(root,'lib/integrations/server.js'),'utf8');

assert.match(integrations,/import tls from "node:tls"/,'Managed SMTP must use TLS.');
assert.match(integrations,/function smtpReady\(\)/);
assert.match(integrations,/process\.env\.SMTP_HOST&&process\.env\.SMTP_USER&&process\.env\.SMTP_PASS&&process\.env\.EMAIL_FROM/);
assert.match(integrations,/function resendReady\(\)/);
assert.match(integrations,/process\.env\.RESEND_API_KEY&&process\.env\.EMAIL_FROM/);
assert.match(integrations,/email:\{ready:smtpReady\(\)\|\|resendReady\(\),managed:true\}/,'Email readiness must accept either managed transport.');
assert.match(integrations,/tls\.connect\(\{host,port,servername:host,rejectUnauthorized:true\}\)/,'SMTP TLS certificate validation must stay enabled.');
assert.match(integrations,/AUTH PLAIN/);
assert.match(integrations,/function safeHeader\(value,max=320\)\{return safeText\(value,max\)\.replace\(\/\[\\r\\n\]\+\/g," "\)\.trim\(\);\}/,'SMTP headers must strip CR/LF before protocol framing.');
assert.match(integrations,/function mailbox/,'SMTP envelope addresses must be validated.');
assert.match(integrations,/if\(smtpReady\(\)\)return sendManagedSmtpEmail\(payload\)/);
assert.match(integrations,/if\(resendReady\(\)\)return sendManagedResendEmail\(payload\)/);
assert.doesNotMatch(integrations,/console\.(log|info|warn|error|debug)/,'Email credentials and OTP payloads must never be logged by the adapter.');
assert.doesNotMatch(integrations,/sendManagedSms|TWILIO|api\.twilio/i,'Paid SMS fallback must remain absent.');
assert.match(integrations,/line_items\[0\]\[price_data\]\[unit_amount\]/,'Email adapter changes must not regress Stripe checkout amount encoding.');

console.log('✓ LANERIQ Email Delivery supports replaceable TLS SMTP or Resend transports');
console.log('✓ SMTP envelope/header hardening prevents CRLF injection and validates TLS certificates');
console.log('✓ Email delivery changes preserve no-SMS policy and payment checkout contract');
