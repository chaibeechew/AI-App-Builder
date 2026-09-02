"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import styles from "./web-publish-evidence.module.css";

function requestId(prefix) {
  try { return `${prefix}:${crypto.randomUUID()}`; }
  catch { return `${prefix}:${Date.now()}:${Math.random().toString(36).slice(2, 12)}`; }
}

async function readJson(response) {
  const data = await response.json().catch(() => null);
  return data && typeof data === "object" ? data : {};
}

async function ownerJson(url, init = {}) {
  const response = await fetch(url, {
    ...init,
    credentials: "same-origin",
    cache: "no-store",
    headers: { ...(init.headers || {}), "Cache-Control": "no-store" },
  });
  const data = await readJson(response);
  if (response.status === 401) {
    window.location.assign(`/auth?next=${encodeURIComponent("/web-publish-evidence")}`);
    throw new Error("Authentication required.");
  }
  return { response, data };
}

async function anonymousProbe(path, nonce) {
  const separator = path.includes("?") ? "&" : "?";
  const url = `${path}${separator}laneriq_evidence=${encodeURIComponent(nonce)}`;
  const startedAt = performance.now();
  const response = await fetch(url, {
    method: "GET",
    credentials: "omit",
    cache: "no-store",
    redirect: "manual",
    headers: { "Cache-Control": "no-store", "Pragma": "no-cache" },
  });
  const text = await response.text().catch(() => "");
  const elapsedMs = Math.round(performance.now() - startedAt);
  const location = response.headers.get("location") || "";
  const authRedirect = response.status >= 300 && response.status < 400 && /\/auth(?:\?|$)/.test(location);
  const frameworkError = /__next_error__|Internal Server Error/i.test(text);
  const notFound = response.status === 404 || /This page could not be found|NEXT_HTTP_ERROR_FALLBACK;404/i.test(text);
  return {
    path,
    status: response.status,
    elapsedMs,
    finalUrl: response.url || url,
    location,
    authRedirect,
    frameworkError,
    notFound,
    bytes: new Blob([text]).size,
  };
}

function projectIsPublic(app) {
  return app?.publish_status === "published" || app?.visibility === "listed" || app?.visibility === "public";
}

function reportText(report) {
  return report ? JSON.stringify(report, null, 2) : "Run the lifecycle test to generate evidence.";
}

