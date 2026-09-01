import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  EMAIL_OTP_POLICY,
  SMS_OTP_POLICY,
  normalizeEmailOtp,
  normalizePhoneNumber,
  normalizeSmsOtp,
  otpPolicyForMethod,
  authErrorMessage,
} from "../lib/auth/otp-policy.js";

const authPage = await readFile(new URL("../app/auth/page.js", import.meta.url), "utf8");

assert.equal(EMAIL_OTP_POLICY.codeLength, 8, "Email OTP must stay at the configured 8-digit contract.");
assert.equal(SMS_OTP_POLICY.codeLength, 6, "SMS OTP must have its own 6-digit contract.");
assert.equal(SMS_OTP_POLICY.resendSeconds, 60);
assert.equal(SMS_OTP_POLICY.maxVerifyAttemptsPerCode, 5);
assert.equal(otpPolicyForMethod("email"), EMAIL_OTP_POLICY);
assert.equal(otpPolicyForMethod("sms"), SMS_OTP_POLICY);
assert.equal(normalizePhoneNumber(" +60 12-345 6789 "), "+60123456789");
assert.equal(normalizePhoneNumber("+14155552671"), "+14155552671");
assert.throws(() => normalizePhoneNumber("0123456789"));
assert.throws(() => normalizePhoneNumber("+012345678"));
assert.throws(() => normalizePhoneNumber("+60<script>"));
assert.equal(normalizeSmsOtp("12 34-56"), "123456");
assert.throws(() => normalizeSmsOtp("12345"));
assert.equal(normalizeEmailOtp("12345678"), "12345678");
assert.throws(() => normalizeEmailOtp("123456"), "SMS token length must never silently weaken Email OTP.");
assert.doesNotMatch(authErrorMessage({ message: "postgres auth secret internal stack" }, "sms"), /postgres|secret|stack/i);
assert.match(authErrorMessage({ code: "phone_provider_disabled" }, "sms"), /not enabled/i);

assert.match(authPage, /NEXT_PUBLIC_SMS_AUTH_ENABLED/);
assert.match(authPage, /otpPolicyForMethod\(method\)/);
assert.match(authPage, /normalizePhoneNumber\(identifier\)/);
assert.match(authPage, /normalizeSmsOtp\(otp\)/);
assert.match(authPage, /signInWithOtp\(\{ phone, options \}\)/);
assert.match(authPage, /verifyOtp\(\{ phone: normalizePhoneNumber\(identifier\), token, type: "sms" \}\)/);
assert.match(authPage, /verifyOtp\(\{ email: normalizeEmailAddress\(identifier\), token, type: "email" \}\)/);
assert.match(authPage, /otp\.length !== policy\.codeLength/);
assert.match(authPage, /slice\(0, policy\.codeLength\)/);
assert.match(authPage, /autoComplete="one-time-code"/);
assert.match(authPage, /inputMode="numeric"/);
assert.match(authPage, /shouldCreateUser: true/);
assert.match(authPage, /supabase\.auth\.getUser\(\)/);
assert.match(authPage, /safeInternalNext\(searchParams\.get\("next"\)\)/);
assert.match(authPage, /window\.__LANERIQ_AUTH_FLOW_BUSY__ = true/);
assert.doesNotMatch(authPage, /const token = normalizeEmailOtp\(otp\);[\s\S]{0,300}type: "sms"/, "SMS verification must never normalize through the Email OTP policy.");

console.log("✓ SMS Auth has an independent 6-digit policy while Email remains 8 digits");
console.log("✓ Phone numbers are E.164-normalized and unsafe/local-only formats fail closed");
console.log("✓ SMS send/verify uses Supabase phone OTP with method-specific UI length, retries and safe errors");
console.log("✓ Successful SMS sessions reuse the same trusted getUser and safe internal redirect boundary as Email OTP");
