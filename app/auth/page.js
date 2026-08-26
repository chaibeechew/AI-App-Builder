"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "../../lib/supabase/client";

export default function AuthPage() {
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
    event.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");

    try {
      const value = identifier.trim();
      if (!value) throw new Error("Enter your email or phone number.");

      const options = {
        shouldCreateUser: true,
        data: referralCode ? { referral_code: referralCode } : undefined,
      };

      const result =
        method === "email"
          ? await supabase.auth.signInWithOtp({ email: value, options })
          : await supabase.auth.signInWithOtp({ phone: value, options });

      if (result.error) throw result.error;

      setSent(true);
      setMessage(
        method === "email"
          ? "Verification code sent to your email."
          : "Verification code sent to your phone."
      );
    } catch (err) {
      setError(err?.message || "Unable to send verification code.");
    } finally {
      setLoading(false);
    }
  }

  async function verifyCode(event) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");

    try {
      const value = identifier.trim();
      const token = otp.trim();
      if (!token) throw new Error("Enter the verification code.");

      const result =
        method === "email"
          ? await supabase.auth.verifyOtp({ email: value, token, type: "email" })
          : await supabase.auth.verifyOtp({ phone: value, token, type: "sms" });

      if (result.error) throw result.error;
      if (!result.data.session) throw new Error("Verification succeeded, but no session was created.");

      router.replace(next);
      router.refresh();
    } catch (err) {
      setError(err?.message || "Verification failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="authPage">
      <div className="authCard">
        <div className="authLogo">✦</div>
        <div className="authEyebrow">AI APP BUILDER</div>
        <h1>Sign in to your workspace</h1>
        <p className="authIntro">
          Your apps, versions, and future edits stay connected to your account.
        </p>

        <div className="authTabs">
          <button className={method === "email" ? "active" : ""} onClick={() => { setMethod("email"); setSent(false); setMessage(""); setError(""); }}>
            Email
          </button>
          <button className={method === "phone" ? "active" : ""} onClick={() => { setMethod("phone"); setSent(false); setMessage(""); setError(""); }}>
            Phone
          </button>
        </div>

        {!sent ? (
          <form onSubmit={sendCode}>
            <label>{method === "email" ? "Email address" : "Phone number"}</label>
            <input
              value={identifier}
              onChange={(event) => setIdentifier(event.target.value)}
              placeholder={method === "email" ? "you@example.com" : "+60123456789"}
              autoComplete={method === "email" ? "email" : "tel"}
            />

            {referralCode && (
              <div className="referralNotice">Referral code: {referralCode}</div>
            )}

            <button className="authPrimary" disabled={loading}>
              {loading ? "Sending…" : "Send verification code"}
            </button>
          </form>
        ) : (
          <form onSubmit={verifyCode}>
            <label>6-digit verification code</label>
            <input
              value={otp}
              onChange={(event) => setOtp(event.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="123456"
              inputMode="numeric"
              autoComplete="one-time-code"
            />
            <button className="authPrimary" disabled={loading || otp.length < 6}>
              {loading ? "Verifying…" : "Verify & continue"}
            </button>
            <button type="button" className="authSecondary" onClick={() => setSent(false)}>
              Change {method === "email" ? "email" : "phone"}
            </button>
          </form>
        )}

        {message && <div className="authMessage">{message}</div>}
        {error && <div className="authError">{error}</div>}

        <div className="authSecurity">
          <span>●</span>
          Secure authentication powered by Supabase Auth
        </div>
      </div>

      <style jsx>{`
        .authPage { min-height:100vh; display:grid; place-items:center; padding:24px; background:radial-gradient(circle at 50% 15%, rgba(190,160,60,.16), transparent 35%), linear-gradient(145deg,#06140f,#0b241b 55%,#03100d); color:#f5fff9; }
        .authCard { width:min(100%,480px); padding:34px; border:1px solid rgba(220,196,105,.25); border-radius:28px; background:rgba(4,20,15,.82); box-shadow:0 30px 100px rgba(0,0,0,.38); backdrop-filter:blur(18px); }
        .authLogo { width:58px; height:58px; display:grid; place-items:center; border-radius:18px; background:linear-gradient(145deg,#d8bf62,#8b7331); color:#07130e; font-size:28px; margin-bottom:18px; }
        .authEyebrow { color:#d8bf62; font-size:12px; letter-spacing:.22em; font-weight:800; }
        h1 { margin:10px 0 10px; font-size:32px; line-height:1.08; }
        .authIntro { color:#9fb5aa; line-height:1.6; margin:0 0 24px; }
        .authTabs { display:grid; grid-template-columns:1fr 1fr; gap:8px; padding:5px; background:#071810; border-radius:14px; margin-bottom:20px; }
        .authTabs button { border:0; background:transparent; color:#91a69d; padding:11px; border-radius:10px; font-weight:700; }
        .authTabs button.active { background:#d8bf62; color:#07130e; }
        label { display:block; font-size:13px; color:#b6c9c1; margin-bottom:8px; font-weight:700; }
        input { width:100%; border:1px solid rgba(220,196,105,.22); background:#071810; color:#fff; border-radius:14px; padding:14px 15px; outline:none; margin-bottom:12px; }
        input:focus { border-color:#d8bf62; box-shadow:0 0 0 3px rgba(216,191,98,.12); }
        .authPrimary,.authSecondary { width:100%; border-radius:14px; padding:14px; font-weight:800; margin-top:8px; }
        .authPrimary { border:0; background:linear-gradient(135deg,#e1ca73,#9c843c); color:#07130e; }
        .authPrimary:disabled { opacity:.55; }
        .authSecondary { border:1px solid rgba(216,191,98,.25); background:transparent; color:#d8bf62; }
        .referralNotice,.authMessage,.authError { margin-top:14px; padding:11px 13px; border-radius:12px; font-size:13px; line-height:1.45; }
        .referralNotice { background:rgba(216,191,98,.08); color:#d8bf62; }
        .authMessage { background:rgba(64,180,130,.1); color:#91e0bf; }
        .authError { background:rgba(220,70,70,.1); color:#ff9e9e; }
        .authSecurity { margin-top:22px; padding-top:18px; border-top:1px solid rgba(255,255,255,.08); color:#7f958b; font-size:12px; display:flex; gap:8px; align-items:center; }
        .authSecurity span { color:#6dd5a9; }
      `}</style>
    </main>
  );
}
