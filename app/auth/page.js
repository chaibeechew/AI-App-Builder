"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "../../lib/supabase/client";
import { PRODUCT_BRAND } from "../../lib/product-brand.js";

export const dynamic = "force-dynamic";
const RESEND_SECONDS = 60;
const OTP_LENGTH = 8;
const SMS_AUTH_ENABLED = process.env.NEXT_PUBLIC_SMS_AUTH_ENABLED === "true";
// Canonical customer branding is always sourced from PRODUCT_BRAND.

function normalizePhone(value) {
  const cleaned = String(value || "").replace(/[\s()-]/g, "");
  if (!/^\+[1-9]\d{7,14}$/.test(cleaned)) throw new Error("Use international format, for example +60123456789.");
  return cleaned;
}

function friendly(error, method) {
  const code = String(error?.code || "").toLowerCase();
  const raw = String(error?.message || "");
  if (code === "phone_provider_disabled" || /unsupported phone provider/i.test(raw)) return "SMS verification is not enabled yet. Use Email Code for now.";
  if (code === "over_sms_send_rate_limit") return "Too many SMS codes were requested. Please wait before trying again.";
  if (code.includes("rate") || /rate limit|security purposes/i.test(raw)) return `Please wait about ${RESEND_SECONDS} seconds before requesting another code.`;
  if (/expired/i.test(raw)) return "This verification code has expired. Request a new code.";
  if (/invalid.*token|token.*invalid|otp.*invalid/i.test(raw)) return "The verification code is incorrect. Check it and try again.";
  return raw || `Unable to ${method === "sms" ? "send SMS" : "send email"} verification code.`;
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
  const referral = (searchParams.get("ref") || "").trim().toUpperCase();
  const next = searchParams.get("next") || "/";

  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      if (data.session) {
        router.replace(next);
        router.refresh();
      } else setChecking(false);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (active && session) {
        router.replace(next);
        router.refresh();
      }
    });
    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
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
        const email = identifier.trim().toLowerCase();
        if (!/^\S+@\S+\.\S+$/.test(email)) throw new Error("Enter a valid email address.");
        const result = await supabase.auth.signInWithOtp({ email, options });
        if (result.error) throw result.error;
        setIdentifier(email);
        setSent(true);
        setMessage(`${PRODUCT_BRAND.name} verification code sent to ${email}. Check your inbox and spam folder.`);
      }
      setResendIn(RESEND_SECONDS);
    } catch (e) {
      setError(friendly(e, method));
    } finally {
      setLoading(false);
    }
  }

  async function verify(event) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");
    try {
      const token = otp.trim();
      if (!new RegExp(`^\\d{${OTP_LENGTH}}$`).test(token)) throw new Error(`Enter the ${OTP_LENGTH}-digit verification code you received.`);
      const result = method === "sms"
        ? await supabase.auth.verifyOtp({ phone: normalizePhone(identifier), token, type: "sms" })
        : await supabase.auth.verifyOtp({ email: identifier.trim().toLowerCase(), token, type: "email" });
      if (result.error) throw result.error;
      if (!result.data.session) throw new Error("Verification succeeded, but no session was created.");
      try {
        await fetch("/api/referrals/verify", { method: "POST", headers: { "Content-Type": "application/json" } });
      } catch {}
      router.replace(next);
      router.refresh();
    } catch (e) {
      setError(friendly(e, method));
    } finally {
      setLoading(false);
    }
  }

  if (checking) return <main className="loading">Checking your session…</main>;

  return (
    <main className="page">
      <div className="shade" />
      <header className="brand" aria-label={`${PRODUCT_BRAND.name} ${PRODUCT_BRAND.capabilities}`}>
        <span className="mark">AI</span>
        <span>{PRODUCT_BRAND.name}</span>
        <i>/</i>
        <strong>{PRODUCT_BRAND.capabilities}</strong>
      </header>
      <section className="card">
        <small>SECURE VERIFICATION</small>
        <h1>Sign in to {PRODUCT_BRAND.name}</h1>
        <p>Use a one-time {OTP_LENGTH}-digit Email Code. No password required.</p>
        <div className="tabs">
          <button className={method === "email" ? "active" : ""} onClick={() => switchMethod("email")}>✉ Email Code</button>
          <button className={method === "sms" ? "active" : ""} disabled={!SMS_AUTH_ENABLED} onClick={() => switchMethod("sms")}>◉ SMS {SMS_AUTH_ENABLED ? "Code" : "· Coming Soon"}</button>
        </div>
        {!sent ? (
          <form onSubmit={sendCode}>
            <label>{method === "email" ? "Email address" : "Mobile number"}</label>
            <input value={identifier} onChange={(e) => setIdentifier(e.target.value)} placeholder={method === "email" ? "you@example.com" : "+60123456789"} inputMode={method === "email" ? "email" : "tel"} autoComplete={method === "email" ? "email" : "tel"} />
            {referral && <div className="notice">Referral code: {referral}</div>}
            <button className="primary" disabled={loading}>{loading ? "Sending…" : `Send ${method === "email" ? "Email" : "SMS"} Code`}</button>
          </form>
        ) : (
          <form onSubmit={verify}>
            <div className="sent">Code sent to <b>{identifier}</b></div>
            <label>{OTP_LENGTH}-digit verification code</label>
            <input value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, OTP_LENGTH))} placeholder="12345678" inputMode="numeric" autoComplete="one-time-code" />
            <button className="primary" disabled={loading || otp.length !== OTP_LENGTH}>{loading ? "Verifying…" : "Verify & Continue"}</button>
            <button type="button" className="secondary" disabled={loading || resendIn > 0} onClick={sendCode}>{resendIn > 0 ? `Resend available in ${resendIn}s` : "Resend Code"}</button>
            <button type="button" className="secondary" disabled={loading} onClick={() => { setSent(false); setOtp(""); setMessage(""); setError(""); setResendIn(0); }}>Use another {method === "email" ? "email" : "number"}</button>
          </form>
        )}
        {message && <div className="message">{message}</div>}
        {error && <div className="error">{error}</div>}
        <footer>{PRODUCT_BRAND.name} · One-time code · Rate-limit aware · Short-lived verification</footer>
      </section>
      <style jsx>{`.page{min-height:100vh;display:grid;place-items:center;padding:92px 20px 28px;position:relative;overflow:hidden;background:radial-gradient(circle at 70% 20%,rgba(228,186,73,.18),transparent 28%),linear-gradient(145deg,#04120f,#0a241b);color:#fff;font-family:Inter,system-ui,-apple-system,sans-serif}.page:before{content:"";position:absolute;inset:0;background:linear-gradient(90deg,rgba(0,9,12,.75),rgba(0,9,12,.2) 60%,rgba(0,9,12,.48))}.shade{position:absolute;inset:0;backdrop-filter:saturate(.92)}.brand{position:absolute;z-index:2;top:24px;left:28px;display:flex;align-items:center;gap:9px;font-size:13px;letter-spacing:.05em}.mark{display:grid;place-items:center;width:36px;height:36px;border-radius:12px;background:#e7ae3a;color:#07110f;font-size:14px;font-weight:950}.brand strong{color:#efb53d}.brand i{opacity:.45;font-style:normal}.card{position:relative;z-index:2;width:min(100%,540px);padding:32px;border:1px solid rgba(238,183,66,.38);border-radius:28px;background:rgba(3,15,17,.88);backdrop-filter:blur(22px);box-shadow:0 30px 90px #0008}.card>small{color:#efb53d;letter-spacing:.18em;font-weight:900}.card h1{font-size:34px;line-height:1.05;margin:10px 0}.card>p{color:#b7c3c0;line-height:1.55}.tabs{display:grid;grid-template-columns:1fr 1fr;gap:7px;padding:5px;background:#0005;border-radius:15px;margin:22px 0}.tabs button{border:0;background:transparent;color:#a9b6b2;padding:12px;border-radius:11px;font-weight:850}.tabs .active{background:#e7ae3a;color:#111}.tabs button:disabled{opacity:.5}label{display:block;font-size:12px;color:#c8d2cf;margin:12px 0 8px}input{box-sizing:border-box;width:100%;border:1px solid rgba(238,183,66,.28);background:#0008;color:#fff;border-radius:14px;padding:14px;font-size:16px}.primary,.secondary{width:100%;border-radius:14px;padding:14px;font-weight:900;margin-top:13px}.primary{border:0;background:linear-gradient(135deg,#f3bd48,#d99520);color:#111}.secondary{border:1px solid #eeb7424d;background:transparent;color:#efb53d}.primary:disabled,.secondary:disabled{opacity:.55}.sent{color:#a9b6b2;font-size:13px}.sent b{color:#fff}.notice,.message,.error{margin-top:13px;padding:11px;border-radius:12px;font-size:13px}.notice{color:#efb53d}.message{color:#9ae4c0}.error{background:#911f1f40;color:#ffb1b1}.card footer{margin-top:19px;padding-top:16px;border-top:1px solid #ffffff16;color:#8fa19b;font-size:11px}.loading{min-height:100vh;display:grid;place-items:center;background:#06110f;color:#fff}@media(max-width:600px){.brand{left:18px;top:18px;font-size:10px;right:18px;flex-wrap:wrap}.brand strong{max-width:210px}.card{padding:24px 19px;border-radius:24px}.card h1{font-size:29px}}`}</style>
    </main>
  );
}

export default function AuthPage() {
  return <Suspense fallback={<main className="loading">Loading…</main>}><AuthForm /></Suspense>;
}
