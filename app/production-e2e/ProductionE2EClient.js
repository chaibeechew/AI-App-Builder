"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import styles from "./production-e2e.module.css";

const FRESH_WINDOW_MS = 20 * 60 * 1000;
const SURFACES = [
  { id: "app-demo", label: "App Demo", path: (id) => `/a/${id}?demo=1` },
  { id: "website-preview", label: "Website Preview", path: (id) => `/website/${id}` },
  { id: "versions", label: "Versions / Undo", path: (id) => `/app-dashboard/${id}/versions` },
  { id: "release", label: "Release", path: (id) => `/release/${id}` },
];

function okCheck(id, label, passed, detail, evidence = "authenticated-production") {
  return { id, label, passed: Boolean(passed), detail: String(detail || ""), evidence };
}

async function readJson(response) {
  const type = response.headers.get("content-type") || "";
  if (!type.toLowerCase().includes("application/json")) return null;
  try { return await response.json(); } catch { return null; }
}

async function probeSurface(path, appName) {
  const started = performance.now();
  const response = await fetch(path, {
    method: "GET",
    cache: "no-store",
    credentials: "same-origin",
    redirect: "manual",
    headers: { "Cache-Control": "no-cache" },
  });
  const elapsedMs = Math.round(performance.now() - started);
  if (response.type === "opaqueredirect" || response.status === 0) {
    return { path, passed: false, status: 0, elapsedMs, detail: "Authentication redirect detected; sign in again before collecting evidence." };
  }
  const text = await response.text();
  const type = response.headers.get("content-type") || "";
  const badBody = /404: This page could not be found|Internal Server Error|Authentication required/i.test(text);
  const marker = /LANERIQ AI/i.test(text) || (appName && text.toLowerCase().includes(String(appName).toLowerCase()));
  const passed = response.ok && type.toLowerCase().includes("text/html") && text.length > 300 && !badBody;
  return {
    path,
    passed,
    status: response.status,
    elapsedMs,
    bytes: new Blob([text]).size,
    productMarker: marker,
    detail: passed ? `HTTP ${response.status}, ${elapsedMs}ms, ${new Blob([text]).size} bytes` : `HTTP ${response.status}; page did not satisfy the production HTML contract`,
  };
}

function reportScore(checks) {
  if (!checks.length) return 0;
  return Math.round((checks.filter((check) => check.passed).length / checks.length) * 100);
}

function copyWithFallback(text) {
  if (navigator.clipboard?.writeText) return navigator.clipboard.writeText(text);
  const area = document.createElement("textarea");
  area.value = text;
  area.setAttribute("readonly", "");
  area.style.position = "fixed";
  area.style.opacity = "0";
  document.body.appendChild(area);
  area.select();
  const copied = document.execCommand("copy");
  area.remove();
  if (!copied) throw new Error("Clipboard unavailable");
  return Promise.resolve();
}

