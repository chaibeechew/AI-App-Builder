import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  EMAIL_OTP_POLICY,
  WHATSAPP_OTP_POLICY,
  normalizeEmailOtp,
  normalizePhoneNumber,
  normalizeWhatsAppOtp,
  otpPolicyForMethod,
  authErrorMessage,
} from "../lib/auth/otp-policy.js";
import { verificationChannels } from "../lib/auth/verification-channels.js";

const authPage = await readFile(new URL("../app/auth/page.js", import.meta.url), "utf8");
const hook = await readFile(new URL("../app/api/auth/whatsapp-otp-hook/route.js", import.meta.url), "utf8");
const integrations = await readFile(new URL("../lib/integrations/server.js", import.meta.url), "utf8");
const sessionProxy = await readFile(new URL("../lib/supabase/proxy.js", import.meta.url), "utf8");

assert.deepEqual(Object.keys(verificationChannels).sort(), ["email", "whatsapp"]);
assert.equal(verificationChannels.email.enabled, true);
assert.equal(verificationChannels.whatsapp.enabled, true);
assert.equal(verificationChannels.whatsapp.costModel, "meta_cloud_api");

assert.equal(EMAIL_OTP_POLICY.codeLength, 8, "Email OTP must stay at the configured 8-digit contract.");
assert.equal(WHATSAPP_OTP_POLICY.codeLength, 6, "WhatsApp OTP must keep the Supabase phone 6-digit contract.");
assert.equal(WHATSAPP_OTP_POLICY.resendSeconds, 60);
assert.equal(WHATSAPP_OTP_POLICY.maxVerifyAttemptsPerCode, 5);
assert.equal(otpPolicyForMethod("email"), EMAIL_OTP_POLICY);
assert.equal(otpPolicyForMethod("whatsapp"), WHATSAPP_OTP_POLICY);
assert.equal(normalizePhoneNumber(" +60 12-345 6789 "), "+60123456789");
assert.throws(() => normalizePhoneNumber("0123456789"));
assert.throws(() => normalizePhoneNumber("+60<script>"));
assert.equal(normalizeWhatsAppOtp("12 34-56"), "123456");
assert.throws(() => normalizeWhatsAppOtp("12345"));
assert.equal(normalizeEmailOtp("12345678"), "12345678");
assert.doesNotMatch(authErrorMessage({ message: "postgres auth secret internal stack" }, "whatsapp"), /postgres|secret|stack/i);
assert.match(authErrorMessage({ code: "phone_provider_disabled" }, "whatsapp"), /WhatsApp verification/i);

assert.match(authPage, /NEXT_PUBLIC_WHATSAPP_AUTH_ENABLED/);
assert.match(authPage, /method === "whatsapp"/);
assert.match(authPage, /<strong>WhatsApp Code<\/strong>/);
assert.match(authPage, /<strong>Email Code<\/strong>/);
assert.doesNotMatch(authPage, /<strong>SMS Code<\/strong>/);
assert.doesNotMatch(authPage, /Telegram|WeChat|LINE|Facebook Code/i);
assert.match(authPage, /normalizePhoneNumber\(identifier\)/);
assert.match(authPage, /normalizeWhatsAppOtp\(otp\)/);
assert.match(authPage, /signInWithOtp\(\{ phone, options \}\)/);
assert.match(authPage, /Send SMS Hook delivers the code through Meta WhatsApp Cloud API/);
assert.match(authPage, /verifyOtp\(\{ phone: normalizePhoneNumber\(identifier\), token, type: "sms" \}\)/);
assert.match(authPage, /verifyOtp\(\{ email: normalizeEmailAddress\(identifier\), token, type: "email" \}\)/);
assert.match(authPage, /No traditional SMS or social login is used for verification/);
assert.match(authPage, /supabase\.auth\.getUser\(\)/);
assert.match(authPage, /safeInternalNext\(searchParams\.get\("next"\)\)/);

assert.match(hook, /webhook-id/);
assert.match(hook, /webhook-timestamp/);
assert.match(hook, /webhook-signature/);
assert.match(hook, /WEBHOOK_TOLERANCE_SECONDS = 5 \* 60/);
assert.match(hook, /createHmac\("sha256"/);
assert.match(hook, /timingSafeEqual/);
assert.match(hook, /SUPABASE_SEND_SMS_HOOK_SECRET/);
assert.match(hook, /sendManagedWhatsAppAuthCode/);
assert.doesNotMatch(hook, /sendManagedSms/);
assert.doesNotMatch(hook, /console\.(log|info|debug|warn|error)\(/);
assert.match(hook, /Never return, log or persist the OTP, phone number/);

assert.match(integrations, /whatsappAuth:\{ready:Boolean\(process\.env\.WHATSAPP_ACCESS_TOKEN&&process\.env\.WHATSAPP_PHONE_NUMBER_ID&&process\.env\.WHATSAPP_AUTH_TEMPLATE_NAME\)/);
assert.match(integrations, /export async function sendManagedWhatsAppAuthCode/);
assert.match(integrations, /type:"template"/);
assert.match(integrations, /name:templateName/);
assert.match(integrations, /language:\{code:languageCode\}/);
assert.match(integrations, /\{type:"body",parameters:\[\{type:"text",text:otp\}\]\}/);
assert.match(integrations, /\{type:"button",sub_type:"url",index:"0",parameters:\[\{type:"text",text:otp\}\]\}/);
assert.match(integrations, /provider:"meta_cloud_api"/);

assert.match(sessionProxy, /"\/api\/auth\/whatsapp-otp-hook"/);
assert.match(sessionProxy, /PUBLIC_SERVER_WEBHOOKS\.has\(pathname\)/);
assert.doesNotMatch(sessionProxy, /startsWith\("\/api\/auth\/whatsapp/);

console.log("✓ Customer verification options are exactly Email Code and WhatsApp Code");
console.log("✓ WhatsApp OTP keeps Supabase session verification while Meta Cloud API handles delivery");
console.log("✓ Supabase Send SMS Hook is Standard-Webhooks signed, replay-bounded and does not log OTP content");
console.log("✓ Meta authentication template sends the same OTP in body and copy-code button parameters");