"use client";

import { Suspense, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "../../lib/supabase/client";

export const dynamic = "force-dynamic";

function AuthForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = useMemo(() => createClient(), []);
  const [method, setMethod] = useState("email");
  const [identifier, setIdentifier] = useState("");
  const [otp, setOtp] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const referralCode = (searchParams.get("ref") || "").trim().toUpperCase();
  const next = searchParams.get("next") || "/";

  async function sendCode(event) {
    event.preventDefault(); setLoading(true); setError(""); setMessage("");
    try {
      const value = identifier.trim(); if (!value) throw new Error("Enter your email or phone number.");
      const options = { shouldCreateUser: true, data: referralCode ? { referral_code: referralCode } : undefined };
      const result = method === "email" ? await supabase.auth.signInWithOtp({ email: value, options }) : await supabase.auth.signInWithOtp({ phone: value, options });
      if (result.error) throw result.error;
      setSent(true); setMessage(method === "email" ? "Verification code sent to your email." : "Verification code sent to your phone.");
    } catch (err) { setError(err?.message || "Unable to send verification code."); } finally { setLoading(false); }
  }

  async function verifyCode(event) {
    event.preventDefault(); setLoading(true); setError(""); setMessage("");
    try {
      const value = identifier.trim(); const token = otp.trim(); if (!token) throw new Error("Enter the verification code.");
      const result = method === "email" ? await supabase.auth.verifyOtp({ email: value, token, type: "email" }) : await supabase.auth.verifyOtp({ phone: value, token, type: "sms" });
      if (result.error) throw result.error; if (!result.data.session) throw new Error("Verification succeeded, but no session was created.");
      const referralResult = await fetch("/api/referrals/verify", { method: "POST", headers: { "Content-Type": "application/json" } });
      if (!referralResult.ok) console.warn("Referral verification was not recorded.");
      router.replace(next); router.refresh();
    } catch (err) { setError(err?.message || "Verification failed."); } finally { setLoading(false); }
  }

  return <main className="authPage"><div className="authCard"><div className="authLogo">✦</div><div className="authEyebrow">AI APP BUILDER</div><h1>Sign in to your workspace</h1><p className="authIntro">Your apps, versions, and future edits stay connected to your account.</p><div className="authTabs"><button className={method === "email" ? "active" : ""} onClick={() => { setMethod("email"); setSent(false); setMessage(""); setError(""); }}>Email</button><button className={method === "phone" ? "active" : ""} onClick={() => { setMethod("phone"); setSent(false); setMessage(""); setError(""); }}>Phone</button></div>{!sent ? <form onSubmit={sendCode}><label>{method === "email" ? "Email address" : "Phone number"}</label><input value={identifier} onChange={(event) => setIdentifier(event.target.value)} placeholder={method === "email" ? "you@example.com" : "+60123456789"} autoComplete={method === "email" ? "email" : "tel"}/>{referralCode && <div className="referralNotice">Referral code: {referralCode}</div>}<button className="authPrimary" disabled={loading}>{loading ? "Sending…" : "Send verification code"}</button></form> : <form onSubmit={verifyCode}><label>6-digit verification code</label><input value={otp} onChange={(event) => setOtp(event.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="123456" inputMode="numeric" autoComplete="one-time-code"/><button className="authPrimary" disabled={loading || otp.length < 6}>{loading ? "Verifying…" : "Verify & continue"}</button><button type="button" className="authSecondary" onClick={() => setSent(false)}>Change {method === "email" ? "email" : "phone"}</button></form>}{message && <div className="authMessage">{message}</div>}{error && <div className="authError">{error}</div>}<div className="authSecurity">● Secure authentication powered by Supabase Auth</div></div><style jsx>{`.authPage{min-height:100vh;display:grid;place-items:center;padding:24px;background:linear-gradient(145deg,#06140f,#0b241b 55%,#03100d);color:#f5fff9}.authCard{width:min(100%,480px);padding:34px;border:1px solid rgba(220,196,105,.25);border-radius:28px;background:rgba(4,20,15,.82)}.authLogo{width:58px;height:58px;display:grid;place-items:center;border-radius:18px;background:#d8bf62;color:#07130e;font-size:28px}.authEyebrow{color:#d8bf62;font-size:12px;letter-spacing:.22em;font-weight:800;margin-top:18px}h1{margin:10px 0 8px}.authIntro{color:#9fb5aa;line-height:1.6}.authTabs{display:grid;grid-template-columns:1fr 1fr;gap:8px;padding:5px;background:#071810;border-radius:14px;margin:20px 0}.authTabs button{border:0;background:transparent;color:#91a69d;padding:11px;border-radius:10px;font-weight:700}.authTabs button.active{background:#d8bf62;color:#07130e}label{display:block;font-size:13px;color:#b6c9c1;margin:10px 0 8px}input{box-sizing:border-box;width:100%;border:1px solid rgba(220,196,105,.22);background:#071810;color:#fff;border-radius:14px;padding:14px;margin-bottom:8px}.authPrimary,.authSecondary{width:100%;border-radius:14px;padding:14px;font-weight:800;margin-top:8px}.authPrimary{border:0;background:#d8bf62;color:#07130e}.authPrimary:disabled{opacity:.55}.authSecondary{border:1px solid rgba(216,191,98,.25);background:transparent;color:#d8bf62}.referralNotice,.authMessage,.authError{margin-top:14px;padding:11px;border-radius:12px;font-size:13px}.referralNotice{color:#d8bf62}.authMessage{color:#91e0bf}.authError{color:#ff9e9e}.authSecurity{margin-top:22px;padding-top:18px;border-top:1px solid rgba(255,255,255,.08);color:#7f958b;font-size:12px}`}</style></main>;
}

export default function AuthPage() {
  return <Suspense fallback={<main className="authLoading">Loading…</main>}><AuthForm /></Suspense>;
}
