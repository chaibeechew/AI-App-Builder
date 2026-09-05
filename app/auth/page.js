"use client";

import "./auth.css";
import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { PRODUCT_BRAND } from "../../lib/product-brand.js";
import {
  EMAIL_OTP_POLICY,
  WHATSAPP_OTP_POLICY,
  authErrorMessage,
  normalizeEmailAddress,
  normalizeEmailOtp,
  normalizePhoneNumber,
  normalizeWhatsAppOtp,
  otpPolicyForMethod,
} from "../../lib/auth/otp-policy.js";
import { normalizeReferralCode, safeInternalNext } from "../../lib/auth/session-safety.js";

export const dynamic = "force-dynamic";
const WHATSAPP_AUTH_ENABLED = process.env.NEXT_PUBLIC_WHATSAPP_AUTH_ENABLED === "true";
const SESSION_CHECK_TIMEOUT_MS = 3500;
const VERIFICATION_READINESS_REFRESH_MS = 30000;

function safeFlowError(error, method) {
  const message = String(error?.message || "");
  if (message === "Enter a valid email address." || message.startsWith("Enter the ") || message.startsWith("Too many incorrect")) return message;
  if (message.startsWith("Use international format") || message.startsWith("This verification code") || message.startsWith("The verification code")) return message;
  return authErrorMessage(error, method);
}

async function readLaneriqSession() {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), SESSION_CHECK_TIMEOUT_MS);
  try {
    const response = await fetch("/api/auth/session", {
      method: "GET",
      cache: "no-store",
      credentials: "same-origin",
      signal: controller.signal,
    });
    const data = await response.json().catch(() => ({}));
    return { response, data };
  } finally {
    window.clearTimeout(timer);
  }
}

async function readEmailVerificationReadiness() {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), SESSION_CHECK_TIMEOUT_MS);
  try {
    const response = await fetch("/api/auth/verification/status", {
      method: "GET",
      cache: "no-store",
      credentials: "same-origin",
      signal: controller.signal,
    });
    const data = await response.json().catch(() => ({}));
    const ready = response.ok
      && data?.ready === true
      && data?.channel === "email"
      && data?.otpAuthority === "laneriq"
      && data?.sessionAuthority === "laneriq"
      && data?.stages?.guard === true
      && data?.stages?.storage === true
      && data?.stages?.delivery === true;
    return Boolean(ready);
  } finally {
    window.clearTimeout(timer);
  }
}

async function verifyWhatsAppCompatibility({ phone, token }) {
  // The compatibility client is loaded only when the user explicitly verifies WhatsApp.
  // Email sign-in remains LANERIQ-only and never initializes the legacy browser client.
  const { createClient } = await import("../../lib/supabase/client");
  const compatibilityClient = createClient();
  return compatibilityClient.auth.verifyOtp({ phone, token, type: "sms" });
}

async function upgradeVerifiedCompatibilitySession() {
  const response = await fetch("/api/auth/session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    cache: "no-store",
    credentials: "same-origin",
    body: JSON.stringify({ action: "upgrade_verified_compatibility" }),
  });
  const data = await response.json().catch(() => ({}));
  return { response, data };
}

function AuthForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [method, setMethod] = useState("email");
  const [identifier, setIdentifier] = useState("");
  const [challengeId, setChallengeId] = useState("");
  const [otp, setOtp] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [emailReady, setEmailReady] = useState(false);
  const [emailReadinessChecked, setEmailReadinessChecked] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [resendIn, setResendIn] = useState(0);
  const [verifyAttempts, setVerifyAttempts] = useState(0);
  const referral = normalizeReferralCode(searchParams.get("ref"));
  const next = safeInternalNext(searchParams.get("next"));
  const policy = otpPolicyForMethod(method);

  useEffect(() => {
    let active = true;
    let redirecting = false;
    const failOpenTimer = window.setTimeout(() => {
      if (active && !redirecting) setChecking(false);
    }, SESSION_CHECK_TIMEOUT_MS + 500);

    readLaneriqSession().then(({ response, data }) => {
      if (!active) return;
      if (response.ok && data?.authenticated === true && data?.sessionAuthority === "laneriq") {
        redirecting = true;
        router.replace(next);
        router.refresh();
        return;
      }
      setChecking(false);
    }).catch(() => {
      if (active) setChecking(false);
    });

    return () => {
      active = false;
      window.clearTimeout(failOpenTimer);
    };
  }, [router, next]);

  useEffect(() => {
    let active = true;
    let refreshing = false;

    const refreshReadiness = async () => {
      if (refreshing) return;
      refreshing = true;
      try {
        const ready = await readEmailVerificationReadiness();
        if (active) setEmailReady(ready);
      } catch {
        if (active) setEmailReady(false);
      } finally {
        refreshing = false;
        if (active) setEmailReadinessChecked(true);
      }
    };

    refreshReadiness();
    const timer = window.setInterval(refreshReadiness, VERIFICATION_READINESS_REFRESH_MS);
    window.addEventListener("focus", refreshReadiness);
    return () => {
      active = false;
      window.clearInterval(timer);
      window.removeEventListener("focus", refreshReadiness);
    };
  }, []);

  useEffect(() => {
    if (resendIn <= 0) return;
    const timer = window.setInterval(() => setResendIn((value) => Math.max(0, value - 1)), 1000);
    return () => window.clearInterval(timer);
  }, [resendIn]);

  function resetFlow() {
    setIdentifier("");
    setChallengeId("");
    setOtp("");
    setSent(false);
    setMessage("");
    setError("");
    setResendIn(0);
    setVerifyAttempts(0);
  }

  function switchMethod(value) {
    if (value === "whatsapp" && !WHATSAPP_AUTH_ENABLED) return;
    setMethod(value);
    resetFlow();
  }

  async function sendCode(event) {
    event?.preventDefault?.();
    if (loading || resendIn > 0) return;
    if (method === "email" && (!emailReadinessChecked || !emailReady)) {
      setError("LANERIQ Email Verification is preparing. Please try again shortly.");
      return;
    }
    if (method === "whatsapp" && !WHATSAPP_AUTH_ENABLED) {
      setError("WhatsApp verification is still being configured. Email Code remains available.");
      return;
    }
    setLoading(true);
    setError("");
    setMessage("");
    try {
      const normalized = method === "whatsapp" ? normalizePhoneNumber(identifier) : normalizeEmailAddress(identifier);
      const requestId = globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const response = await fetch("/api/auth/verification/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        credentials: "same-origin",
        body: JSON.stringify({ method, identifier: normalized, referral: referral || undefined, requestId }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || data?.success !== true) {
        if (response.status === 429) setResendIn(Math.min(300, Math.max(policy.resendSeconds, Number(data?.retryAfterSeconds || 0))));
        const requestError = new Error(data?.error || "Unable to request a verification code.");
        requestError.code = data?.code || "VERIFICATION_REQUEST_FAILED";
        throw requestError;
      }
      if (method === "email" && !/^[a-f0-9]{48}$/.test(String(data?.challengeId || ""))) throw new Error("Email verification challenge was not created.");
      setIdentifier(normalized);
      setChallengeId(method === "email" ? String(data.challengeId) : "");
      setMessage(method === "whatsapp"
        ? `WhatsApp verification code sent to ${normalized}.`
        : `${PRODUCT_BRAND.name} verification code sent to ${normalized}. Check your inbox and spam folder.`);
      setOtp("");
      setVerifyAttempts(0);
      setSent(true);
      setResendIn(policy.resendSeconds);
    } catch (flowError) {
      setError(safeFlowError(flowError, method));
    } finally {
      setLoading(false);
    }
  }

  async function verify(event) {
    event.preventDefault();
    const maxAttempts = method === "whatsapp" ? WHATSAPP_OTP_POLICY.maxVerifyAttemptsPerCode : EMAIL_OTP_POLICY.maxVerifyAttemptsPerCode;
    if (verifyAttempts >= maxAttempts) {
      setError("Too many incorrect attempts. Request a new verification code.");
      return;
    }
    setLoading(true);
    setError("");
    setMessage("");
    let attemptedRemoteVerify = false;
    if (typeof window !== "undefined") window.__LANERIQ_AUTH_FLOW_BUSY__ = true;
    try {
      const token = method === "whatsapp" ? normalizeWhatsAppOtp(otp) : normalizeEmailOtp(otp);
      attemptedRemoteVerify = true;

      if (method === "email") {
        if (!challengeId) throw new Error("This verification code has expired. Request a new code.");
        const response = await fetch("/api/auth/verification/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          cache: "no-store",
          credentials: "same-origin",
          body: JSON.stringify({ method: "email", identifier: normalizeEmailAddress(identifier), challengeId, code: token }),
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok || data?.success !== true || data?.sessionAuthority !== "laneriq") {
          if (data?.code === "VERIFICATION_LOCKED") setVerifyAttempts(maxAttempts);
          else if (Number.isFinite(Number(data?.attempts))) setVerifyAttempts(Math.min(maxAttempts, Number(data.attempts)));
          const verifyError = new Error(data?.error || "Unable to complete email verification right now.");
          verifyError.code = data?.code || "VERIFICATION_FAILED";
          throw verifyError;
        }
      } else {
        // Phone OTP remains an internal compatibility protocol name only. Customer delivery is WhatsApp and there is no SMS fallback.
        const result = await verifyWhatsAppCompatibility({ phone: normalizePhoneNumber(identifier), token });
        if (result.error) throw result.error;
        if (!result.data?.session) throw new Error("SESSION_NOT_CREATED");
        // Only a freshly verified WhatsApp compatibility session may explicitly upgrade
        // a browser that already carries the LANERIQ-primary marker.
        const { response: sessionResponse, data: sessionData } = await upgradeVerifiedCompatibilitySession();
        if (!sessionResponse.ok || sessionData?.authenticated !== true || sessionData?.sessionAuthority !== "laneriq") throw new Error("SESSION_NOT_CREATED");
      }

      try {
        await fetch("/api/referrals/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          cache: "no-store",
          credentials: "same-origin",
        });
      } catch {}

      if (typeof window !== "undefined") window.__LANERIQ_AUTH_FLOW_BUSY__ = false;
      router.replace(next);
      router.refresh();
    } catch (flowError) {
      if (attemptedRemoteVerify && method === "whatsapp") setVerifyAttempts((value) => Math.min(maxAttempts, value + 1));
      setError(safeFlowError(flowError, method));
    } finally {
      if (typeof window !== "undefined") window.__LANERIQ_AUTH_FLOW_BUSY__ = false;
      setLoading(false);
    }
  }

  if (checking) return <main className="loadingScreen">Checking your session…</main>;

  const isWhatsApp = method === "whatsapp";
  const identifierLabel = isWhatsApp ? "WhatsApp number" : "Email address";
  const methodLabel = isWhatsApp ? "WhatsApp" : "Email";
  const codePlaceholder = isWhatsApp ? "1".repeat(WHATSAPP_OTP_POLICY.codeLength) : "1".repeat(EMAIL_OTP_POLICY.codeLength);
  const emailStatusLabel = !emailReadinessChecked ? "CHECK" : emailReady ? "READY" : "PREPARING";
  const emailSendUnavailable = !isWhatsApp && (!emailReadinessChecked || !emailReady);

  return (
    <main className="authPage">
      <div className="aurora a1" />
      <div className="aurora a2" />
      <header className="brandBar" aria-label={`${PRODUCT_BRAND.name} secure sign in`}>
        <div className="brandMark">AI</div>
        <div className="brandWords"><b>{PRODUCT_BRAND.name}</b><span>{PRODUCT_BRAND.capabilities}</span></div>
        <div className="securePill"><i /> Secure sign in</div>
      </header>

      <div className="authShell">
        <section className="heroCopy" aria-label="AI BUILD APP & WEB welcome">
          <small>CREATE WITHOUT LIMITS</small>
          <h1>One code.<br /><em>Your whole studio.</em></h1>
          <p>Sign in once, then continue creating apps, websites and mobile games in the same premium workspace.</p>
          <div className="capabilityRow"><span>APPS</span><span>WEB</span><span>GAMES</span><span>iOS + Android</span></div>
          <div className="trustLine"><i /> Private project access · passwordless verification</div>
          <small className="trustPolicy">No paid SMS fallback is used.</small>
        </section>

        <section className="authCard" aria-live="polite">
          <div className="cardTop"><small>SECURE VERIFICATION</small><span>{sent ? "02" : "01"}</span></div>
          <div className="authEnvelope" aria-hidden="true">✉</div>
          <div className="authWelcome">{sent ? null : <>Welcome to<br/><b>LANERIQ AI</b><small>A BRIGHTER TOMORROW TOGETHER</small></>}</div>
          <h2>{sent ? "Check Your Email" : "Enter Your Email"}</h2>
          <p>{sent ? <>We've sent an <b>{EMAIL_OTP_POLICY.codeLength}-digit verification code</b> to <strong>{identifier}</strong>.</> : <>We'll send an <b>{EMAIL_OTP_POLICY.codeLength}-digit verification code</b> to your email address.</>}</p>

          <div className="tabs" role="tablist" aria-label="Verification method">
            <button type="button" role="tab" aria-selected={method === "email"} className={method === "email" ? "active" : ""} onClick={() => switchMethod("email")}><span>✉</span><strong>Email Code</strong><b>{emailStatusLabel}</b></button>
            <button type="button" role="tab" aria-selected={method === "whatsapp"} className={method === "whatsapp" ? "active" : ""} disabled={!WHATSAPP_AUTH_ENABLED} onClick={() => switchMethod("whatsapp")}><span>◉</span><strong>WhatsApp Code</strong><b>{WHATSAPP_AUTH_ENABLED ? "READY" : "SETUP"}</b></button>
          </div>

          {!sent ? (
            <form onSubmit={sendCode}>
              <label htmlFor="auth-identifier">{identifierLabel}</label>
              <div className="inputWrap">
                <span>{isWhatsApp ? "+" : "@"}</span>
                <input id="auth-identifier" value={identifier} onChange={(event) => setIdentifier(event.target.value)} placeholder={isWhatsApp ? "+60123456789" : "you@example.com"} inputMode={isWhatsApp ? "tel" : "email"} autoComplete={isWhatsApp ? "tel" : "email"} autoCapitalize="none" maxLength={isWhatsApp ? WHATSAPP_OTP_POLICY.maxPhoneLength + 8 : EMAIL_OTP_POLICY.maxEmailLength} required />
              </div>
              {referral && <div className="notice">Referral code · {referral}</div>}
              {!isWhatsApp && emailReadinessChecked && !emailReady && <div className="notice">LANERIQ Email Verification is preparing. Sending will be enabled automatically when the service is ready.</div>}
              <button className="primary" disabled={loading || resendIn > 0 || emailSendUnavailable}><span>{loading ? "Sending…" : resendIn > 0 ? `Try again in ${resendIn}s` : emailSendUnavailable ? (emailReadinessChecked ? "Preparing Email Verification…" : "Checking Email Verification…") : `Send ${methodLabel} Code`}</span><i>→</i></button>
            </form>
          ) : (
            <form onSubmit={verify}>
              <div className="sentTo">Code sent to <b>{identifier}</b></div>
              <label htmlFor="auth-otp" className="otpLabel">{policy.codeLength}-digit verification code</label>
              <div className="otpCells" aria-label={`${policy.codeLength}-digit verification code`}>
                {Array.from({ length: policy.codeLength }, (_, index) => <span key={index} className={otp[index] ? "filled" : ""} aria-hidden="true">{otp[index] || ""}</span>)}
                <input id="auth-otp" className="otpCapture" value={otp} onChange={(event) => setOtp(event.target.value.replace(/\D/g, "").slice(0, policy.codeLength))} inputMode="numeric" autoComplete="one-time-code" aria-label={`${policy.codeLength}-digit verification code`} pattern="[0-9]*" maxLength={policy.codeLength} required />
              </div>
              <button className="primary" disabled={loading || otp.length !== policy.codeLength || verifyAttempts >= policy.maxVerifyAttemptsPerCode}><span>{loading ? "Verifying…" : "Verify"}</span><i>→</i></button>
              <div className="secondaryRow">
                <button type="button" className="secondary" disabled={loading || resendIn > 0 || emailSendUnavailable} onClick={sendCode}>{resendIn > 0 ? `Resend in ${resendIn}s` : "Resend Code"}</button>
                <button type="button" className="secondary" disabled={loading} onClick={() => { setSent(false); setChallengeId(""); setOtp(""); setMessage(""); setError(""); setResendIn(0); setVerifyAttempts(0); }}>Change {isWhatsApp ? "number" : "email"}</button>
              </div>
            </form>
          )}

          {message && <div className="message">✓ {message}</div>}
          {error && <div className="error" role="alert">{error}</div>}
          <footer><span>Encrypted session</span><i>•</i><span>One-time code</span><i>•</i><span>Rate-limit aware</span></footer>
        </section>
      </div>

      <div className="bottomBrand">{PRODUCT_BRAND.name} <span>·</span> {PRODUCT_BRAND.capabilities}</div>
    </main>
  );
}

export default function AuthPage() {
  return <Suspense fallback={<main className="loadingScreen">Loading secure sign in…</main>}><AuthForm /></Suspense>;
}