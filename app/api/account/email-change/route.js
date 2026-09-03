import { normalizeEmailAddress, normalizeEmailOtp } from "../../../../lib/auth/otp-policy.js";
import {
  EMAIL_CHANGE_POLICY,
  authenticatedEmailAccount,
  requestCurrentEmailChangeCode,
  verifiedEmailAccount,
  verifyCurrentEmailAndRequestNewCode,
  verifyNewEmailAndApplyChange,
} from "../../../../lib/account/email-change-verification.js";
import {
  RequestBoundaryError,
  boundaryResponse,
  privateJson,
  readBoundedJson,
} from "../../../../lib/security/high-risk-api-boundary.js";

function sameOrigin(request) {
  try {
    const origin = request.headers.get("origin");
    if (!origin) return false;
    const originHost = new URL(origin).host;
    const expectedHost = request.headers.get("x-forwarded-host") || request.headers.get("host") || request.nextUrl.host;
    const fetchSite = String(request.headers.get("sec-fetch-site") || "").toLowerCase();
    return originHost === expectedHost && fetchSite !== "cross-site";
  } catch {
    return false;
  }
}

function accountFailure(account) {
  if (!account?.error) return null;
  if (account.error === "AUTHENTICATION_REQUIRED") return privateJson({ success: false, error: "Authentication required.", code: account.error }, 401);
  if (account.error === "SESSION_NOT_READY") return privateJson({ success: false, error: "Authentication service is temporarily unavailable.", code: account.error }, 503);
  return privateJson({ success: false, error: "Account service is temporarily unavailable.", code: account.error }, account.status || 503);
}

function verificationFailure(result) {
  const code = String(result?.code || "VERIFICATION_FAILED");
  const messages = {
    VERIFICATION_INVALID: "The verification code is incorrect. Check it and try again.",
    VERIFICATION_EXPIRED: "This verification code has expired. Start the email change again.",
    VERIFICATION_LOCKED: "Too many incorrect attempts. Start the email change again.",
    VERIFICATION_ALREADY_USED: "This verification code has already been used. Start the email change again.",
    VERIFICATION_NOT_READY: "Email verification is not available yet.",
    VERIFICATION_RATE_LIMIT: "Too many verification codes were requested. Please wait before trying again.",
    EMAIL_CHANGE_FLOW_INVALID: "This email-change verification session is invalid or expired. Start again.",
    EMAIL_CHANGE_APPLY_FAILED: "The new email could not be applied. Check the address or use another email.",
  };
  const status = Number(result?.status || 400);
  return privateJson({
    success: false,
    error: messages[code] || "Unable to complete email verification right now.",
    code,
    attempts: result?.attempts,
    retryAfterSeconds: result?.retryAfterSeconds,
  }, status);
}

async function loadVerifiedAccount(request) {
  const account = await authenticatedEmailAccount(request);
  const failure = accountFailure(account);
  if (failure) return { failure };
  if (!verifiedEmailAccount(account.user)) {
    return { failure: privateJson({ success: false, error: "A verified current email is required before changing it.", code: "VERIFIED_EMAIL_REQUIRED" }, 403) };
  }
  return { account };
}

export async function GET(request) {
  try {
    const loaded = await loadVerifiedAccount(request);
    if (loaded.failure) return loaded.failure;
    const { user } = loaded.account;
    return privateJson({
      success: true,
      email: normalizeEmailAddress(user.email),
      emailVerified: true,
      policy: {
        currentEmailCodeRequired: true,
        newEmailCodeRequired: true,
        codeLength: EMAIL_CHANGE_POLICY.codeLength,
        smsFallback: false,
      },
    });
  } catch {
    return privateJson({ success: false, error: "Unable to read account security settings.", code: "ACCOUNT_SECURITY_UNAVAILABLE" }, 503);
  }
}

export async function POST(request) {
  try {
    if (!sameOrigin(request)) return privateJson({ success: false, error: "Email-change request was blocked.", code: "ORIGIN_REQUIRED" }, 403);

    const loaded = await loadVerifiedAccount(request);
    if (loaded.failure) return loaded.failure;
    const { user, admin } = loaded.account;

    const body = await readBoundedJson(request, EMAIL_CHANGE_POLICY.requestBytes);
    const action = String(body?.action || "").trim().toLowerCase();
    if (!["request", "verify_current", "verify_new"].includes(action)) {
      throw new RequestBoundaryError("Unsupported email-change action.", 400, "EMAIL_CHANGE_ACTION_INVALID");
    }

    const newEmail = normalizeEmailAddress(body?.newEmail);
    const currentEmail = normalizeEmailAddress(user.email);
    if (newEmail === currentEmail) {
      return privateJson({ success: false, error: "The new email must be different from the current email.", code: "EMAIL_UNCHANGED" }, 409);
    }
    const requestId = String(body?.requestId || "").trim();

    if (action === "request") {
      const result = await requestCurrentEmailChangeCode({ user, newEmail, requestId });
      if (!result?.success) return verificationFailure(result);
      return privateJson({
        success: true,
        phase: "verify_current",
        flowToken: result.flowToken,
        expiresInSeconds: result.expiresInSeconds,
        codeLength: EMAIL_CHANGE_POLICY.codeLength,
        message: "Enter the code sent to your current email.",
      });
    }

    const code = normalizeEmailOtp(body?.code);
    const flowToken = String(body?.flowToken || "").trim();

    if (action === "verify_current") {
      const result = await verifyCurrentEmailAndRequestNewCode({ user, newEmail, requestId, flowToken, code });
      if (!result?.success) return verificationFailure(result);
      return privateJson({
        success: true,
        phase: "verify_new",
        flowToken: result.flowToken,
        expiresInSeconds: result.expiresInSeconds,
        codeLength: EMAIL_CHANGE_POLICY.codeLength,
        message: "Current email verified. Enter the code sent to your new email.",
      });
    }

    const result = await verifyNewEmailAndApplyChange({ user, admin, newEmail, requestId, flowToken, code });
    if (!result?.success) return verificationFailure(result);
    return privateJson({
      success: true,
      phase: "complete",
      email: result.email,
      emailVerified: result.emailConfirmed === true,
      verification: result.verification,
      message: "Your email address has been changed and verified.",
    });
  } catch (error) {
    if (error instanceof RequestBoundaryError) return boundaryResponse(error, "Unable to process email change.");
    if (/valid email address|verification code|request id/i.test(String(error?.message || ""))) {
      return privateJson({ success: false, error: String(error.message), code: "INVALID_EMAIL_CHANGE_REQUEST" }, 400);
    }
    return privateJson({ success: false, error: "Unable to complete email change right now.", code: "EMAIL_CHANGE_FAILED" }, 500);
  }
}
