import crypto from "node:crypto";
import { normalizeEmailAddress, normalizeEmailOtp, EMAIL_OTP_POLICY } from "../auth/otp-policy.js";
import { LANERIQ_SESSION_COOKIE, validateLaneriqSessionToken } from "../auth/laneriq-session.js";
import { requestLaneriqEmailVerification } from "../verification/server.js";
import { createAdminClient } from "../supabase/admin.js";

export const EMAIL_CHANGE_POLICY = Object.freeze({
  requestBytes: 6 * 1024,
  flowTtlSeconds: 10 * 60,
  requestIdMaxChars: 120,
  codeLength: EMAIL_OTP_POLICY.codeLength,
});

function rootSecret() {
  const secret = String(
    process.env.LANERIQ_VERIFICATION_SECRET ||
    process.env.LANERIQ_COMMUNICATIONS_HASH_SECRET ||
    process.env.LANERIQ_COMMUNICATION_PRIVACY_SECRET ||
    process.env.SUPABASE_SECRET_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    "",
  );
  if (secret.length < 32) throw new Error("LANERIQ email-change verification secret is not configured.");
  return secret;
}

function verificationKey() {
  return crypto.createHmac("sha256", rootSecret()).update("laneriq-verification-engine-v1").digest();
}

function flowKey() {
  return crypto.createHmac("sha256", rootSecret()).update("laneriq-email-change-flow-v1").digest();
}

function digest(label, value) {
  return crypto.createHmac("sha256", verificationKey()).update(`${label}:${String(value || "")}`).digest("hex");
}

function recipientHash(email) {
  return digest("recipient", email);
}

function codeHash(challengeId, email, code) {
  return digest("code", `${challengeId}:${email}:${code}`);
}

function safeRequestId(value) {
  const id = String(value || "").trim();
  if (!id || id.length > EMAIL_CHANGE_POLICY.requestIdMaxChars || !/^[a-zA-Z0-9._:-]+$/.test(id)) {
    throw new Error("A valid email-change request id is required.");
  }
  return id;
}

function flowBinding({ phase, userId, currentEmail, newEmail, requestId, currentChallengeId = "", newChallengeId = "" }) {
  return {
    v: 1,
    phase,
    userId: String(userId || ""),
    currentEmail: normalizeEmailAddress(currentEmail),
    newEmail: normalizeEmailAddress(newEmail),
    requestId: safeRequestId(requestId),
    currentChallengeId: String(currentChallengeId || ""),
    newChallengeId: String(newChallengeId || ""),
    exp: Math.floor(Date.now() / 1000) + EMAIL_CHANGE_POLICY.flowTtlSeconds,
  };
}

function encodeFlow(payload) {
  const body = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  const signature = crypto.createHmac("sha256", flowKey()).update(body).digest("base64url");
  return `${body}.${signature}`;
}

export function readEmailChangeFlow(token) {
  const raw = String(token || "");
  const parts = raw.split(".");
  if (parts.length !== 2 || !parts[0] || !parts[1]) return null;
  const expected = crypto.createHmac("sha256", flowKey()).update(parts[0]).digest();
  let supplied;
  try { supplied = Buffer.from(parts[1], "base64url"); } catch { return null; }
  if (supplied.length !== expected.length || !crypto.timingSafeEqual(supplied, expected)) return null;
  try {
    const payload = JSON.parse(Buffer.from(parts[0], "base64url").toString("utf8"));
    if (payload?.v !== 1 || !["current", "new"].includes(payload?.phase)) return null;
    if (!Number.isFinite(Number(payload?.exp)) || Number(payload.exp) < Math.floor(Date.now() / 1000)) return null;
    payload.currentEmail = normalizeEmailAddress(payload.currentEmail);
    payload.newEmail = normalizeEmailAddress(payload.newEmail);
    payload.requestId = safeRequestId(payload.requestId);
    return payload;
  } catch {
    return null;
  }
}

function internalVerificationRequestId({ phase, userId, newEmail, requestId, currentChallengeId = "" }) {
  const binding = crypto
    .createHash("sha256")
    .update(`${phase}:${String(userId)}:${normalizeEmailAddress(newEmail)}:${safeRequestId(requestId)}:${String(currentChallengeId)}`)
    .digest("hex");
  return `email-change-${phase}:${binding}`;
}

export async function authenticatedEmailAccount(request) {
  const token = String(request.cookies.get(LANERIQ_SESSION_COOKIE)?.value || "");
  let session = null;
  try { session = await validateLaneriqSessionToken(token); } catch { return { error: "SESSION_NOT_READY", status: 503 }; }
  if (!session?.userId) return { error: "AUTHENTICATION_REQUIRED", status: 401 };

  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.getUserById(session.userId);
  const user = data?.user;
  if (error || !user?.id || user.id !== session.userId) return { error: "ACCOUNT_NOT_READY", status: 503 };
  return { user, admin, session };
}

export function verifiedEmailAccount(user) {
  return Boolean(user?.email && (user?.email_confirmed_at || user?.confirmed_at));
}

