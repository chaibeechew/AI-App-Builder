"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

function Flag({ ok, children }) {
  return <span className={ok ? "flag ok" : "flag pending"}>{ok ? "✓" : "○"} {children}</span>;
}

export default function CloudPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [policy, setPolicy] = useState(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const sessionResponse = await fetch("/api/auth/session", { cache: "no-store", credentials: "same-origin" });
        const session = await sessionResponse.json().catch(() => ({}));
        if (!mounted) return;
        if (!sessionResponse.ok || session?.authenticated !== true || session?.sessionAuthority !== "laneriq") {
          router.replace("/auth?next=%2Faccount%2Fcloud");
          return;
        }
        const response = await fetch("/api/cloud/policy", { cache: "no-store", credentials: "same-origin" });
        const data = await response.json().catch(() => ({}));
        if (mounted && response.ok && data?.success) setPolicy(data);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [router]);

  if (loading) return <main className="cloudPage"><section className="cloudCard"><p>Loading LANERIQ Cloud…</p></section></main>;

  const evidence = policy?.evidence || {};
  const envelope = policy?.encryptionEnvelope || {};
  return <main className="cloudPage">
    <section className="cloudCard">
      <button className="back" type="button" onClick={() => router.push("/my-apps")}>← My Projects</button>
      <div className="eyebrow">LANERIQ AI · ZERO-TRUST LOCAL-FIRST</div>
      <h1>LANERIQ Cloud</h1>
      <p className="lead">Cloud stays inside LANERIQ AI today, but the domain is deliberately separable. Product routes depend on LANERIQ contracts while provider-specific compatibility code remains behind replaceable adapters.</p>

      <div className="statusGrid">
        <div><span>Current shape</span><strong>Embedded module</strong><small>Designed to split into an independent LANERIQ Cloud service later.</small></div>
        <div><span>Project data path</span><strong>Adapter migration started</strong><small>Project list and detail reads no longer import a provider directly.</small></div>
        <div><span>Security posture</span><strong>Default deny</strong><small>Private shared-cloud sync requires encrypt-before-cloud under the new contract.</small></div>
        <div><span>Own server</span><strong>Not required</strong><small>Migration is triggered by TCO + operational readiness, not a user-count target.</small></div>
      </div>

      <section className="panel">
        <h2>Separation boundary</h2>
        <div className="stack">
          <div><b>LANERIQ AI Builder</b><span>Calls stable LANERIQ Cloud behavior instead of one infrastructure vendor.</span></div>
          <i>↓</i>
          <div><b>LANERIQ Cloud Domain</b><span>Identity · Database · Storage · Realtime · Functions · Deployment · Backup · AI</span></div>
          <i>↓</i>
          <div><b>Provider Adapters</b><span>Replaceable compatibility boundary; legacy direct imports have a shrinking CI budget.</span></div>
        </div>
      </section>

      <section className="panel">
        <h2>Private-data encryption foundation</h2>
        <div className="rows">
          <div><b>{envelope.algorithm || "Authenticated encryption"}</b><span>Versioned private envelope with random nonce and authenticated ciphertext.</span></div>
          <div><b>Context bound</b><span>Tenant, project, purpose and key ID are authenticated so ciphertext cannot be silently moved to a different context.</span></div>
          <div><b>No key in envelope</b><span>Encrypted payload never carries the raw encryption key with it.</span></div>
          <div><b>Truth boundary</b><span>Envelope CODE exists now; full encrypted sync and native zero-knowledge key custody remain not LIVE.</span></div>
        </div>
      </section>

      <section className="panel">
        <h2>Truthful implementation status</h2>
        <div className="flags">
          <Flag ok={evidence.cloudDomainBoundaryInCode}>Cloud domain boundary in code</Flag>
          <Flag ok={evidence.projectReadAdapterMigrated}>Project read routes migrated behind adapter</Flag>
          <Flag ok={evidence.clientSideEncryptionEnvelopeInCode}>Private encryption envelope in code</Flag>
          <Flag ok={evidence.providerAdaptersFullyMigrated}>All legacy provider calls migrated to adapters</Flag>
          <Flag ok={evidence.clientSideEncryptionFullyLive}>Client-side encryption fully LIVE</Flag>
          <Flag ok={evidence.zeroKnowledgeNativeKeyCustodyLive}>Native zero-knowledge key custody LIVE</Flag>
          <Flag ok={evidence.dedicatedLaneriqServerLive}>Dedicated LANERIQ server LIVE</Flag>
        </div>
        <p className="truth">CODE / policy readiness is not labeled LIVE until runtime, native-device and production evidence exists. Legacy direct-provider route budget: {Number.isFinite(evidence.legacyDirectProviderRouteBudget) ? evidence.legacyDirectProviderRouteBudget : "—"}.</p>
      </section>
    </section>

    <style jsx>{`
      .cloudPage{min-height:100svh;padding:92px 18px 48px;background:radial-gradient(circle at 50% 6%,rgba(29,125,92,.27),transparent 31%),linear-gradient(180deg,#020b09,#041711 54%,#020b09);color:#edf7f2;font-family:Inter,system-ui,-apple-system,sans-serif}.cloudCard{width:min(920px,100%);margin:0 auto;padding:28px;border:1px solid rgba(220,191,91,.26);border-radius:28px;background:rgba(3,20,15,.92);box-shadow:0 30px 100px rgba(0,0,0,.5);backdrop-filter:blur(20px)}.back{border:0;background:transparent;color:#d9c36a;font-weight:900;cursor:pointer;padding:4px 0 18px}.eyebrow{font-size:10px;font-weight:1000;letter-spacing:.16em;color:#d9c36a}.cloudCard h1{font-size:clamp(34px,7vw,54px);line-height:1;margin:10px 0 12px}.lead{max-width:780px;color:#adbbb5;line-height:1.65}.statusGrid{display:grid;grid-template-columns:repeat(4,1fr);gap:9px;margin:24px 0}.statusGrid div,.panel{border:1px solid rgba(255,255,255,.08);background:rgba(255,255,255,.03);border-radius:17px}.statusGrid div{padding:14px}.statusGrid span,.statusGrid small{display:block;color:#8fa59a;font-size:9px;line-height:1.45}.statusGrid strong{display:block;margin:6px 0 4px;color:#eed672;font-size:15px}.panel{padding:18px;margin-top:10px}.panel h2{margin:0 0 13px;font-size:18px}.stack{display:grid;gap:8px}.stack>div,.rows>div{padding:13px;border-radius:13px;background:rgba(255,255,255,.025);border:1px solid rgba(255,255,255,.055)}.stack i{text-align:center;color:#d9c36a;font-style:normal}.stack b,.rows b{display:block;color:#edf7f2;font-size:12px}.stack span,.rows span{display:block;margin-top:4px;color:#92a79d;font-size:10px;line-height:1.5}.rows{display:grid;grid-template-columns:1fr 1fr;gap:8px}.flags{display:flex;flex-wrap:wrap;gap:8px}.flag{padding:8px 10px;border-radius:999px;font-size:10px;font-weight:900}.flag.ok{background:rgba(55,176,121,.14);color:#9fe0bd;border:1px solid rgba(55,176,121,.25)}.flag.pending{background:rgba(215,185,82,.08);color:#d7bd68;border:1px solid rgba(215,185,82,.2)}.truth{margin:14px 0 0;color:#8fa59a;font-size:10px;line-height:1.55}@media(max-width:760px){.cloudPage{padding:84px 11px 36px}.cloudCard{padding:20px;border-radius:22px}.statusGrid{grid-template-columns:1fr 1fr}.rows{grid-template-columns:1fr}}@media(max-width:430px){.statusGrid{grid-template-columns:1fr}}
    `}</style>
  </main>;
}
