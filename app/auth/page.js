"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "../../lib/supabase/client";
import { PRODUCT_BRAND } from "../../lib/product-brand.js";
import { EMAIL_OTP_POLICY, authErrorMessage, normalizeEmailAddress, normalizeEmailOtp } from "../../lib/auth/otp-policy.js";
import { normalizeReferralCode, safeInternalNext } from "../../lib/auth/session-safety.js";

export const dynamic = "force-dynamic";
const SMS_AUTH_ENABLED = process.env.NEXT_PUBLIC_SMS_AUTH_ENABLED === "true";

function normalizePhone(value) {
  const cleaned = String(value || "").replace(/[\s()-]/g, "");
  if (!/^\+[1-9]\d{7,14}$/.test(cleaned)) throw new Error("Use international format, for example +60123456789.");
  return cleaned;
}

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
    const timer = setInterval(() => setResendIn((v) => Math.max(0, v - 1)), 1000);
    return () => clearInterval(timer);
  }, [resendIn]);

  function switchMethod(value) {
    if (value === "sms" && !SMS_AUTH_ENABLED) return;
    setMethod(value);
    setIdentifier("");
    setOtp("");
    setSent(false);
    setMessage("");
    setError("");
    setResendIn(0);
    setVerifyAttempts(0);
  }

  async function sendCode(event) {
    event?.preventDefault?.();
    if (loading || (sent && resendIn > 0)) return;
    if (method === "sms" && !SMS_AUTH_ENABLED) {
      setError("SMS verification is coming soon. Please use Email Code.");
      return;
    }
    setLoading(true);
    setError("");
    setMessage("");
    try {
      const options = { shouldCreateUser: true, data: referral ? { referral_code: referral } : undefined };
      if (method === "sms") {
        const phone = normalizePhone(identifier);
        const result = await supabase.auth.signInWithOtp({ phone, options });
        if (result.error) throw result.error;
        setIdentifier(phone);
        setSent(true);
        setMessage("SMS verification code sent.");
      } else {
        const email = normalizeEmailAddress(identifier);
        const result = await supabase.auth.signInWithOtp({ email, options });
        if (result.error) throw result.error;
        setIdentifier(email);
        setSent(true);
        setMessage(`${PRODUCT_BRAND.name} verification code sent to ${email}. Check your inbox and spam folder.`);
      }
      setOtp("");
      setVerifyAttempts(0);
      setResendIn(EMAIL_OTP_POLICY.resendSeconds);
    } catch (e) {
      setError(safeFlowError(e, method));
    } finally {
      setLoading(false);
    }
  }

  async function verify(event) {
    event.preventDefault();
    if (verifyAttempts >= EMAIL_OTP_POLICY.maxVerifyAttemptsPerCode) {
      setError("Too many incorrect attempts. Request a new verification code.");
      return;
    }
    setLoading(true);
    setError("");
    setMessage("");
    let attemptedRemoteVerify = false;
    if (typeof window !== "undefined") window.__LANERIQ_AUTH_FLOW_BUSY__ = true;
    try {
      const token = normalizeEmailOtp(otp);
      attemptedRemoteVerify = true;
      const result = method === "sms"
        ? await supabase.auth.verifyOtp({ phone: normalizePhone(identifier), token, type: "sms" })
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
    } catch (e) {
      if (attemptedRemoteVerify) setVerifyAttempts((value) => Math.min(EMAIL_OTP_POLICY.maxVerifyAttemptsPerCode, value + 1));
      setError(safeFlowError(e, method));
    } finally {
      if (typeof window !== "undefined") window.__LANERIQ_AUTH_FLOW_BUSY__ = false;
      setLoading(false);
    }
  }

  if (checking) return <main className="loading">Checking your session…</main>;

  return (
    <main className="authPage">
      <div className="veil" />
      <div className="aurora auroraOne" />
      <div className="aurora auroraTwo" />

      <header className="brandBar" aria-label={`${PRODUCT_BRAND.name} ${PRODUCT_BRAND.capabilities}`}>
        <div className="brandMark">AI</div>
        <div className="brandWords">
          <b>{PRODUCT_BRAND.name}</b>
          <span>{PRODUCT_BRAND.capabilities}</span>
        </div>
        <div className="securePill"><i /> Secure sign in</div>
      </header>

      <div className="authShell">
        <section className="heroCopy" aria-label="AI BUILD APP & WEB welcome">
          <small>CREATE WITHOUT LIMITS</small>
          <h1>One code.<br /><em>Your whole studio.</em></h1>
          <p>Sign in once, then continue creating apps, websites and mobile games in the same premium workspace.</p>
          <div className="capabilityRow">
            <span>APPS</span><span>GAMES</span><span>WEB</span><span>iOS + Android</span>
          </div>
          <div className="trustLine"><i /> Private project access · passwordless verification</div>
        </section>

        <section className="authCard">
          <div className="cardTop">
            <small>SECURE VERIFICATION</small>
            <span className="stepBadge">01</span>
          </div>
          <h2>{sent ? "Enter your code" : "Welcome back"}</h2>
          <p>{sent ? `We sent an ${EMAIL_OTP_POLICY.codeLength}-digit verification code to your ${method === "email" ? "email" : "mobile"}.` : `Use a one-time ${EMAIL_OTP_POLICY.codeLength}-digit code. No password required.`}</p>

          <div className="tabs" role="tablist" aria-label="Verification method">
            <button type="button" role="tab" aria-selected={method === "email"} className={method === "email" ? "active" : ""} onClick={() => switchMethod("email")}>
              <span className="tabIcon">✉</span><span>Email Code</span><b>READY</b>
            </button>
            <button type="button" role="tab" aria-selected={method === "sms"} className={method === "sms" ? "active" : ""} disabled={!SMS_AUTH_ENABLED} onClick={() => switchMethod("sms")}>
              <span className="tabIcon">◉</span><span>SMS Code</span><b>{SMS_AUTH_ENABLED ? "READY" : "SOON"}</b>
            </button>
          </div>

          {!sent ? (
            <form onSubmit={sendCode}>
              <label>{method === "email" ? "Email address" : "Mobile number"}</label>
              <div className="inputWrap">
                <span>{method === "email" ? "@" : "+"}</span>
                <input
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder={method === "email" ? "you@example.com" : "+60123456789"}
                  inputMode={method === "email" ? "email" : "tel"}
                  autoComplete={method === "email" ? "email" : "tel"}
                  autoCapitalize="none"
                  maxLength={method === "email" ? EMAIL_OTP_POLICY.maxEmailLength : 24}
                />
              </div>
              {referral && <div className="notice">Referral code · {referral}</div>}
              <button className="primary" disabled={loading}>
                <span>{loading ? "Sending…" : `Send ${method === "email" ? "Email" : "SMS"} Code`}</span><i>→</i>
              </button>
            </form>
          ) : (
            <form onSubmit={verify}>
              <div className="sentTo">Code sent to <b>{identifier}</b></div>
              <label>{EMAIL_OTP_POLICY.codeLength}-digit verification code</label>
              <div className="inputWrap otpWrap">
                <span>#</span>
                <input
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, EMAIL_OTP_POLICY.codeLength))}
                  placeholder="12345678"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  aria-label={`${EMAIL_OTP_POLICY.codeLength}-digit verification code`}
                />
              </div>
              <button className="primary" disabled={loading || otp.length !== EMAIL_OTP_POLICY.codeLength || verifyAttempts >= EMAIL_OTP_POLICY.maxVerifyAttemptsPerCode}>
                <span>{loading ? "Verifying…" : "Verify & Continue"}</span><i>→</i>
              </button>
              <div className="secondaryRow">
                <button type="button" className="secondary" disabled={loading || resendIn > 0} onClick={sendCode}>{resendIn > 0 ? `Resend in ${resendIn}s` : "Resend Code"}</button>
                <button type="button" className="secondary" disabled={loading} onClick={() => { setSent(false); setOtp(""); setMessage(""); setError(""); setResendIn(0); setVerifyAttempts(0); }}>Change {method === "email" ? "email" : "number"}</button>
              </div>
            </form>
          )}

          {message && <div className="message">✓ {message}</div>}
          {error && <div className="error">{error}</div>}
          <footer><span>Encrypted session</span><i>•</i><span>One-time code</span><i>•</i><span>Rate-limit aware</span></footer>
        </section>
      </div>

      <div className="bottomBrand">{PRODUCT_BRAND.name} <span>·</span> {PRODUCT_BRAND.capabilities}</div>

      <style jsx>{`
        .authPage{min-height:100svh;position:relative;overflow:hidden;color:#f7fbf8;font-family:Inter,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;background-color:#03100d;isolation:isolate}
        .veil{position:absolute;inset:0;z-index:0;background:linear-gradient(90deg,rgba(1,9,8,.82) 0%,rgba(1,9,8,.56) 42%,rgba(1,9,8,.64) 100%),linear-gradient(180deg,rgba(1,8,7,.08),rgba(1,8,7,.74));backdrop-filter:saturate(.92)}
        .aurora{position:absolute;z-index:0;border-radius:999px;filter:blur(70px);opacity:.34;pointer-events:none}.auroraOne{width:340px;height:340px;right:6%;top:8%;background:#d8b34f}.auroraTwo{width:300px;height:300px;left:-80px;bottom:-80px;background:#0f8c6a}
        .brandBar{position:absolute;z-index:4;top:max(22px,env(safe-area-inset-top));left:clamp(22px,4vw,66px);right:clamp(22px,4vw,66px);height:54px;display:flex;align-items:center;gap:12px}
        .brandMark{width:42px;height:42px;display:grid;place-items:center;border:1px solid rgba(243,213,119,.6);border-radius:14px;background:linear-gradient(145deg,rgba(246,214,113,.96),rgba(176,125,34,.95));color:#06130f;font-size:13px;font-weight:1000;box-shadow:0 8px 30px rgba(216,179,79,.2)}
        .brandWords{display:grid;gap:2px}.brandWords b{font-size:13px;letter-spacing:.045em}.brandWords span{font-size:9px;letter-spacing:.16em;color:#d7c26f;font-weight:900}
        .securePill{margin-left:auto;display:flex;align-items:center;gap:7px;border:1px solid rgba(255,255,255,.12);border-radius:999px;background:rgba(3,18,14,.42);backdrop-filter:blur(16px);padding:8px 11px;color:#b8c9c2;font-size:10px;font-weight:800}.securePill i,.trustLine i{width:7px;height:7px;border-radius:50%;background:#62d8a5;box-shadow:0 0 0 5px rgba(98,216,165,.08)}
        .authShell{position:relative;z-index:3;min-height:100svh;width:min(1220px,100%);margin:auto;padding:118px clamp(22px,5vw,72px) 68px;box-sizing:border-box;display:grid;grid-template-columns:minmax(0,1.05fr) minmax(380px,.72fr);gap:clamp(44px,8vw,116px);align-items:center}
        .heroCopy{max-width:610px;padding-bottom:4vh}.heroCopy>small,.authCard .cardTop>small{color:#e2c15f;font-size:10px;font-weight:950;letter-spacing:.22em}.heroCopy h1{margin:16px 0 20px;font-size:clamp(54px,6.1vw,92px);line-height:.93;letter-spacing:-.055em;font-weight:760}.heroCopy h1 em{font-style:normal;color:#e6c666;text-shadow:0 10px 42px rgba(226,193,95,.18)}.heroCopy p{max-width:570px;margin:0;color:#b7c5c0;font-size:clamp(14px,1.5vw,18px);line-height:1.65}.capabilityRow{display:flex;gap:8px;flex-wrap:wrap;margin-top:30px}.capabilityRow span{border:1px solid rgba(226,193,95,.26);border-radius:999px;background:rgba(8,29,23,.48);backdrop-filter:blur(12px);padding:9px 12px;color:#e8d584;font-size:9px;font-weight:950;letter-spacing:.08em}.trustLine{display:flex;align-items:center;gap:10px;margin-top:26px;color:#8fa49c;font-size:10px;font-weight:750}
        .authCard{position:relative;border:1px solid rgba(229,200,108,.28);border-radius:30px;background:linear-gradient(155deg,rgba(5,25,20,.84),rgba(2,13,11,.77));backdrop-filter:blur(30px) saturate(1.08);-webkit-backdrop-filter:blur(30px) saturate(1.08);box-shadow:0 42px 120px rgba(0,0,0,.55),inset 0 1px 0 rgba(255,255,255,.06);padding:clamp(26px,3vw,38px);overflow:hidden}.authCard:before{content:"";position:absolute;inset:0;background:radial-gradient(circle at 86% 0%,rgba(230,197,92,.12),transparent 30%);pointer-events:none}.cardTop{position:relative;display:flex;align-items:center;justify-content:space-between}.stepBadge{display:grid;place-items:center;width:34px;height:34px;border-radius:50%;border:1px solid rgba(226,193,95,.25);color:#d8bd66;font-size:10px;font-weight:900}.authCard h2{position:relative;margin:17px 0 9px;font-size:clamp(34px,4vw,48px);line-height:1;letter-spacing:-.04em}.authCard>p{position:relative;margin:0;color:#92a69e;font-size:13px;line-height:1.55}
        .tabs{position:relative;display:grid;grid-template-columns:1fr 1fr;gap:7px;margin:26px 0 23px;padding:5px;border:1px solid rgba(255,255,255,.07);border-radius:18px;background:rgba(0,0,0,.24)}.tabs button{min-width:0;border:0;border-radius:14px;background:transparent;color:#81968e;padding:12px 10px;display:grid;grid-template-columns:auto 1fr auto;align-items:center;gap:7px;text-align:left;font:850 11px/1.2 Inter,system-ui,sans-serif;cursor:pointer}.tabs button b{font-size:7px;letter-spacing:.1em;color:#6e837b}.tabs button.active{background:linear-gradient(135deg,#efd06f,#b8892d);color:#07130f;box-shadow:0 8px 22px rgba(205,164,54,.18)}.tabs button.active b{color:#304b40}.tabs button:disabled{cursor:not-allowed;opacity:.48}.tabIcon{font-size:14px}
        form{position:relative}label{display:block;margin:0 0 8px;color:#b7c7c1;font-size:10px;font-weight:850;letter-spacing:.04em}.inputWrap{display:flex;align-items:center;border:1px solid rgba(226,193,95,.22);border-radius:16px;background:rgba(1,10,8,.58);transition:border-color .2s,box-shadow .2s}.inputWrap:focus-within{border-color:rgba(235,205,111,.7);box-shadow:0 0 0 4px rgba(226,193,95,.07)}.inputWrap>span{width:44px;text-align:center;color:#d9be68;font-weight:900}.inputWrap input{min-width:0;flex:1;box-sizing:border-box;border:0;outline:0;background:transparent;color:#fff;padding:15px 15px 15px 0;font-size:16px}.inputWrap input::placeholder{color:#60746d}.otpWrap input{font-variant-numeric:tabular-nums;letter-spacing:.16em;font-weight:900}.primary{width:100%;margin-top:14px;border:1px solid rgba(248,220,129,.48);border-radius:16px;background:linear-gradient(135deg,#f0d06f 0%,#c99831 100%);color:#06120e;min-height:54px;padding:0 17px;display:flex;align-items:center;justify-content:space-between;font:950 13px/1 Inter,system-ui,sans-serif;box-shadow:0 14px 36px rgba(192,145,38,.2);cursor:pointer}.primary i{font-style:normal;font-size:20px}.primary:disabled{opacity:.52;cursor:not-allowed}.notice,.message,.error,.sentTo{position:relative;margin-top:12px;padding:11px 12px;border-radius:12px;font-size:10px;line-height:1.45}.notice{border:1px solid rgba(226,193,95,.18);background:rgba(226,193,95,.06);color:#dfc56e}.message{border:1px solid rgba(82,211,155,.18);background:rgba(56,160,117,.10);color:#9de1c3}.error{border:1px solid rgba(255,127,117,.16);background:rgba(126,40,36,.22);color:#ffb1a9}.sentTo{margin:0 0 15px;background:rgba(255,255,255,.035);color:#82978f}.sentTo b{color:#e8f1ed}.secondaryRow{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:9px}.secondary{border:1px solid rgba(226,193,95,.18);border-radius:13px;background:rgba(7,27,21,.48);color:#d8c16f;padding:11px 9px;font:850 9px/1.2 Inter,system-ui,sans-serif;cursor:pointer}.secondary:disabled{opacity:.45;cursor:not-allowed}.authCard footer{position:relative;margin-top:20px;padding-top:16px;border-top:1px solid rgba(255,255,255,.08);display:flex;align-items:center;justify-content:center;gap:7px;flex-wrap:wrap;color:#6f847c;font-size:8px;font-weight:800;letter-spacing:.03em}.authCard footer i{font-style:normal;color:#b8943a}.bottomBrand{position:absolute;z-index:3;left:0;right:0;bottom:max(18px,env(safe-area-inset-bottom));text-align:center;color:#789087;font-size:8px;font-weight:900;letter-spacing:.14em}.bottomBrand span{color:#c6a94f;margin:0 5px}
        .loading{min-height:100svh;display:grid;place-items:center;background:#04110e;color:#d9c16d;font:800 12px/1 Inter,system-ui,sans-serif}
        @media(max-width:900px){.authShell{grid-template-columns:1fr;gap:24px;padding-top:104px;align-content:center}.heroCopy{max-width:560px;padding:0}.heroCopy h1{font-size:clamp(48px,11vw,72px)}.heroCopy p{max-width:520px}.authCard{width:min(560px,100%);box-sizing:border-box}.bottomBrand{display:none}}
        @media(max-width:620px){.authPage{overflow:auto}.brandBar{top:max(14px,env(safe-area-inset-top));left:16px;right:16px;height:46px}.brandMark{width:36px;height:36px;border-radius:12px;font-size:11px}.brandWords b{font-size:10px}.brandWords span{font-size:7px}.securePill{padding:7px 9px;font-size:8px}.authShell{min-height:100svh;padding:84px 14px max(24px,env(safe-area-inset-bottom));display:block}.heroCopy{padding:10px 8px 20px}.heroCopy>small{font-size:8px}.heroCopy h1{margin:9px 0 10px;font-size:clamp(38px,12.2vw,54px);line-height:.94}.heroCopy p{font-size:11px;line-height:1.52;max-width:420px}.capabilityRow{margin-top:14px;gap:5px}.capabilityRow span{padding:6px 8px;font-size:7px}.trustLine{display:none}.authCard{border-radius:25px;padding:23px 18px;margin-bottom:12px}.authCard h2{font-size:34px;margin-top:13px}.authCard>p{font-size:11px}.tabs{margin:19px 0 18px}.tabs button{padding:11px 8px;grid-template-columns:auto 1fr}.tabs button b{display:none}.inputWrap input{font-size:16px}.primary{min-height:52px}.secondaryRow{grid-template-columns:1fr}.authCard footer{font-size:7px;gap:5px}.auroraOne{width:220px;height:220px;right:-70px}.auroraTwo{width:190px;height:190px}}
        @media(max-width:390px){.brandWords span{display:none}.securePill{font-size:0;padding:8px}.securePill:after{content:"Secure";font-size:8px}.heroCopy h1{font-size:40px}.authCard{padding:21px 16px}.authCard h2{font-size:31px}}
      `}</style>
      <style jsx global>{`
        body:has(.authPage) .wallpaperControl,
        body:has(.authPage) .studioLauncher,
        body:has(.authPage) .referenceDock,
        body:has(.authPage) .sv-fab{display:none!important}
        body:has(.authPage){background:#03100d}
      `}</style>
    </main>
  );
}

export default function AuthPage() {
  return <Suspense fallback={<main className="loading">Loading…</main>}><AuthForm /></Suspense>;
}
