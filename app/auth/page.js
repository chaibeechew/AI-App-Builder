"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "../../lib/supabase/client";

export const dynamic = "force-dynamic";

const CHANNELS = [
  { id: "whatsapp", label: "WhatsApp", icon: "◉", enabled: true, note: "Requires an official WhatsApp sender on the Supabase phone provider." },
  { id: "sms", label: "SMS", icon: "✉", enabled: true, note: "Uses the configured Supabase SMS provider." },
  { id: "wechat", label: "WeChat", icon: "◈", enabled: false, note: "Official connector required." },
  { id: "line", label: "LINE", icon: "●", enabled: false, note: "Official connector required." },
  { id: "telegram", label: "Telegram", icon: "✈", enabled: false, note: "Official bot/account binding required." },
];

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
  const [channel, setChannel] = useState("whatsapp");
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
      if (method === "phone") {
        const phone = normalizePhone(identifier);
        const selected = CHANNELS.find((item) => item.id === channel);
        if (!selected?.enabled) throw new Error(`${selected?.label || "This channel"} needs its official connector before it can send login codes.`);
        const phoneOptions = { ...options, ...(channel === "whatsapp" ? { channel: "whatsapp" } : {}) };
        const result = await supabase.auth.signInWithOtp({ phone, options: phoneOptions });
        if (result.error) throw result.error;
        setIdentifier(phone);
        setSent(true);
        setMessage(`Verification code sent by ${selected.label}.`);
        return;
      }
      const email = identifier.trim();
      if (!email) throw new Error("Enter your email address.");
      const result = await supabase.auth.signInWithOtp({ email, options });
      if (result.error) throw result.error;
      setSent(true); setMessage("Verification code sent to your email.");
    } catch (err) {
      const raw = err?.message || "Unable to send verification code.";
      const low = raw.toLowerCase();
      if (method === "phone" && (low.includes("provider") || low.includes("sms") || low.includes("whatsapp") || low.includes("unsupported"))) {
        setError(`${raw} Phone delivery must be enabled in Supabase with an official provider.`);
      } else setError(raw);
    } finally { setLoading(false); }
  }

  async function verifyCode(event) {
    event.preventDefault(); setLoading(true); setError(""); setMessage("");
    try {
      const token = otp.trim();
      if (!/^\d{6,10}$/.test(token)) throw new Error("Enter the verification code you received.");
      const result = method === "phone"
        ? await supabase.auth.verifyOtp({ phone: normalizePhone(identifier), token, type: "sms" })
        : await supabase.auth.verifyOtp({ email: identifier.trim(), token, type: "email" });
      if (result.error) throw result.error;
      if (!result.data.session) throw new Error("Verification succeeded, but no session was created.");
      try {
        const referralResult = await fetch("/api/referrals/verify", { method: "POST", headers: { "Content-Type": "application/json" } });
        if (!referralResult.ok) console.warn("Referral verification was not recorded.");
      } catch {}
      router.replace(next); router.refresh();
    } catch (err) { setError(err?.message || "Verification failed."); }
    finally { setLoading(false); }
  }

  if (checkingSession) return <main className="authLoading">Checking your session…</main>;
  const selectedChannel = CHANNELS.find((item) => item.id === channel);

  return <main className="authPage">
    <div className="shade" />
    <header className="brand"><span className="brandMark">S</span><span>SOOLENAI</span><span className="slash">/</span><strong>AI APP BUILDER</strong></header>
    <div className="authCard">
      <div className="authEyebrow">AI APP BUILDER · SECURE ACCESS</div>
      <h1>Welcome to your workspace</h1>
      <p className="authIntro">Sign in with email or your phone number.</p>
      <div className="authTabs"><button className={method === "email" ? "active" : ""} onClick={() => switchMethod("email")}>Email</button><button className={method === "phone" ? "active" : ""} onClick={() => switchMethod("phone")}>Phone</button></div>

      {!sent ? <form onSubmit={sendCode}>
        <label>{method === "email" ? "Email address" : "Phone number"}</label>
        <input value={identifier} onChange={(event) => setIdentifier(event.target.value)} placeholder={method === "email" ? "you@example.com" : "+60123456789"} inputMode={method === "phone" ? "tel" : "email"} autoComplete={method === "email" ? "email" : "tel"}/>
        {method === "phone" && <>
          <label>Send verification code by</label>
          <div className="channels">{CHANNELS.map((item) => <button type="button" key={item.id} disabled={!item.enabled} className={`${channel === item.id ? "channel active" : "channel"} ${!item.enabled ? "disabled" : ""}`} onClick={() => { if (item.enabled) { setChannel(item.id); setError(""); } }}><span>{item.icon}</span>{item.label}{!item.enabled && <small>Soon</small>}</button>)}</div>
          <div className="channelNote">{selectedChannel?.note}</div>
          <div className="zeroCost">Phone OTP is now wired to Supabase. WhatsApp works only with an official supported sender; SMS uses the configured SMS provider. WeChat, LINE and Telegram stay disabled until their official connectors are added.</div>
        </>}
        {referralCode && <div className="referralNotice">Referral code: {referralCode}</div>}
        <button className="authPrimary" disabled={loading}>{loading ? "Sending…" : "Send verification code"}</button>
      </form> : <form onSubmit={verifyCode}>
        <label>Verification code</label>
        <input value={otp} onChange={(event) => setOtp(event.target.value.replace(/\D/g, "").slice(0, 10))} placeholder="123456" inputMode="numeric" autoComplete="one-time-code"/>
        <button className="authPrimary" disabled={loading || otp.length < 6}>{loading ? "Verifying…" : "Verify & continue"}</button>
        <button type="button" className="authSecondary" disabled={loading} onClick={sendCode}>Resend code</button>
        <button type="button" className="authSecondary" onClick={() => { setSent(false); setOtp(""); setMessage(""); setError(""); }}>Change {method === "phone" ? "phone number" : "email"}</button>
      </form>}

      {message && <div className="authMessage">{message}</div>}{error && <div className="authError">{error}</div>}
      <div className="authSecurity">● Secure OTP authentication · Email fallback available</div>
    </div>
    <style jsx>{`
      .authPage{min-height:100vh;display:grid;place-items:center;padding:88px 22px 28px;position:relative;overflow:hidden;background:#06110f;color:#fff}.authPage:before{content:"";position:absolute;inset:0;background:radial-gradient(circle at 55% 35%,rgba(231,169,54,.18),transparent 35%),linear-gradient(90deg,rgba(0,9,12,.78),rgba(0,9,12,.12) 55%,rgba(0,9,12,.55));pointer-events:none}.shade{position:absolute;inset:0;backdrop-filter:saturate(.9)}.brand{position:absolute;z-index:2;top:24px;left:28px;display:flex;align-items:center;gap:10px;font-size:15px;letter-spacing:.06em}.brandMark{display:grid;place-items:center;width:36px;height:36px;border-radius:12px;background:#e7ae3a;color:#07110f;font-size:22px;font-weight:950}.brand strong{color:#efb53d}.slash{opacity:.4}.authCard{position:relative;z-index:2;width:min(100%,520px);box-sizing:border-box;padding:34px;border:1px solid rgba(238,183,66,.42);border-radius:28px;background:rgba(3,15,17,.86);backdrop-filter:blur(20px);box-shadow:0 30px 90px rgba(0,0,0,.55),inset 0 1px rgba(255,255,255,.06)}.authEyebrow{color:#efb53d;font-size:11px;letter-spacing:.2em;font-weight:900}h1{font-size:32px;margin:10px 0 7px}.authIntro{color:#b7c3c0;line-height:1.5}.authTabs{display:grid;grid-template-columns:1fr 1fr;gap:7px;padding:5px;background:rgba(0,0,0,.3);border-radius:15px;margin:20px 0}.authTabs button{border:0;background:transparent;color:#a9b6b2;padding:12px;border-radius:11px;font-weight:800}.authTabs button.active{background:#e7ae3a;color:#111}label{display:block;font-size:12px;color:#c8d2cf;margin:12px 0 8px}input{box-sizing:border-box;width:100%;border:1px solid rgba(238,183,66,.28);background:rgba(0,9,10,.72);color:#fff;border-radius:14px;padding:14px;font-size:16px}.channels{display:grid;grid-template-columns:1fr 1fr;gap:8px}.channel{border:1px solid rgba(255,255,255,.13);background:rgba(0,0,0,.28);color:#dce5e2;border-radius:13px;padding:12px;font-weight:800;text-align:left}.channel span{margin-right:8px;color:#efb53d}.channel small{float:right;opacity:.55}.channel.active{border-color:#efb53d;background:rgba(231,174,58,.13);color:#fff}.channel.disabled{opacity:.42;cursor:not-allowed}.channelNote{margin-top:9px;color:#9fb0aa;font-size:11px}.zeroCost{margin-top:12px;padding:11px 12px;border:1px solid rgba(111,220,166,.2);border-radius:12px;background:rgba(40,143,94,.1);color:#a9e5c6;font-size:12px;line-height:1.45}.authPrimary,.authSecondary{width:100%;border-radius:14px;padding:14px;font-weight:900;margin-top:13px}.authPrimary{border:0;background:linear-gradient(135deg,#f3bd48,#d99520);color:#111}.authPrimary:disabled,.authSecondary:disabled{opacity:.55}.authSecondary{border:1px solid rgba(238,183,66,.3);background:transparent;color:#efb53d}.referralNotice,.authMessage,.authError{margin-top:14px;padding:11px;border-radius:12px;font-size:13px}.referralNotice{color:#efb53d}.authMessage{color:#9ae4c0}.authError{background:rgba(145,31,31,.25);color:#ffb1b1}.authSecurity{margin-top:20px;padding-top:17px;border-top:1px solid rgba(255,255,255,.09);color:#8fa19b;font-size:11px}.authLoading{min-height:100vh;display:grid;place-items:center;background:#06110f;color:#fff}@media(max-width:600px){.brand{left:20px;top:20px;font-size:12px}.authCard{padding:25px 20px;border-radius:24px}h1{font-size:28px}.channels{grid-template-columns:1fr 1fr}}
    `}</style>
  </main>;
}

export default function AuthPage() { return <Suspense fallback={<main className="authLoading">Loading…</main>}><AuthForm /></Suspense>; }
