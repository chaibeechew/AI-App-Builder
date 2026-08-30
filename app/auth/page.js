"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "../../lib/supabase/client";

export const dynamic = "force-dynamic";

function normalizePhone(value) {
  const cleaned = String(value || "").replace(/[\s()-]/g, "");
  if (!/^\+[1-9]\d{7,14}$/.test(cleaned)) throw new Error("Use international format, for example +60123456789.");
  return cleaned;
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
  const [checkingSession, setCheckingSession] = useState(true);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const referralCode = (searchParams.get("ref") || "").trim().toUpperCase();
  const next = searchParams.get("next") || "/";

  useEffect(() => {
    let active = true;
    async function restoreSession() {
      const { data } = await supabase.auth.getSession();
      if (!active) return;
      if (data.session) { router.replace(next); router.refresh(); return; }
      setCheckingSession(false);
    }
    restoreSession();
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!active || !session) return;
      router.replace(next); router.refresh();
    });
    return () => { active = false; listener.subscription.unsubscribe(); };
  }, [supabase, router, next]);

  function switchMethod(value) {
    setMethod(value); setSent(false); setMessage(""); setError(""); setOtp(""); setIdentifier("");
  }

  async function sendCode(event) {
    event?.preventDefault?.();
    if (loading) return;
    setLoading(true); setError(""); setMessage("");
    try {
      const options = { shouldCreateUser: true, data: referralCode ? { referral_code: referralCode } : undefined };
      if (method === "sms") {
        const phone = normalizePhone(identifier);
        const result = await supabase.auth.signInWithOtp({ phone, options });
        if (result.error) throw result.error;
        setIdentifier(phone); setSent(true); setMessage("SMS verification code sent.");
      } else {
        const email = identifier.trim().toLowerCase();
        if (!/^\S+@\S+\.\S+$/.test(email)) throw new Error("Enter a valid email address.");
        const result = await supabase.auth.signInWithOtp({ email, options });
        if (result.error) throw result.error;
        setIdentifier(email); setSent(true); setMessage("Email verification code sent. Check your inbox.");
      }
    } catch (err) {
      const raw = err?.message || "Unable to send verification code.";
      if (method === "sms") setError(`${raw} If SMS delivery is not configured yet, use Email Code instead.`);
      else setError(raw);
    } finally { setLoading(false); }
  }

  async function verifyCode(event) {
    event.preventDefault(); setLoading(true); setError(""); setMessage("");
    try {
      const token = otp.trim();
      if (!/^\d{6,10}$/.test(token)) throw new Error("Enter the verification code you received.");
      const result = method === "sms"
        ? await supabase.auth.verifyOtp({ phone: normalizePhone(identifier), token, type: "sms" })
        : await supabase.auth.verifyOtp({ email: identifier.trim(), token, type: "email" });
      if (result.error) throw result.error;
      if (!result.data.session) throw new Error("Verification succeeded, but no session was created.");
      try { await fetch("/api/referrals/verify", { method: "POST", headers: { "Content-Type": "application/json" } }); } catch {}
      router.replace(next); router.refresh();
    } catch (err) { setError(err?.message || "Verification failed."); }
    finally { setLoading(false); }
  }

  if (checkingSession) return <main className="authLoading">Checking your session…</main>;

  return <main className="authPage"><div className="shade" />
    <header className="brand"><span className="brandMark">S</span><span>SOOLENAI</span><span className="slash">/</span><strong>AI APP BUILDER</strong></header>
    <div className="authCard">
      <div className="authEyebrow">SECURE VERIFICATION</div><h1>Choose how to receive your code</h1><p className="authIntro">Use a one-time verification code by Email or SMS. No password required.</p>
      <div className="authTabs"><button className={method === "email" ? "active" : ""} onClick={() => switchMethod("email")}>✉ Email Code</button><button className={method === "sms" ? "active" : ""} onClick={() => switchMethod("sms")}>◉ SMS Code</button></div>

      {!sent ? <form onSubmit={sendCode}>
        <label>{method === "email" ? "Email address" : "Mobile number"}</label>
        <input value={identifier} onChange={(e) => setIdentifier(e.target.value)} placeholder={method === "email" ? "you@example.com" : "+60123456789"} inputMode={method === "email" ? "email" : "tel"} autoComplete={method === "email" ? "email" : "tel"}/>
        {method === "sms" && <div className="providerNote">SMS delivery uses the configured Supabase phone provider. If your project has not enabled an SMS provider yet, Email Code remains available.</div>}
        {method === "email" && <div className="providerNote">Email OTP requires the Supabase Magic Link / OTP email template to include the six-digit <code>{"{{ .Token }}"}</code>.</div>}
        {referralCode && <div className="referralNotice">Referral code: {referralCode}</div>}
        <button className="authPrimary" disabled={loading}>{loading ? "Sending…" : `Send ${method === "email" ? "Email" : "SMS"} Code`}</button>
      </form> : <form onSubmit={verifyCode}>
        <div className="sentTo">Code sent to <b>{identifier}</b></div><label>Verification code</label><input value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 10))} placeholder="123456" inputMode="numeric" autoComplete="one-time-code"/>
        <button className="authPrimary" disabled={loading || otp.length < 6}>{loading ? "Verifying…" : "Verify & Continue"}</button>
        <button type="button" className="authSecondary" disabled={loading} onClick={sendCode}>Resend Code</button>
        <button type="button" className="authSecondary" onClick={() => { setSent(false); setOtp(""); setMessage(""); setError(""); }}>Use another {method === "email" ? "email" : "number"}</button>
        <button type="button" className="switchFallback" onClick={() => switchMethod(method === "email" ? "sms" : "email")}>Use {method === "email" ? "SMS" : "Email"} instead</button>
      </form>}
      {message && <div className="authMessage">{message}</div>}{error && <div className="authError">{error}</div>}
      <div className="authSecurity">● One-time code · Short-lived session verification · Email fallback</div>
    </div>
    <style jsx>{`
      *{box-sizing:border-box}.authPage{min-height:100vh;display:grid;place-items:center;padding:88px 22px 28px;position:relative;overflow:hidden;background:radial-gradient(circle at 70% 20%,rgba(228,186,73,.18),transparent 28%),linear-gradient(145deg,#04120f,#0a241b);color:#fff}.authPage:before{content:"";position:absolute;inset:0;background:linear-gradient(90deg,rgba(0,9,12,.74),rgba(0,9,12,.18) 60%,rgba(0,9,12,.46));pointer-events:none}.shade{position:absolute;inset:0;backdrop-filter:saturate(.92)}.brand{position:absolute;z-index:2;top:24px;left:28px;display:flex;align-items:center;gap:10px;font-size:15px;letter-spacing:.06em}.brandMark{display:grid;place-items:center;width:36px;height:36px;border-radius:12px;background:#e7ae3a;color:#07110f;font-size:22px;font-weight:950}.brand strong{color:#efb53d}.slash{opacity:.4}.authCard{position:relative;z-index:2;width:min(100%,540px);padding:34px;border:1px solid rgba(238,183,66,.38);border-radius:28px;background:rgba(3,15,17,.88);backdrop-filter:blur(22px);box-shadow:0 30px 90px rgba(0,0,0,.52)}.authEyebrow{color:#efb53d;font-size:11px;letter-spacing:.2em;font-weight:900}h1{font-size:34px;line-height:1.05;margin:10px 0 9px}.authIntro{color:#b7c3c0;line-height:1.55}.authTabs{display:grid;grid-template-columns:1fr 1fr;gap:7px;padding:5px;background:rgba(0,0,0,.3);border-radius:15px;margin:22px 0}.authTabs button{border:0;background:transparent;color:#a9b6b2;padding:12px;border-radius:11px;font-weight:850}.authTabs button.active{background:#e7ae3a;color:#111}label{display:block;font-size:12px;color:#c8d2cf;margin:12px 0 8px}input{width:100%;border:1px solid rgba(238,183,66,.28);background:rgba(0,9,10,.72);color:#fff;border-radius:14px;padding:14px;font-size:16px}.providerNote{margin-top:12px;padding:11px 12px;border:1px solid rgba(111,220,166,.17);border-radius:12px;background:rgba(40,143,94,.08);color:#abd8c1;font-size:12px;line-height:1.5}.providerNote code{color:#f0cd6b}.authPrimary,.authSecondary{width:100%;border-radius:14px;padding:14px;font-weight:900;margin-top:13px}.authPrimary{border:0;background:linear-gradient(135deg,#f3bd48,#d99520);color:#111}.authPrimary:disabled,.authSecondary:disabled{opacity:.55}.authSecondary{border:1px solid rgba(238,183,66,.3);background:transparent;color:#efb53d}.switchFallback{display:block;margin:14px auto 0;border:0;background:transparent;color:#9fe2c1;font-weight:800}.sentTo{color:#a9b6b2;font-size:13px}.sentTo b{color:#fff}.referralNotice,.authMessage,.authError{margin-top:14px;padding:11px;border-radius:12px;font-size:13px}.referralNotice{color:#efb53d}.authMessage{color:#9ae4c0}.authError{background:rgba(145,31,31,.25);color:#ffb1b1}.authSecurity{margin-top:20px;padding-top:17px;border-top:1px solid rgba(255,255,255,.09);color:#8fa19b;font-size:11px}.authLoading{min-height:100vh;display:grid;place-items:center;background:#06110f;color:#fff}@media(max-width:600px){.brand{left:20px;top:20px;font-size:12px}.authCard{padding:25px 20px;border-radius:24px}h1{font-size:29px}}
    `}</style>
  </main>;
}

export default function AuthPage() { return <Suspense fallback={<main className="authLoading">Loading…</main>}><AuthForm /></Suspense>; }
