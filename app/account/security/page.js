"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

function newRequestId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export default function AccountSecurityPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [currentEmail, setCurrentEmail] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [phase, setPhase] = useState("ready");
  const [requestId, setRequestId] = useState("");
  const [flowToken, setFlowToken] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const phaseTitle = useMemo(() => {
    if (phase === "verify_current") return "Verify your current email";
    if (phase === "verify_new") return "Verify your new email";
    if (phase === "complete") return "Email changed";
    return "Change email securely";
  }, [phase]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const response = await fetch("/api/account/email-change", { cache: "no-store", credentials: "same-origin" });
        const data = await response.json().catch(() => ({}));
        if (!mounted) return;
        if (response.status === 401) {
          router.replace("/auth?next=%2Faccount%2Fsecurity");
          return;
        }
        if (!response.ok || data?.success !== true) throw new Error(data?.error || "Account security is unavailable.");
        setCurrentEmail(String(data.email || ""));
      } catch (err) {
        if (mounted) setError(err?.message || "Account security is unavailable.");
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [router]);

  async function submit(action, nextRequestId = requestId) {
    if (busy) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const payload = { action, newEmail, requestId: nextRequestId };
      if (action !== "request") {
        payload.code = code;
        payload.flowToken = flowToken;
      }
      const response = await fetch("/api/account/email-change", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        cache: "no-store",
        body: JSON.stringify(payload),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || data?.success !== true) throw new Error(data?.error || "Email verification could not be completed.");

      if (action === "request") {
        setRequestId(nextRequestId);
        setFlowToken(String(data.flowToken || ""));
        setCode("");
        setPhase("verify_current");
      } else if (action === "verify_current") {
        setFlowToken(String(data.flowToken || ""));
        setCode("");
        setPhase("verify_new");
      } else {
        setCurrentEmail(String(data.email || newEmail));
        setNewEmail("");
        setFlowToken("");
        setCode("");
        setRequestId("");
        setPhase("complete");
      }
      setMessage(String(data.message || "Verification completed."));
    } catch (err) {
      setError(err?.message || "Email verification could not be completed.");
    } finally {
      setBusy(false);
    }
  }

  function startChange() {
    const id = newRequestId();
    void submit("request", id);
  }

  function startOver() {
    setPhase("ready");
    setRequestId("");
    setFlowToken("");
    setCode("");
    setMessage("");
    setError("");
  }

  if (loading) return <main className="securityPage"><section className="securityCard"><p>Loading account security…</p></section></main>;

  return <main className="securityPage">
    <section className="securityCard">
      <button className="back" onClick={() => router.push("/my-apps")}>← My Projects</button>
      <div className="eyebrow">LANERIQ AI · ACCOUNT SECURITY</div>
      <h1>{phaseTitle}</h1>
      <p className="lead">Sensitive email changes require two independent LANERIQ Email Codes. SMS is not used as a fallback.</p>

      <div className="identityBox">
        <span>Current verified email</span>
        <strong>{currentEmail || "Unavailable"}</strong>
      </div>

      {(phase === "ready" || phase === "complete") && <div className="stack">
        <label htmlFor="newEmail">New email address</label>
        <input id="newEmail" type="email" autoComplete="email" inputMode="email" placeholder="name@example.com" value={newEmail} onChange={(event) => setNewEmail(event.target.value)} disabled={busy} />
        <button className="primary" onClick={startChange} disabled={busy || !newEmail.trim()}>{busy ? "Sending code…" : "Send code to current email"}</button>
      </div>}

      {(phase === "verify_current" || phase === "verify_new") && <div className="stack">
        <div className="stepPill">{phase === "verify_current" ? "STEP 1 OF 2 · CURRENT EMAIL" : "STEP 2 OF 2 · NEW EMAIL"}</div>
        <label htmlFor="verificationCode">8-digit Email Code</label>
        <input id="verificationCode" className="codeInput" type="text" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]*" maxLength={8} placeholder="••••••••" value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 8))} disabled={busy} />
        <button className="primary" onClick={() => void submit(phase === "verify_current" ? "verify_current" : "verify_new")} disabled={busy || code.length !== 8}>{busy ? "Verifying…" : phase === "verify_current" ? "Verify current email" : "Verify new email & change"}</button>
        <button className="secondary" onClick={startOver} disabled={busy}>Start over / resend</button>
      </div>}

      {message && <div className="success" role="status">{message}</div>}
      {error && <div className="error" role="alert">{error}</div>}

      <div className="policyGrid">
        <div><b>1</b><span>Code to current Email</span></div>
        <div><b>2</b><span>Code to new Email</span></div>
        <div><b>✓</b><span>Only then update account</span></div>
      </div>
    </section>

    <style jsx>{`
      .securityPage{min-height:100svh;display:grid;place-items:center;padding:92px 18px 40px;background:radial-gradient(circle at 50% 10%,rgba(26,98,76,.3),transparent 34%),linear-gradient(180deg,#020b09,#041711 54%,#020b09);color:#eef6f1;font-family:Inter,system-ui,-apple-system,sans-serif}.securityCard{width:min(680px,100%);padding:28px;border:1px solid rgba(220,191,91,.28);border-radius:28px;background:rgba(3,20,15,.9);box-shadow:0 28px 90px rgba(0,0,0,.5);backdrop-filter:blur(20px)}.back{border:0;background:transparent;color:#d9c36a;font-weight:900;cursor:pointer;padding:4px 0 18px}.eyebrow{font-size:10px;font-weight:1000;letter-spacing:.16em;color:#d9c36a}.securityCard h1{font-size:clamp(30px,7vw,48px);line-height:1.02;margin:10px 0 12px}.lead{color:#aebfb7;line-height:1.65;margin:0 0 22px}.identityBox{display:flex;justify-content:space-between;gap:16px;align-items:center;padding:15px 16px;border:1px solid rgba(255,255,255,.09);border-radius:15px;background:rgba(255,255,255,.035);margin-bottom:22px}.identityBox span{font-size:11px;color:#93a79e;font-weight:800}.identityBox strong{font-size:13px;overflow-wrap:anywhere}.stack{display:grid;gap:10px}.stack label{font-size:11px;font-weight:900;color:#d9c36a}.stack input{width:100%;box-sizing:border-box;min-height:52px;border:1px solid rgba(216,191,98,.24);border-radius:14px;background:#061d17;color:#fff;padding:0 15px;font-size:16px;outline:none}.stack input:focus{border-color:rgba(240,210,104,.7);box-shadow:0 0 0 3px rgba(216,191,98,.1)}.codeInput{text-align:center;letter-spacing:.28em;font-size:24px!important;font-weight:1000}.primary,.secondary{min-height:50px;border-radius:14px;font-weight:1000;cursor:pointer}.primary{border:1px solid #f1d56d;background:linear-gradient(135deg,#f0d97a,#b88428);color:#08120e}.secondary{border:1px solid rgba(255,255,255,.12);background:transparent;color:#c8d5cf}.primary:disabled,.secondary:disabled{opacity:.5;cursor:not-allowed}.stepPill{justify-self:start;padding:7px 10px;border-radius:999px;background:rgba(216,191,98,.1);color:#e8cf73;font-size:9px;font-weight:1000;letter-spacing:.1em}.success,.error{margin-top:14px;padding:12px 14px;border-radius:13px;font-size:12px;font-weight:800;line-height:1.5}.success{background:rgba(55,170,115,.13);border:1px solid rgba(74,215,148,.24);color:#aaf0c8}.error{background:rgba(210,68,58,.13);border:1px solid rgba(255,105,95,.25);color:#ffc1bb}.policyGrid{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-top:22px}.policyGrid div{padding:12px;border-radius:13px;background:rgba(255,255,255,.035);border:1px solid rgba(255,255,255,.07)}.policyGrid b{display:block;color:#e7ce70;font-size:18px}.policyGrid span{display:block;color:#92a69d;font-size:9px;font-weight:800;margin-top:4px;line-height:1.35}@media(max-width:600px){.securityPage{padding:78px 12px 24px;align-items:start}.securityCard{padding:20px;border-radius:22px}.identityBox{align-items:flex-start;flex-direction:column}.policyGrid{grid-template-columns:1fr}.primary,.secondary,.stack input{min-height:52px}}
    `}</style>
  </main>;
}
