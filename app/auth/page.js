"use client";

import "./auth.css";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "../../lib/supabase/client";
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

function safeFlowError(error, method) {
  const message = String(error?.message || "");
  if (message === "Enter a valid email address." || message.startsWith("Enter the ") || message.startsWith("Too many incorrect")) return message;
  if (message.startsWith("Use international format")) return message;
  return authErrorMessage(error, method);
}

function AuthForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = useMemo(() => createClient(), []);
  const [method, setMethod] = useState("email");
  const [identifier, setIdentifier] = useState("");
  const [otp, setOtp] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [resendIn, setResendIn] = useState(0);
  const [verifyAttempts, setVerifyAttempts] = useState(0);
  const referral = normalizeReferralCode(searchParams.get("ref"));
  const next = safeInternalNext(searchParams.get("next"));
  const policy = otpPolicyForMethod(method);

  useEffect(() => {
    let active = true;
    supabase.auth.getUser().then(({ data, error: userError }) => {
      if (!active) return;
      if (!userError && data?.user) {
        router.replace(next);
        router.refresh();
      } else {
        setChecking(false);
      }
    }).catch(() => { if (active) setChecking(false); });
    return () => { active = false; };
  }, [supabase, router, next]);

  useEffect(() => {
    if (resendIn <= 0) return;
    const timer = window.setInterval(() => setResendIn((value) => Math.max(0, value - 1)), 1000);
    return () => window.clearInterval(timer);
  }, [resendIn]);

  function resetFlow() {
    setIdentifier("");
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
    if (loading || (sent && resendIn > 0)) return;
    if (method === "whatsapp" && !WHATSAPP_AUTH_ENABLED) {
      setError("WhatsApp verification is still being configured. Email Code remains available.");
      return;
    }
    setLoading(true);
    setError("");
    setMessage("");
    try {
      const options = { shouldCreateUser: true, data: referral ? { referral_code: referral } : undefined };
      if (method === "whatsapp") {
        const phone = normalizePhoneNumber(identifier);
        // Supabase phone OTP is retained only as the secure OTP/session authority.
        // Delivery must be routed through the configured Meta WhatsApp Auth Hook; there is no UI SMS fallback.
        const result = await supabase.auth.signInWithOtp({ phone, options });
        if (result.error) throw result.error;
        setIdentifier(phone);
        setMessage(`WhatsApp verification code sent to ${phone}.`);
      } else {
        const email = normalizeEmailAddress(identifier);
        const result = await supabase.auth.signInWithOtp({ email, options });
        if (result.error) throw result.error;
        setIdentifier(email);
        setMessage(`${PRODUCT_BRAND.name} verification code sent to ${email}. Check your inbox and spam folder.`);
      }
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
      // Supabase currently names phone OTP verification type "sms" internally even when a Send SMS Hook
      // delivers the OTP over Meta WhatsApp. This value is never presented as a customer verification option.
      const result = method === "whatsapp"
        ? await supabase.auth.verifyOtp({ phone: normalizePhoneNumber(identifier), token, type: "sms" })
        : await supabase.auth.verifyOtp({ email: normalizeEmailAddress(identifier), token, type: "email" });
      if (result.error) throw result.error;
      if (!result.data?.session) throw new Error("SESSION_NOT_CREATED");

      const { data: trustedUserData, error: trustedUserError } = await supabase.auth.getUser();
      if (trustedUserError || !trustedUserData?.user) throw new Error("SESSION_USER_NOT_VERIFIED");
      if (result.data.user?.id && trustedUserData.user.id !== result.data.user.id) throw new Error("SESSION_USER_MISMATCH");

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
      if (attemptedRemoteVerify) setVerifyAttempts((value) => Math.min(maxAttempts, value + 1));
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
        </section>

        <section className="authCard" aria-live="polite">
          <div className="cardTop"><small>SECURE VERIFICATION</small><span>{sent ? "02" : "01"}</span></div>
          <h2>{sent ? "Enter your code" : "Welcome back"}</h2>
          <p>{sent ? `We sent a ${policy.codeLength}-digit ${methodLabel} verification code.` : "Choose Email Code or WhatsApp Code. No paid SMS fallback is used."}</p>

          <div className="tabs" role="tablist" aria-label="Verification method">
            <button type="button" role="tab" aria-selected={method === "email"} className={method === "email" ? "active" : ""} onClick={() => switchMethod("email")}><span>✉</span><strong>Email Code</strong><b>READY</b></button>
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
              <button className="primary" disabled={loading}><span>{loading ? "Sending…" : `Send ${methodLabel} Code`}</span><i>→</i></button>
            </form>
          ) : (
            <form onSubmit={verify}>
              <div className="sentTo">Code sent to <b>{identifier}</b></div>
              <label htmlFor="auth-otp">{policy.codeLength}-digit verification code</label>
              <div className="inputWrap otpWrap">
                <span>#</span>
                <input id="auth-otp" value={otp} onChange={(event) => setOtp(event.target.value.replace(/\D/g, "").slice(0, policy.codeLength))} placeholder={codePlaceholder} inputMode="numeric" autoComplete="one-time-code" aria-label={`${policy.codeLength}-digit verification code`} pattern="[0-9]*" required />
              </div>
              <button className="primary" disabled={loading || otp.length !== policy.codeLength || verifyAttempts >= policy.maxVerifyAttemptsPerCode}><span>{loading ? "Verifying…" : "Verify & Continue"}</span><i>→</i></button>
              <div className="secondaryRow">
                <button type="button" className="secondary" disabled={loading || resendIn > 0} onClick={sendCode}>{resendIn > 0 ? `Resend in ${resendIn}s` : "Resend Code"}</button>
                <button type="button" className="secondary" disabled={loading} onClick={() => { setSent(false); setOtp(""); setMessage(""); setError(""); setResendIn(0); setVerifyAttempts(0); }}>Change {isWhatsApp ? "number" : "email"}</button>
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