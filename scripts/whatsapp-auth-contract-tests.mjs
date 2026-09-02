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

const authPage = await readFile(new URL("../app/auth/page.js", import.meta.url), "utf8");
const requestRoute = await readFile(new URL("../app/api/auth/verification/request/route.js", import.meta.url), "utf8");
const sessionRoute = await readFile(new URL("../app/api/auth/session/route.js", import.meta.url), "utf8");
const proxy = await readFile(new URL("../lib/supabase/proxy.js", import.meta.url), "utf8");

assert.equal(EMAIL_OTP_POLICY.codeLength, 8, "Email OTP must stay at the configured 8-digit contract.");
assert.equal(WHATSAPP_OTP_POLICY.codeLength, 6, "WhatsApp OTP must retain a 6-digit phone-auth contract.");
assert.equal(WHATSAPP_OTP_POLICY.resendSeconds, 60);
assert.equal(WHATSAPP_OTP_POLICY.maxVerifyAttemptsPerCode, 5);
assert.equal(otpPolicyForMethod("email"), EMAIL_OTP_POLICY);
assert.equal(otpPolicyForMethod("whatsapp"), WHATSAPP_OTP_POLICY);
assert.equal(normalizePhoneNumber(" +60 12-345 6789 "), "+60123456789");
assert.equal(normalizePhoneNumber("+14155552671"), "+14155552671");
assert.throws(() => normalizePhoneNumber("0123456789"));
assert.throws(() => normalizePhoneNumber("+012345678"));
assert.throws(() => normalizePhoneNumber("+60<script>"));
assert.equal(normalizeWhatsAppOtp("12 34-56"), "123456");
assert.throws(() => normalizeWhatsAppOtp("12345"));
assert.equal(normalizeEmailOtp("12345678"), "12345678");
assert.throws(() => normalizeEmailOtp("123456"), "Phone token length must never silently weaken Email OTP.");
assert.doesNotMatch(authErrorMessage({ message: "postgres auth secret internal stack" }, "whatsapp"), /postgres|secret|stack/i);
assert.match(authErrorMessage({ code: "phone_provider_disabled" }, "whatsapp"), /WhatsApp verification is not configured/i);