export async function requestCurrentEmailChangeCode({ user, newEmail, requestId }) {
  const currentEmail = normalizeEmailAddress(user?.email);
  const targetEmail = normalizeEmailAddress(newEmail);
  const id = safeRequestId(requestId);
  const result = await requestLaneriqEmailVerification({
    email: currentEmail,
    scope: `email-change-current:${user.id}`,
    requestId: internalVerificationRequestId({ phase: "current", userId: user.id, newEmail: targetEmail, requestId: id }),
    referral: null,
  });
  if (!result?.success || !result?.challengeId) return result;
  return {
    ...result,
    flowToken: encodeFlow(flowBinding({
      phase: "current",
      userId: user.id,
      currentEmail,
      newEmail: targetEmail,
      requestId: id,
      currentChallengeId: result.challengeId,
    })),
  };
}

async function consumeChallenge({ challengeId, email, code }) {
  const id = String(challengeId || "").trim();
  if (!/^[a-f0-9]{48}$/.test(id)) return { success: false, code: "VERIFICATION_INVALID", status: 400 };
  const normalizedEmail = normalizeEmailAddress(email);
  const normalizedCode = normalizeEmailOtp(code);
  const admin = createAdminClient();
  const { data, error } = await admin.rpc("laneriq_consume_verification_challenge", {
    p_id: id,
    p_recipient_hash: recipientHash(normalizedEmail),
    p_code_hash: codeHash(id, normalizedEmail, normalizedCode),
  });
  if (error) return { success: false, code: "VERIFICATION_FAILED", status: 503 };
  const row = Array.isArray(data) ? data[0] : null;
  const decision = String(row?.decision || "invalid");
  if (decision === "verified") return { success: true };
  if (decision === "expired" || decision === "superseded") return { success: false, code: "VERIFICATION_EXPIRED", status: 410 };
  if (decision === "locked") return { success: false, code: "VERIFICATION_LOCKED", status: 429, attempts: Number(row?.attempts || EMAIL_OTP_POLICY.maxVerifyAttemptsPerCode) };
  if (decision === "delivery_failed") return { success: false, code: "VERIFICATION_NOT_READY", status: 503 };
  if (decision === "consumed") return { success: false, code: "VERIFICATION_ALREADY_USED", status: 409 };
  return { success: false, code: "VERIFICATION_INVALID", status: 400, attempts: Number(row?.attempts || 0) };
}

function flowMatches(flow, { phase, user, newEmail, requestId }) {
  if (!flow || flow.phase !== phase || flow.userId !== user?.id) return false;
  if (flow.requestId !== safeRequestId(requestId)) return false;
  if (flow.currentEmail !== normalizeEmailAddress(user?.email)) return false;
  if (flow.newEmail !== normalizeEmailAddress(newEmail)) return false;
  return true;
}

export async function verifyCurrentEmailAndRequestNewCode({ user, newEmail, requestId, flowToken, code }) {
  const flow = readEmailChangeFlow(flowToken);
  if (!flowMatches(flow, { phase: "current", user, newEmail, requestId })) {
    return { success: false, code: "EMAIL_CHANGE_FLOW_INVALID", status: 400 };
  }

  const consumed = await consumeChallenge({ challengeId: flow.currentChallengeId, email: flow.currentEmail, code });
  if (!consumed.success) return consumed;

  const result = await requestLaneriqEmailVerification({
    email: flow.newEmail,
    scope: `email-change-new:${user.id}`,
    requestId: internalVerificationRequestId({
      phase: "new",
      userId: user.id,
      newEmail: flow.newEmail,
      requestId: flow.requestId,
      currentChallengeId: flow.currentChallengeId,
    }),
    referral: null,
  });
  if (!result?.success || !result?.challengeId) return result;

  return {
    ...result,
    flowToken: encodeFlow(flowBinding({
      phase: "new",
      userId: user.id,
      currentEmail: flow.currentEmail,
      newEmail: flow.newEmail,
      requestId: flow.requestId,
      currentChallengeId: flow.currentChallengeId,
      newChallengeId: result.challengeId,
    })),
  };
}

export async function verifyNewEmailAndApplyChange({ user, admin, newEmail, requestId, flowToken, code }) {
  const flow = readEmailChangeFlow(flowToken);
  if (!flowMatches(flow, { phase: "new", user, newEmail, requestId }) || !flow.newChallengeId) {
    return { success: false, code: "EMAIL_CHANGE_FLOW_INVALID", status: 400 };
  }

  const consumed = await consumeChallenge({ challengeId: flow.newChallengeId, email: flow.newEmail, code });
  if (!consumed.success) return consumed;

  const { data, error } = await admin.auth.admin.updateUserById(user.id, {
    email: flow.newEmail,
    email_confirm: true,
  });
  const updated = data?.user;
  if (error || !updated?.id || updated.id !== user.id || normalizeEmailAddress(updated.email) !== flow.newEmail) {
    return { success: false, code: "EMAIL_CHANGE_APPLY_FAILED", status: 409 };
  }

  return {
    success: true,
    email: flow.newEmail,
    emailConfirmed: Boolean(updated.email_confirmed_at || updated.confirmed_at),
    verification: "dual_email_code",
  };
}
