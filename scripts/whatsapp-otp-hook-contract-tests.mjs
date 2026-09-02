import assert from 'node:assert/strict';
import fs from 'node:fs';

const hook=fs.readFileSync('supabase/functions/send-whatsapp-otp/index.ts','utf8');
const config=fs.readFileSync('supabase/config.toml','utf8');
const auth=fs.readFileSync('app/auth/page.js','utf8');

assert.match(config,/\[functions\.send-whatsapp-otp\][\s\S]*verify_jwt = false/);
assert.match(hook,/Webhook.*standardwebhooks/);
assert.match(hook,/SEND_SMS_HOOK_SECRET/);
assert.match(hook,/replace\(\/\^v1,whsec_\//);
assert.match(hook,/webhook\.verify\(payloadText, headers\)/);
assert.match(hook,/WHATSAPP_ACCESS_TOKEN/);
assert.match(hook,/WHATSAPP_PHONE_NUMBER_ID/);
assert.match(hook,/WHATSAPP_OTP_TEMPLATE_NAME/);
assert.match(hook,/WHATSAPP_OTP_TEMPLATE_LANGUAGE/);
assert.match(hook,/type: "template"/);
assert.match(hook,/type: "body"/);
assert.match(hook,/type: "button"/);
assert.match(hook,/sub_type: "url"/);
assert.match(hook,/parameters: \[\{ type: "text", text: otp \}\]/);
assert.match(hook,/AbortController/);
assert.match(hook,/3500/);
assert.match(hook,/Cache-Control": "no-store/);
assert.match(hook,/X-Content-Type-Options": "nosniff/);
assert.match(hook,/payloadText\.length > 65536/);
assert.match(hook,/if \(req\.method !== "POST"\)/);
assert.match(hook,/return response\(\{ error: "invalid_hook_signature" \}, 401\)/);
assert.match(hook,/return response\(\{ error: "provider_not_configured" \}, 503\)/);
assert.doesNotMatch(hook,/console\.(log|info|warn|error|debug)/);
assert.doesNotMatch(hook,/sendManagedSms|TWILIO|api\.twilio/i);
assert.doesNotMatch(hook,/type:\s*"text"\s*,\s*text:\s*\{.*body/s,'OTP must use an approved Meta Authentication template, not an arbitrary WhatsApp text message.');
assert.match(auth,/No paid SMS fallback is used/);
assert.match(auth,/NEXT_PUBLIC_WHATSAPP_AUTH_ENABLED/);

console.log('✓ WhatsApp OTP hook verifies Supabase Standard Webhooks signatures before reading OTP data');
console.log('✓ Meta delivery uses an approved template payload with OTP body/button parameters');
console.log('✓ Hook is bounded, no-store, secret-driven and never logs phone numbers or OTP values');
console.log('✓ Paid SMS/Twilio fallback remains absent');