assert.match(authPage, /NEXT_PUBLIC_WHATSAPP_AUTH_ENABLED/);
assert.match(authPage, /otpPolicyForMethod\(method\)/);
assert.match(authPage, /normalizePhoneNumber\(identifier\)/);
assert.match(authPage, /normalizeWhatsAppOtp\(otp\)/);
assert.match(authPage, /fetch\("\/api\/auth\/verification\/request"/);
assert.match(authPage, /fetch\("\/api\/auth\/verification\/verify"/);
assert.match(authPage, /globalThis\.crypto\?\.randomUUID/);
assert.match(authPage, /credentials:\s*"same-origin"/);
assert.doesNotMatch(authPage, /auth\.signInWithOtp/);
assert.match(authPage, /verifyOtp\(\{ phone: normalizePhoneNumber\(identifier\), token, type: "sms" \}\)/);
assert.doesNotMatch(authPage, /verifyOtp\(\{ email:/);
assert.match(authPage, /otp\.length !== policy\.codeLength/);
assert.match(authPage, /slice\(0, policy\.codeLength\)/);
assert.match(authPage, /autoComplete="one-time-code"/);
assert.match(authPage, /inputMode="numeric"/);
assert.match(authPage, /readLaneriqSession\(\)/);
assert.match(authPage, /upgradeVerifiedCompatibilitySession\(\)/);
assert.match(authPage, /action:\s*"upgrade_verified_compatibility"/);
assert.match(authPage, /sessionData\?\.sessionAuthority !== "laneriq"/);
assert.doesNotMatch(authPage, /supabase\.auth\.getUser\(\)/);
const whatsappVerifyIndex=authPage.indexOf('supabase.auth.verifyOtp({ phone:');
const upgradeIndex=authPage.indexOf('await upgradeVerifiedCompatibilitySession()');
assert.ok(whatsappVerifyIndex>=0&&upgradeIndex>whatsappVerifyIndex,"WhatsApp compatibility OTP must succeed before LANERIQ primary session upgrade.");
assert.match(authPage, /safeInternalNext\(searchParams\.get\("next"\)\)/);
assert.match(authPage, /window\.__LANERIQ_AUTH_FLOW_BUSY__ = true/);
assert.match(authPage, /WhatsApp Code/);
assert.match(authPage, /Email Code/);
assert.match(authPage, /No paid SMS fallback is used/);
assert.doesNotMatch(authPage, /process\.env\.NEXT_PUBLIC_SMS_AUTH_ENABLED|const\s+SMS_AUTH_ENABLED\s*=/);
assert.doesNotMatch(authPage, /<strong>SMS Code<\/strong>/);
assert.doesNotMatch(authPage, /switchMethod\("sms"\)/);
assert.doesNotMatch(authPage, /const token = normalizeEmailOtp\(otp\);[\s\S]{0,300}type: "sms"/, "WhatsApp phone verification must never normalize through the Email OTP policy.");

assert.match(requestRoute, /claimLaneriqCommunication/);
assert.match(requestRoute, /purpose:"verification"/);
assert.match(requestRoute, /sameOrigin\(request\)/);
assert.match(requestRoute, /signInWithOtp\(\{phone:identifier,options\}\)/);
assert.doesNotMatch(requestRoute, /signInWithOtp\(\{email:/);
assert.match(requestRoute, /requestLaneriqEmailVerification/);
assert.match(requestRoute, /shouldCreateUser:true/);
assert.match(requestRoute, /VERIFICATION_RATE_LIMIT/);
assert.match(requestRoute, /platformFee:0/);

assert.match(sessionRoute, /FRESH_COMPATIBILITY_SIGN_IN_MS=5\*60\*1000/);
assert.match(sessionRoute, /action==="upgrade_verified_compatibility"/);
assert.match(sessionRoute, /requireFreshSignIn:true/);
assert.match(sessionRoute, /user\.last_sign_in_at/);
assert.match(sessionRoute, /FRESH_VERIFICATION_REQUIRED/);
assert.match(sessionRoute, /sessionAuthority:"laneriq"/);
assert.match(sessionRoute, /compatibilityBridge:"legacy_data_access_transition"/);
assert.doesNotMatch(sessionRoute, /compatibilityBridge:"supabase/i);
const primaryModeGate=sessionRoute.indexOf('if(isLaneriqPrimarySessionMode(mode))');
const passiveLegacyFallback=sessionRoute.indexOf('const migrated=await mintFromCompatibilityIdentity();');
assert.ok(primaryModeGate>=0&&passiveLegacyFallback>primaryModeGate,"A LANERIQ-primary browser must reject passive stale compatibility fallback.");

assert.match(proxy, /"\/api\/auth\/verification\/request"/);
assert.match(proxy, /"\/api\/auth\/verification\/verify"/);
assert.match(proxy, /"\/api\/auth\/session"/);
assert.match(proxy, /validateLaneriqSessionToken\(laneriqToken\)/);
assert.match(proxy, /isLaneriqPrimarySessionMode\(laneriqMode\)/);
assert.doesNotMatch(proxy, /pathname\.startsWith\("\/api\/auth/);

console.log("✓ Email Code and Meta WhatsApp Code remain the only customer verification choices");
console.log("✓ Email OTP is LANERIQ-owned; WhatsApp keeps the current internal compatibility OTP authority then upgrades to LANERIQ Session");
console.log("✓ WhatsApp phone numbers are E.164-normalized and unsafe/local-only formats fail closed");
console.log("✓ Fresh WhatsApp verification is required before explicit LANERIQ primary-session upgrade; stale compatibility cookies cannot passively resurrect auth");
console.log("✓ Verification requests pass through LANERIQ persistent fair-use/idempotency guard before delivery");
console.log("✓ Customer SMS fallback remains disabled");
