export const EMAIL_OTP_POLICY = Object.freeze({
  codeLength: 8,
  resendSeconds: 60,
  maxVerifyAttemptsPerCode: 5,
  maxEmailLength: 254,
});

export function normalizeEmailAddress(value) {
  const email = String(value || "").trim().toLowerCase();
  if (!email || email.length > EMAIL_OTP_POLICY.maxEmailLength) throw new Error("Enter a valid email address.");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("Enter a valid email address.");
  return email;
}

export function normalizeEmailOtp(value) {
  const token = String(value || "").replace(/\D/g, "").slice(0, EMAIL_OTP_POLICY.codeLength);
  if (token.length !== EMAIL_OTP_POLICY.codeLength) {
    throw new Error(`Enter the ${EMAIL_OTP_POLICY.codeLength}-digit verification code you received.`);
  }
  return token;
}

export function authErrorMessage(error, method = "email") {
  const code = String(error?.code || "").toLowerCase();
  const raw = String(error?.message || "").toLowerCase();
  if (code === "phone_provider_disabled" || /unsupported phone provider/.test(raw)) return "SMS verification is not enabled yet. Use Email Code for now.";
  if (code === "over_sms_send_rate_limit") return "Too many SMS codes were requested. Please wait before trying again.";
  if (code.includes("rate") || /rate limit|security purposes/.test(raw)) return `Please wait about ${EMAIL_OTP_POLICY.resendSeconds} seconds before requesting another code.`;
  if (/expired/.test(raw)) return "This verification code has expired. Request a new code.";
  if (/invalid.*token|token.*invalid|otp.*invalid/.test(raw)) return "The verification code is incorrect. Check it and try again.";
  if (/email.*not.*confirmed|confirmation/.test(raw)) return "Email verification is required before continuing.";
  return method === "sms"
    ? "Unable to complete SMS verification right now. Please try again."
    : "Unable to complete email verification right now. Please try again.";
}
