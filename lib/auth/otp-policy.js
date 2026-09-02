const SHARED_OTP_POLICY = Object.freeze({
  resendSeconds: 60,
  maxVerifyAttemptsPerCode: 5,
});

export const EMAIL_OTP_POLICY = Object.freeze({
  ...SHARED_OTP_POLICY,
  codeLength: 8,
  maxEmailLength: 254,
});

export const WHATSAPP_OTP_POLICY = Object.freeze({
  ...SHARED_OTP_POLICY,
  codeLength: 6,
  maxPhoneLength: 16,
});

export function normalizeEmailAddress(value) {
  const email = String(value || "").trim().toLowerCase();
  if (!email || email.length > EMAIL_OTP_POLICY.maxEmailLength) throw new Error("Enter a valid email address.");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("Enter a valid email address.");
  return email;
}

export function normalizePhoneNumber(value) {
  const phone = String(value || "").trim().replace(/[\s().-]/g, "");
  if (!/^\+[1-9]\d{7,14}$/.test(phone) || phone.length > WHATSAPP_OTP_POLICY.maxPhoneLength) {
    throw new Error("Use international format, for example +60123456789.");
  }
  return phone;
}

function normalizeNumericOtp(value, policy, label) {
  const token = String(value || "").replace(/\D/g, "").slice(0, policy.codeLength);
  if (token.length !== policy.codeLength) {
    throw new Error(`Enter the ${policy.codeLength}-digit ${label} verification code you received.`);
  }
  return token;
}

export function normalizeEmailOtp(value) {
  return normalizeNumericOtp(value, EMAIL_OTP_POLICY, "email");
}

export function normalizeWhatsAppOtp(value) {
  return normalizeNumericOtp(value, WHATSAPP_OTP_POLICY, "WhatsApp");
}

export function otpPolicyForMethod(method) {
  return method === "whatsapp" ? WHATSAPP_OTP_POLICY : EMAIL_OTP_POLICY;
}

export function authErrorMessage(error, method = "email") {
  const code = String(error?.code || "").toLowerCase();
  const raw = String(error?.message || "").toLowerCase();
  const policy = otpPolicyForMethod(method);
  if (method === "whatsapp" && (code === "phone_provider_disabled" || /unsupported phone provider/.test(raw))) {
    return "WhatsApp verification is not configured yet. No SMS fallback will be used.";
  }
  if (method === "whatsapp" && code === "over_sms_send_rate_limit") {
    return "Too many WhatsApp verification codes were requested. Please wait before trying again.";
  }
  if (code.includes("rate") || /rate limit|security purposes/.test(raw)) return `Please wait about ${policy.resendSeconds} seconds before requesting another code.`;
  if (/expired/.test(raw)) return "This verification code has expired. Request a new code.";
  if (/invalid.*token|token.*invalid|otp.*invalid/.test(raw)) return "The verification code is incorrect. Check it and try again.";
  if (/email.*not.*confirmed|confirmation/.test(raw)) return "Email verification is required before continuing.";
  return method === "whatsapp"
    ? "Unable to complete WhatsApp verification right now. Please try again."
    : "Unable to complete email verification right now. Please try again.";
}