export default function ProductionE2EClient() {
  const [apps, setApps] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [loadingApps, setLoadingApps] = useState(true);
  const [running, setRunning] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [report, setReport] = useState(null);
  const [copyState, setCopyState] = useState("");

  const loadApps = useCallback(async () => {
    setLoadingApps(true);
    setLoadError("");
    try {
      const response = await fetch("/api/apps", { cache: "no-store", credentials: "same-origin", redirect: "manual" });
      if (response.type === "opaqueredirect" || response.status === 0 || response.status === 401) {
        window.location.replace(`/auth?next=${encodeURIComponent("/production-e2e")}`);
        return;
      }
      const body = await readJson(response);
      if (!response.ok || !Array.isArray(body?.apps)) throw new Error(body?.error || `Unable to load projects (${response.status})`);
      setApps(body.apps);
      setSelectedId((current) => current && body.apps.some((app) => app.id === current) ? current : body.apps[0]?.id || "");
    } catch (error) {
      setLoadError(error?.message || "Unable to load projects.");
    } finally {
      setLoadingApps(false);
    }
  }, []);

  useEffect(() => { void loadApps(); }, [loadApps]);

  const selected = useMemo(() => apps.find((app) => app.id === selectedId) || null, [apps, selectedId]);

  const runEvidence = async () => {
    if (!selected || running) return;
    setRunning(true);
    setLoadError("");
    setCopyState("");
    try {
      const detailResponse = await fetch(`/api/apps/${selected.id}`, { cache: "no-store", credentials: "same-origin", redirect: "manual" });
      if (detailResponse.type === "opaqueredirect" || detailResponse.status === 0 || detailResponse.status === 401) {
        window.location.replace(`/auth?next=${encodeURIComponent("/production-e2e")}`);
        return;
      }
      const detail = await readJson(detailResponse);
      if (!detailResponse.ok || !detail?.app || !Array.isArray(detail?.versions)) throw new Error(detail?.error || "Unable to load the selected project lifecycle.");

      const currentVersion = detail.versions.find((version) => version.id === detail.app.current_version_id) || null;
      const createdAtMs = Date.parse(detail.app.created_at || "");
      const ageMs = Number.isFinite(createdAtMs) ? Math.max(0, Date.now() - createdAtMs) : null;
      const freshGeneration = ageMs !== null && ageMs <= FRESH_WINDOW_MS;
      const checks = [
        okCheck("persisted-app", "Persisted project record", Boolean(detail.app.id && detail.app.source_prompt), `Project ${detail.app.id} loaded from authenticated /api/apps/{id}.`),
        okCheck("version-history", "Version history exists", detail.versions.length > 0, `${detail.versions.length} persisted version(s) found.`),
        okCheck("current-version", "Current version resolves", Boolean(currentVersion), currentVersion ? `current_version_id resolves to version ${currentVersion.version_no}.` : "current_version_id did not resolve inside version history."),
        okCheck("specification", "Current version has generated specification", Boolean(currentVersion?.specification && typeof currentVersion.specification === "object"), currentVersion?.specification ? "Generated specification is persisted on the current version." : "Current specification missing."),
        okCheck("fresh-generation", "Fresh generation evidence", freshGeneration, ageMs === null ? "Project creation time unavailable." : freshGeneration ? `Project was created ${Math.round(ageMs / 1000)} seconds ago.` : `Project is ${Math.round(ageMs / 60000)} minutes old; generate a new project immediately before rerunning to close fresh Generate→Save evidence.`, "fresh-generation-window"),
      ];

      const surfaces = [];
      for (const surface of SURFACES) {
        const result = await probeSurface(surface.path(selected.id), detail.app.name);
        surfaces.push({ id: surface.id, label: surface.label, ...result });
        checks.push(okCheck(`surface-${surface.id}`, `${surface.label} resolves`, result.passed, result.detail));
      }

      const evidence = {
        reportVersion: 1,
        product: "LANERIQ AI",
        generatedAt: new Date().toISOString(),
        evidenceLevel: "authenticated-production-browser",
        physicalDeviceVerified: false,
        providerOutputReplayed: false,
        smsExercised: false,
        origin: window.location.origin,
        project: {
          id: detail.app.id,
          name: detail.app.name,
          createdAt: detail.app.created_at,
          updatedAt: detail.app.updated_at,
          currentVersionId: detail.app.current_version_id,
          currentVersionNo: currentVersion?.version_no ?? null,
          versionCount: detail.versions.length,
          freshGenerationWithin20Minutes: freshGeneration,
        },
        surfaces,
        checks,
        score: reportScore(checks),
      };
      setReport(evidence);
    } catch (error) {
      setLoadError(error?.message || "Production E2E evidence run failed.");
    } finally {
      setRunning(false);
    }
  };

  const reportJson = report ? JSON.stringify(report, null, 2) : "Run authenticated Production evidence to generate a report.";

  const copyReport = async () => {
    try {
      await copyWithFallback(reportJson);
      setCopyState("Evidence report copied. Paste it into ChatGPT for evidence review.");
    } catch {
      setCopyState("Clipboard unavailable. Select and copy the evidence report manually.");
    }
  };

  return (
    <main className={styles.page}>
      <section className={styles.shell}>
        <div className={styles.eyebrow}>LANERIQ AI · AUTHENTICATED PRODUCTION E2E</div>
        <h1>Production E2E Evidence</h1>
        <p className={styles.lead}>Use a real signed-in LANERIQ AI project. This verifier never creates a fake account, bypasses Auth, modifies a project, triggers SMS, or replays a mocked provider response.</p>

        <section className={styles.selectorCard}>
          <div>
            <strong>Real project</strong>
            <span>{loadingApps ? "Loading your projects…" : apps.length ? `${apps.length} project(s) available` : "No saved projects yet"}</span>
          </div>
          <select value={selectedId} onChange={(event) => { setSelectedId(event.target.value); setReport(null); }} disabled={loadingApps || !apps.length} aria-label="Choose real project for Production E2E evidence">
            {apps.map((app) => <option key={app.id} value={app.id}>{app.name || "Untitled project"} · {new Date(app.updated_at).toLocaleString()}</option>)}
          </select>
        </section>

        {!loadingApps && !apps.length ? <div className={styles.notice}>Create a new App + Website from the main LANERIQ AI page, then return here immediately. A project created within 20 minutes can close the fresh Generate → Save evidence check.</div> : null}
        {loadError ? <div className={styles.error} role="alert">{loadError}</div> : null}

        <div className={styles.actions}>
          <button type="button" onClick={runEvidence} disabled={!selected || running}>{running ? "Running evidence…" : "Run Production evidence"}</button>
          <button type="button" onClick={copyReport} disabled={!report}>Copy report</button>
          <button type="button" onClick={loadApps} disabled={loadingApps}>Refresh projects</button>
          <a href="/">Create new App + Website</a>
        </div>
        {copyState ? <p className={styles.copyState} role="status">{copyState}</p> : null}

        {report ? <section className={styles.scoreCard}>
          <div><span>Authenticated lifecycle score</span><strong>{report.score}/100</strong></div>
          <div><b>{report.project.name}</b><span>Version {report.project.currentVersionNo ?? "?"} · {report.project.versionCount} saved version(s)</span><span>{report.project.freshGenerationWithin20Minutes ? "Fresh generation window: PASS" : "Fresh generation window: rerun after a new build"}</span></div>
        </section> : null}

        {report ? <section className={styles.grid}>
          {report.checks.map((check) => <article key={check.id} data-pass={check.passed ? "true" : "false"} className={styles.checkCard}><div><strong>{check.label}</strong><span>{check.passed ? "PASS" : "CHECK"}</span></div><p>{check.detail}</p></article>)}
        </section> : null}

        <section className={styles.reportSection}>
          <div><h2>Evidence report</h2><span>Local display only until you tap Copy report.</span></div>
          <textarea readOnly value={reportJson} aria-label="Authenticated Production E2E evidence report" />
        </section>
      </section>
    </main>
  );
}