export default function WebPublishEvidenceClient() {
  const [apps, setApps] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [detail, setDetail] = useState(null);
  const [quality, setQuality] = useState(null);
  const [loading, setLoading] = useState(true);
  const [preflightBusy, setPreflightBusy] = useState(false);
  const [busy, setBusy] = useState(false);
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [report, setReport] = useState(null);

  useEffect(() => { loadApps(); }, []);
  useEffect(() => { if (selectedId) runPreflight(selectedId); else { setDetail(null); setQuality(null); } }, [selectedId]);

  async function loadApps() {
    setLoading(true); setError("");
    try {
      const { response, data } = await ownerJson("/api/apps");
      if (!response.ok) throw new Error(data?.error || "Unable to load projects.");
      const rows = Array.isArray(data.apps) ? data.apps : [];
      setApps(rows);
      if (rows.length && !selectedId) setSelectedId(rows[0].id);
    } catch (err) { setError(err.message || "Unable to load projects."); }
    finally { setLoading(false); }
  }

  async function runPreflight(appId = selectedId) {
    if (!appId) return;
    setPreflightBusy(true); setError(""); setMessage(""); setReport(null); setConsent(false);
    try {
      const [detailResult, qualityResult] = await Promise.all([
        ownerJson(`/api/apps/${appId}`),
        ownerJson(`/api/apps/${appId}/quality`),
      ]);
      if (!detailResult.response.ok) throw new Error(detailResult.data?.error || "Unable to load project state.");
      if (!qualityResult.response.ok) throw new Error(qualityResult.data?.error || "Unable to run Quality Gate.");
      setDetail(detailResult.data);
      setQuality(qualityResult.data);
    } catch (err) { setError(err.message || "Preflight failed."); }
    finally { setPreflightBusy(false); }
  }

  const selectedApp = useMemo(() => apps.find((item) => item.id === selectedId) || null, [apps, selectedId]);
  const app = detail?.app || selectedApp;
  const alreadyPublic = projectIsPublic(app);
  const releaseReady = quality?.releaseReady === true;
  const currentVersionMatches = Boolean(app?.current_version_id && quality?.version?.id && app.current_version_id === quality.version.id);
  const canRun = Boolean(app?.id && !alreadyPublic && releaseReady && currentVersionMatches && consent && !busy && !preflightBusy);

  async function publishAction(appId, versionId, action, id) {
    const { response, data } = await ownerJson(`/api/apps/${appId}/publish`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ requestId: id, expectedVersionId: versionId, action }),
    });
    if (!response.ok) {
      const err = new Error(data?.error || `Unable to ${action} project.`);
      err.code = data?.code || "";
      err.status = response.status;
      throw err;
    }
    return data;
  }

  async function cleanupPublishedProject(appId, initialVersionId, cleanupId) {
    try {
      const result = await publishAction(appId, initialVersionId, "unpublish", cleanupId);
      return { ok: true, versionId: initialVersionId, replayed: Boolean(result.replayed), result };
    } catch (firstError) {
      try {
        const latest = await ownerJson(`/api/apps/${appId}`);
        const latestVersionId = latest.data?.app?.current_version_id;
        if (!latest.response.ok || !latestVersionId || latestVersionId === initialVersionId) throw firstError;
        const result = await publishAction(appId, latestVersionId, "unpublish", requestId("web-publish-evidence-cleanup-latest"));
        return { ok: true, versionId: latestVersionId, replayed: Boolean(result.replayed), result, recoveredFromStaleVersion: true };
      } catch (secondError) {
        return {
          ok: false,
          error: secondError?.message || firstError?.message || "Cleanup failed.",
          code: secondError?.code || firstError?.code || "",
        };
      }
    }
  }

  async function runLifecycle() {
    if (!canRun) return;
    setBusy(true); setError(""); setMessage(""); setReport(null);

    const appId = app.id;
    const versionId = app.current_version_id;
    const nonce = requestId("probe").replace(/:/g, "-");
    const publishId = requestId("web-publish-evidence-publish");
    const cleanupId = requestId("web-publish-evidence-unpublish");
    const generatedAt = new Date().toISOString();
    let publishAttempted = false;
    let cleanup = null;
    let publishResult = null;
    let before = null;
    let during = null;
    let after = null;
    let lifecycleError = null;

    try {
      const [freshDetail, freshQuality] = await Promise.all([
        ownerJson(`/api/apps/${appId}`),
        ownerJson(`/api/apps/${appId}/quality`),
      ]);
      if (!freshDetail.response.ok) throw new Error(freshDetail.data?.error || "Unable to verify project state.");
      if (!freshQuality.response.ok) throw new Error(freshQuality.data?.error || "Unable to verify Quality Gate.");

      const freshApp = freshDetail.data?.app;
      if (projectIsPublic(freshApp)) throw new Error("This project is already public. Lifecycle evidence only runs on a private/draft project so cleanup cannot take a live customer project offline.");
      if (freshApp?.current_version_id !== versionId) throw new Error("The project version changed after preflight. Run preflight again before testing.");
      if (freshQuality.data?.releaseReady !== true || freshQuality.data?.version?.id !== versionId) throw new Error("The exact current version is not 100/100 release-ready. Fix the project and run the Quality Gate again.");

      before = {
        project: { visibility: freshApp.visibility, publishStatus: freshApp.publish_status, currentVersionId: versionId },
        app: await anonymousProbe(`/a/${appId}`, `${nonce}-before-app`),
        website: await anonymousProbe(`/website/${appId}`, `${nonce}-before-web`),
      };
      if (!before.app.notFound || !before.website.notFound || before.app.authRedirect || before.website.authRedirect) {
        throw new Error("Baseline anonymous probes are not safely private/404. No publish action was performed.");
      }

      publishAttempted = true;
      publishResult = await publishAction(appId, versionId, "publish", publishId);
      if (publishResult?.app?.publish_status !== "published") throw new Error("Publish API did not confirm published state.");

      during = {
        app: await anonymousProbe(`/a/${appId}`, `${nonce}-live-app`),
        website: await anonymousProbe(`/website/${appId}`, `${nonce}-live-web`),
      };
      for (const [label, probe] of Object.entries(during)) {
        if (probe.status < 200 || probe.status >= 300 || probe.authRedirect || probe.notFound || probe.frameworkError || probe.bytes < 100) {
          throw new Error(`${label === "app" ? "App" : "Website"} was not anonymously reachable as a healthy 2xx public page after publish.`);
        }
      }

      cleanup = await cleanupPublishedProject(appId, versionId, cleanupId);
      if (!cleanup.ok) throw new Error(`Publish succeeded but automatic cleanup failed: ${cleanup.error}`);

      after = {
        app: await anonymousProbe(`/a/${appId}`, `${nonce}-after-app`),
        website: await anonymousProbe(`/website/${appId}`, `${nonce}-after-web`),
      };
      if (!after.app.notFound || !after.website.notFound || after.app.authRedirect || after.website.authRedirect) {
        throw new Error("Unpublish completed, but anonymous routes did not return to fail-closed 404 state.");
      }
    } catch (err) {
      lifecycleError = { message: err?.message || "Lifecycle test failed.", code: err?.code || "", status: err?.status || null };
    } finally {
      if (publishAttempted && !cleanup?.ok) cleanup = await cleanupPublishedProject(appId, versionId, cleanupId);
      if (publishAttempted && cleanup?.ok && !after) {
        after = {
          app: await anonymousProbe(`/a/${appId}`, `${nonce}-finally-app`).catch((err) => ({ path: `/a/${appId}`, error: err?.message || String(err) })),
          website: await anonymousProbe(`/website/${appId}`, `${nonce}-finally-web`).catch((err) => ({ path: `/website/${appId}`, error: err?.message || String(err) })),
        };
      }
    }

    const finalCleanupVerified = Boolean(cleanup?.ok && after?.app?.notFound && after?.website?.notFound && !after?.app?.authRedirect && !after?.website?.authRedirect);
    const passed = Boolean(!lifecycleError && publishResult && during?.app?.status >= 200 && during?.app?.status < 300 && during?.website?.status >= 200 && during?.website?.status < 300 && finalCleanupVerified);
    const evidence = {
      reportVersion: 1,
      product: "LANERIQ AI",
      generatedAt,
      completedAt: new Date().toISOString(),
      evidenceLevel: "authenticated-production-lifecycle",
      productionOrigin: window.location.origin,
      project: { id: appId, name: app.name || "Project", versionId },
      safety: {
        userTriggered: true,
        initialProjectRequiredPrivate: true,
        preExistingPublishedProjectsRejected: true,
        anonymousProbesUseCredentialsOmit: true,
        automaticUnpublishCleanup: true,
        cleanupVerified: finalCleanupVerified,
        smsExercised: false,
        physicalDeviceVerified: false,
      },
      quality: {
        releaseReady: quality?.releaseReady === true,
        target: quality?.target ?? null,
        overall: quality?.report?.overall ?? null,
      },
      before,
      publish: publishResult ? { success: true, replayed: Boolean(publishResult.replayed), visibility: publishResult.app?.visibility, publishStatus: publishResult.app?.publish_status } : null,
      during,
      cleanup,
      after,
      passed,
      error: lifecycleError,
    };

    setReport(evidence);
    if (passed) setMessage("PASS — App and Website were anonymously reachable after publish, then automatically returned to private 404 state.");
    else if (!finalCleanupVerified && publishAttempted) setError("CRITICAL — the test could not prove the project returned to private state. Open Publish Center immediately and unpublish this project manually.");
    else setError(lifecycleError?.message || "Lifecycle evidence did not pass.");
    setBusy(false);
    await runPreflight(appId);
    setReport(evidence);
  }

  async function copyReport() {
    if (!report) return;
    try { await navigator.clipboard.writeText(reportText(report)); setMessage("Evidence report copied."); }
    catch { setMessage("Copy is unavailable in this browser. Select the report text manually."); }
  }

  return <main className={styles.page}>
    <div className={styles.shell}>
      <header className={styles.hero}>
        <div><p className={styles.eyebrow}>PRODUCTION · AUTHENTICATED · USER-TRIGGERED</p><h1>Web Publish Lifecycle Evidence</h1><p>Proves the real lifecycle: private → publish → anonymous App + Website access → automatic unpublish → private again. Loading this page never publishes anything.</p></div>
        <div className={styles.heroBadge}><strong>LIVE EVIDENCE</strong><span>Not a simulator</span></div>
      </header>

      <section className={styles.warning}><strong>Safety rule</strong><p>The selected project is briefly public while the test runs. LANERIQ AI refuses to test projects that were already published, and it automatically unpublishes the test project even when a later check fails.</p></section>

      <section className={styles.card}>
        <div className={styles.cardHead}><div><p className={styles.eyebrow}>01 · PROJECT</p><h2>Select a private project</h2></div><button className={styles.secondary} onClick={loadApps} disabled={loading || busy}>Refresh</button></div>
        {loading ? <p>Loading your projects…</p> : apps.length === 0 ? <p>No projects found. Generate and save a project first.</p> : <select className={styles.select} value={selectedId} onChange={(event) => setSelectedId(event.target.value)} disabled={busy}>{apps.map((item) => <option key={item.id} value={item.id}>{item.name || "Untitled project"}</option>)}</select>}
        <div className={styles.stateGrid}>
          <div><span>Publish state</span><b className={alreadyPublic ? styles.bad : styles.good}>{app ? `${app.visibility || "—"} / ${app.publish_status || "—"}` : "—"}</b></div>
          <div><span>Quality Gate</span><b className={releaseReady ? styles.good : styles.bad}>{quality ? `${quality?.report?.overall ?? "—"}/${quality?.target ?? 100}` : "—"}</b></div>
          <div><span>Version match</span><b className={currentVersionMatches ? styles.good : styles.bad}>{currentVersionMatches ? "Exact current version" : "Not ready"}</b></div>
        </div>
        <button className={styles.secondary} onClick={() => runPreflight()} disabled={!selectedId || busy || preflightBusy}>{preflightBusy ? "Checking…" : "Run preflight again"}</button>
      </section>

      <section className={styles.card}>
        <p className={styles.eyebrow}>02 · EXPLICIT CONSENT</p><h2>Temporary public lifecycle test</h2>
        <label className={styles.consent}><input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} disabled={busy || alreadyPublic}/><span>I understand this private project will be briefly published to its App and Website URLs, tested without my login cookies, then automatically unpublished.</span></label>
        {alreadyPublic && <p className={styles.inlineError}>This project is already public. Choose a private/draft project; the verifier will not risk taking an existing live project offline.</p>}
        {!releaseReady && quality && <p className={styles.inlineError}>The exact current version has not passed the 100/100 release gate.</p>}
        <button className={styles.primary} onClick={runLifecycle} disabled={!canRun}>{busy ? "Testing & protecting cleanup…" : "Start Publish Lifecycle Test"}</button>
      </section>

      {(message || error) && <section className={`${styles.resultBanner} ${error ? styles.resultFail : styles.resultPass}`}><strong>{error ? "Attention" : "Result"}</strong><span>{error || message}</span></section>}

      <section className={styles.card}>
        <div className={styles.cardHead}><div><p className={styles.eyebrow}>03 · EVIDENCE</p><h2>{report?.passed ? "PASS" : report ? "Evidence captured" : "Ready for a real run"}</h2></div><button className={styles.secondary} onClick={copyReport} disabled={!report}>Copy report</button></div>
        <textarea className={styles.report} aria-label="Web Publish lifecycle evidence report" readOnly value={reportText(report)} />
      </section>

      <div className={styles.links}><Link href="/production-e2e">Production E2E Evidence</Link><Link href={selectedId ? `/release/${selectedId}` : "/my-apps"}>Publish Center</Link><Link href="/">Back to LANERIQ AI</Link></div>
      <p className={styles.truth}>A PASS is authenticated Production lifecycle evidence for the selected project/version. It does not prove physical-device behavior, Apple/Google submission, external media providers or SMS.</p>
    </div>
  </main>;
}
