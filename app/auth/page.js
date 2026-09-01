"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "../../lib/supabase/client";
import { PRODUCT_BRAND } from "../../lib/product-brand.js";
import {
  EMAIL_OTP_POLICY,
  SMS_OTP_POLICY,
  authErrorMessage,
  normalizeEmailAddress,
  normalizeEmailOtp,
  normalizePhoneNumber,
  normalizeSmsOtp,
  otpPolicyForMethod,
} from "../../lib/auth/otp-policy.js";
import { normalizeReferralCode, safeInternalNext } from "../../lib/auth/session-safety.js";

export const dynamic = "force-dynamic";
const SMS_AUTH_ENABLED = process.env.NEXT_PUBLIC_SMS_AUTH_ENABLED === "true";

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
    if (value === "sms" && !SMS_AUTH_ENABLED) return;
    setMethod(value);
    resetFlow();
  }

  async function sendCode(event) {
    event?.preventDefault?.();
    if (loading || (sent && resendIn > 0)) return;
    if (method === "sms" && !SMS_AUTH_ENABLED) {
      setError("SMS verification is not enabled yet. Use Email Code for now.");
      return;
    }
    setLoading(true);
    setError("");
    setMessage("");
    try {
      const options = { shouldCreateUser: true, data: referral ? { referral_code: referral } : undefined };
      if (method === "sms") {
        const phone = normalizePhoneNumber(identifier);
        const result = await supabase.auth.signInWithOtp({ phone, options });
        if (result.error) throw result.error;
        setIdentifier(phone);
        setMessage(`SMS verification code sent to ${phone}.`);
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
    const maxAttempts = method === "sms" ? SMS_OTP_POLICY.maxVerifyAttemptsPerCode : EMAIL_OTP_POLICY.maxVerifyAttemptsPerCode;
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
      const token = method === "sms" ? normalizeSmsOtp(otp) : normalizeEmailOtp(otp);
      attemptedRemoteVerify = true;
      const result = method === "sms"
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

  const identifierLabel = method === "email" ? "Email address" : "Mobile number";
  const methodLabel = method === "email" ? "Email" : "SMS";
  const codePlaceholder = method === "email" ? "12345678" : "123456";

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
          <p>{sent ? `We sent a ${policy.codeLength}-digit ${methodLabel} verification code.` : "Choose Email or SMS. Each method uses its own secure one-time-code policy."}</p>

          <div className="tabs" role="tablist" aria-label="Verification method">
            <button type="button" role="tab" aria-selected={method === "email"} className={method === "email" ? "active" : ""} onClick={() => switchMethod("email")}><span>✉</span><strong>Email Code</strong><b>READY</b></button>
            <button type="button" role="tab" aria-selected={method === "sms"} className={method === "sms" ? "active" : ""} disabled={!SMS_AUTH_ENABLED} onClick={() => switchMethod("sms")}><span>◉</span><strong>SMS Code</strong><b>{SMS_AUTH_ENABLED ? "READY" : "SOON"}</b></button>
          </div>

          {!sent ? (
            <form onSubmit={sendCode}>
              <label htmlFor="auth-identifier">{identifierLabel}</label>
              <div className="inputWrap">
                <span>{method === "email" ? "@" : "+"}</span>
                <input id="auth-identifier" value={identifier} onChange={(event) => setIdentifier(event.target.value)} placeholder={method === "email" ? "you@example.com" : "+60123456789"} inputMode={method === "email" ? "email" : "tel"} autoComplete={method === "email" ? "email" : "tel"} autoCapitalize="none" maxLength={method === "email" ? EMAIL_OTP_POLICY.maxEmailLength : SMS_OTP_POLICY.maxPhoneLength + 8} required />
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
                <button type="button" className="secondary" disabled={loading} onClick={() => { setSent(false); setOtp(""); setMessage(""); setError(""); setResendIn(0); setVerifyAttempts(0); }}>Change {method === "email" ? "email" : "number"}</button>
              </div>
            </form>
          )}

          {message && <div className="message">✓ {message}</div>}
          {error && <div className="error" role="alert">{error}</div>}
          <footer><span>Encrypted session</span><i>•</i><span>One-time code</span><i>•</i><span>Rate-limit aware</span></footer>
        </section>
      </div>

      <div className="bottomBrand">{PRODUCT_BRAND.name} <span>·</span> {PRODUCT_BRAND.capabilities}</div>

      <style jsx>{`
        .authPage{min-height:100svh;position:relative;overflow:hidden;color:#f7fbf8;font-family:Inter,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;background:radial-gradient(circle at 78% 12%,rgba(218,188,91,.16),transparent 28%),radial-gradient(circle at 12% 85%,rgba(24,145,105,.18),transparent 30%),linear-gradient(145deg,#020a08,#061711 48%,#020806);isolation:isolate;padding-bottom:max(20px,env(safe-area-inset-bottom))}
        .aurora{position:absolute;border-radius:999px;filter:blur(80px);opacity:.28;pointer-events:none}.a1{width:360px;height:360px;right:-80px;top:4%;background:#d8b34f}.a2{width:330px;height:330px;left:-140px;bottom:0;background:#0f8c6a}
        .brandBar{position:absolute;z-index:4;top:max(18px,env(safe-area-inset-top));left:clamp(18px,4vw,64px);right:clamp(18px,4vw,64px);min-height:54px;display:flex;align-items:center;gap:12px}.brandMark{width:44px;height:44px;display:grid;place-items:center;border:1px solid rgba(243,213,119,.56);border-radius:14px;background:linear-gradient(145deg,#efd36e,#a87920);color:#06130f;font-size:13px;font-weight:1000;box-shadow:0 8px 30px rgba(216,179,79,.18)}.brandWords{display:grid;gap:2px}.brandWords b{font-size:13px;letter-spacing:.045em}.brandWords span{font-size:9px;letter-spacing:.14em;color:#d7c26f;font-weight:900}.securePill{margin-left:auto;display:flex;align-items:center;gap:7px;border:1px solid rgba(255,255,255,.12);border-radius:999px;background:rgba(3,18,14,.48);backdrop-filter:blur(14px);padding:9px 12px;color:#b8c9c2;font-size:10px;font-weight:800}.securePill i,.trustLine i{width:7px;height:7px;border-radius:50%;background:#62d8a5;box-shadow:0 0 0 5px rgba(98,216,165,.08)}
        .authShell{position:relative;z-index:3;min-height:100svh;width:min(1220px,100%);margin:auto;padding:112px clamp(20px,5vw,72px) 70px;display:grid;grid-template-columns:minmax(0,1.05fr) minmax(360px,.72fr);gap:clamp(42px,8vw,112px);align-items:center}.heroCopy{max-width:610px}.heroCopy>small,.cardTop>small{color:#e2c15f;font-size:10px;font-weight:950;letter-spacing:.22em}.heroCopy h1{margin:16px 0 20px;font-size:clamp(52px,6.1vw,92px);line-height:.93;letter-spacing:-.055em;font-weight:760}.heroCopy h1 em{font-style:normal;color:#e6c666}.heroCopy p{max-width:560px;margin:0;color:#aebfb8;font-size:clamp(16px,1.55vw,20px);line-height:1.65}.capabilityRow{display:flex;flex-wrap:wrap;gap:8px;margin-top:26px}.capabilityRow span{border:1px solid rgba(226,193,95,.24);border-radius:999px;background:rgba(226,193,95,.07);color:#d9c270;padding:8px 10px;font-size:9px;font-weight:950;letter-spacing:.08em}.trustLine{display:flex;align-items:center;gap:10px;color:#82968d;font-size:11px;margin-top:18px}
        .authCard{width:100%;border:1px solid rgba(255,255,255,.12);border-radius:30px;padding:clamp(22px,3vw,34px);background:linear-gradient(160deg,rgba(8,31,24,.94),rgba(4,17,13,.96));box-shadow:0 35px 90px rgba(0,0,0,.46),inset 0 1px 0 rgba(255,255,255,.03);backdrop-filter:blur(18px)}.cardTop{display:flex;justify-content:space-between;align-items:center}.cardTop>span{display:grid;place-items:center;width:34px;height:34px;border-radius:12px;border:1px solid rgba(226,193,95,.26);color:#e0c366;font-size:10px;font-weight:950}.authCard h2{font-size:clamp(30px,4vw,43px);letter-spacing:-.035em;margin:16px 0 8px}.authCard>p{color:#8fa49a;font-size:13px;line-height:1.55;margin:0 0 18px}.tabs{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:20px}.tabs button{min-height:54px;border:1px solid rgba(255,255,255,.1);border-radius:15px;background:#081b15;color:#b8c9c2;display:grid;grid-template-columns:auto 1fr auto;align-items:center;gap:8px;padding:10px 12px;text-align:left;touch-action:manipulation}.tabs button strong{font-size:11px}.tabs button b{font-size:8px;color:#73877d}.tabs button.active{border-color:rgba(226,193,95,.42);background:rgba(226,193,95,.08);color:#fff}.tabs button.active b{color:#e1c566}.tabs button:disabled{opacity:.45;cursor:not-allowed}.authCard form{display:grid;gap:10px}.authCard label{font-size:10px;color:#c8d5cf;font-weight:900;letter-spacing:.06em}.inputWrap{height:56px;border:1px solid rgba(255,255,255,.12);border-radius:15px;background:#04110d;display:grid;grid-template-columns:42px 1fr;align-items:center;overflow:hidden}.inputWrap>span{display:grid;place-items:center;color:#d9c166;font-weight:950}.inputWrap input{width:100%;height:100%;border:0;outline:0;background:transparent;color:#fff;font:inherit;font-size:16px;padding:0 14px 0 0;min-width:0}.inputWrap:focus-within{border-color:rgba(226,193,95,.6);box-shadow:0 0 0 3px rgba(226,193,95,.06)}.otpWrap input{letter-spacing:.22em;font-weight:900}.notice,.sentTo{font-size:10px;color:#8fa49a;padding:8px 2px}.primary{min-height:54px;margin-top:5px;border:0;border-radius:15px;padding:0 16px;background:linear-gradient(135deg,#ead46f,#c69c3c);color:#07110d;font-weight:950;display:flex;align-items:center;justify-content:space-between;touch-action:manipulation}.primary:disabled,.secondary:disabled{opacity:.5;cursor:not-allowed}.secondaryRow{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:4px}.secondary{min-height:46px;border:1px solid rgba(255,255,255,.1);border-radius:13px;background:#071914;color:#9fb1a9;font-weight:850;font-size:10px;touch-action:manipulation}.message,.error{margin-top:14px;border-radius:12px;padding:11px 12px;font-size:11px;line-height:1.45}.message{background:rgba(38,139,96,.14);color:#9de0bf}.error{background:rgba(168,61,51,.16);color:#ffaaa0}.authCard footer{display:flex;justify-content:center;gap:7px;flex-wrap:wrap;margin-top:18px;padding-top:14px;border-top:1px solid rgba(255,255,255,.07);color:#6f8279;font-size:9px}.bottomBrand{position:absolute;z-index:3;left:0;right:0;bottom:max(14px,env(safe-area-inset-bottom));text-align:center;color:#60766b;font-size:9px;letter-spacing:.09em}.bottomBrand span{color:#bda84f}.loadingScreen{min-height:100svh;display:grid;place-items:center;background:#03100d;color:#d8c46a;font-family:Inter,system-ui,sans-serif}
        @media(max-width:860px){.authPage{overflow:auto}.authShell{grid-template-columns:1fr;gap:26px;padding-top:104px;padding-bottom:62px}.heroCopy{display:none}.authCard{max-width:560px;margin:auto}.brandWords span{display:none}.bottomBrand{position:relative;bottom:auto;padding:0 0 max(10px,env(safe-area-inset-bottom))}}
        @media(max-width:480px){.brandBar{left:14px;right:14px;top:max(10px,env(safe-area-inset-top))}.securePill{padding:8px 10px}.authShell{padding:82px 12px 44px}.authCard{border-radius:22px;padding:19px 16px}.authCard h2{font-size:32px}.tabs{gap:6px}.tabs button{padding:9px;min-height:52px}.secondaryRow{grid-template-columns:1fr}.secondary{min-height:48px}.inputWrap{height:56px}}
        @media(prefers-reduced-motion:reduce){.authPage *, .authPage *::before, .authPage *::after{scroll-behavior:auto!important;animation:none!important;transition:none!important}}
      `}</style>
    </main>
  );
}

export default function AuthPage() {
  return <Suspense fallback={<main className="loadingScreen">Loading secure sign in…</main>}><AuthForm /></Suspense>;
}
