import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { chromium, devices, webkit } from "playwright";
import { MOBILE_PERFORMANCE_BUDGET } from "../lib/mobile/mobile-quality-policy.js";

const baseUrl = String(process.env.LANERIQ_PRODUCTION_URL || "https://laneriq-ai.vercel.app").replace(/\/$/, "");
const expectedSha = String(process.env.LANERIQ_EXPECTED_SHA || "").trim();
const artifactDir = path.resolve("artifacts/production-mobile-browser-qa");
const reportPath = path.join(artifactDir, "performance-report.json");
const surfaces = ["/", "/auth", "/mobile-readiness", "/ai-app-game-website-builder"];

await fs.mkdir(artifactDir, { recursive: true });

async function verifyProductionBuild() {
  const response = await fetch(`${baseUrl}/api/build-info`, { headers: { Accept: "application/json", "Cache-Control": "no-cache" }, cache: "no-store" });
  const text = await response.text();
  let body = null;
  try { body = JSON.parse(text); } catch {}
  assert.equal(response.status, 200, `build-info must return 200, got ${response.status}: ${text.slice(0, 200)}`);
  assert.equal(body?.ok, true, "build-info must report ok=true");
  assert.equal(body?.product, "LANERIQ AI", "build-info must identify LANERIQ AI");
  if (expectedSha) assert.equal(body?.commitSha, expectedSha, `Production commit ${body?.commitSha || "unknown"} does not match expected ${expectedSha}`);
  return body;
}

async function installPerformanceObservers(page) {
  await page.addInitScript(() => {
    const state = {
      cls: null,
      lcpMs: null,
      longTaskCount: null,
      supported: { layoutShift: false, largestContentfulPaint: false, longTask: false },
    };
    Object.defineProperty(window, "__laneriqPerformanceEvidence", { value: state, configurable: true });
    if (typeof PerformanceObserver !== "function") return;

    try {
      state.cls = 0;
      const clsObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (!entry.hadRecentInput) state.cls += Number(entry.value || 0);
        }
      });
      clsObserver.observe({ type: "layout-shift", buffered: true });
      state.supported.layoutShift = true;
    } catch { state.cls = null; }

    try {
      const lcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const last = entries[entries.length - 1];
        if (last) state.lcpMs = Number(last.startTime || last.renderTime || last.loadTime || 0);
      });
      lcpObserver.observe({ type: "largest-contentful-paint", buffered: true });
      state.supported.largestContentfulPaint = true;
    } catch { state.lcpMs = null; }

    try {
      state.longTaskCount = 0;
      const longTaskObserver = new PerformanceObserver((list) => {
        state.longTaskCount += list.getEntries().length;
      });
      longTaskObserver.observe({ type: "longtask", buffered: true });
      state.supported.longTask = true;
    } catch { state.longTaskCount = null; }
  });
}

function roundMetric(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? Math.round(numeric * 100) / 100 : null;
}

async function measureSurface(browser, entry, pathname) {
  const context = await browser.newContext({
    ...entry.device,
    locale: "en-MY",
    timezoneId: "Asia/Kuala_Lumpur",
    colorScheme: "dark",
  });
  const page = await context.newPage();
  await installPerformanceObservers(page);
  try {
    const response = await page.goto(`${baseUrl}${pathname}`, { waitUntil: "load", timeout: 45_000 });
    assert(response, `${entry.label} ${pathname} navigation returned no response`);
    assert.equal(response.status(), 200, `${entry.label} ${pathname} must return HTTP 200`);
    await page.waitForTimeout(1500);

    const raw = await page.evaluate(() => {
      const nav = performance.getEntriesByType("navigation")[0] || null;
      const paints = performance.getEntriesByType("paint");
      const resources = performance.getEntriesByType("resource");
      const firstPaint = paints.find((entry) => entry.name === "first-paint")?.startTime ?? null;
      const firstContentfulPaint = paints.find((entry) => entry.name === "first-contentful-paint")?.startTime ?? null;
      const observer = window.__laneriqPerformanceEvidence || {};
      const transferBytes = resources.reduce((sum, item) => sum + Math.max(0, Number(item.transferSize || 0)), 0);
      const encodedBodyBytes = resources.reduce((sum, item) => sum + Math.max(0, Number(item.encodedBodySize || 0)), 0);
      const decodedBodyBytes = resources.reduce((sum, item) => sum + Math.max(0, Number(item.decodedBodySize || 0)), 0);
      const byInitiator = {};
      for (const item of resources) {
        const key = String(item.initiatorType || "other");
        byInitiator[key] = (byInitiator[key] || 0) + 1;
      }
      return {
        navigation: nav ? {
          ttfbMs: nav.responseStart,
          domContentLoadedMs: nav.domContentLoadedEventEnd,
          loadMs: nav.loadEventEnd,
          durationMs: nav.duration,
          transferBytes: Number(nav.transferSize || 0),
          encodedBodyBytes: Number(nav.encodedBodySize || 0),
          decodedBodyBytes: Number(nav.decodedBodySize || 0),
        } : null,
        paint: { firstPaintMs: firstPaint, firstContentfulPaintMs: firstContentfulPaint },
        webVitals: {
          lcpMs: observer.lcpMs ?? null,
          cls: observer.cls ?? null,
          inpMs: null,
          longTaskCount: observer.longTaskCount ?? null,
          supported: observer.supported || {},
        },
        resources: {
          count: resources.length,
          transferBytes,
          encodedBodyBytes,
          decodedBodyBytes,
          byInitiator,
        },
      };
    });

    assert(raw.navigation, `${entry.label} ${pathname} must expose Navigation Timing`);
    for (const [name, value] of Object.entries(raw.navigation)) {
      assert(Number.isFinite(Number(value)) && Number(value) >= 0, `${entry.label} ${pathname} invalid navigation metric ${name}=${value}`);
    }
    assert(Number.isInteger(raw.resources.count) && raw.resources.count >= 0, `${entry.label} ${pathname} invalid resource count`);

    const evidence = {
      path: pathname,
      navigation: Object.fromEntries(Object.entries(raw.navigation).map(([key, value]) => [key, roundMetric(value)])),
      paint: {
        firstPaintMs: roundMetric(raw.paint.firstPaintMs),
        firstContentfulPaintMs: roundMetric(raw.paint.firstContentfulPaintMs),
      },
      webVitals: {
        lcpMs: roundMetric(raw.webVitals.lcpMs),
        cls: roundMetric(raw.webVitals.cls),
        inpMs: null,
        longTaskCount: raw.webVitals.longTaskCount,
        supported: raw.webVitals.supported,
      },
      resources: raw.resources,
      budgetObservation: {
        targetLcpMs: MOBILE_PERFORMANCE_BUDGET.targetLcpMs,
        targetInpMs: MOBILE_PERFORMANCE_BUDGET.targetInpMs,
        targetCls: MOBILE_PERFORMANCE_BUDGET.targetCls,
        lcpWithinTarget: raw.webVitals.lcpMs == null ? null : Number(raw.webVitals.lcpMs) <= MOBILE_PERFORMANCE_BUDGET.targetLcpMs,
        clsWithinTarget: raw.webVitals.cls == null ? null : Number(raw.webVitals.cls) <= MOBILE_PERFORMANCE_BUDGET.targetCls,
        inpMeasured: false,
        enforcement: "observational_browser_emulation_only",
      },
    };

    const fcp = evidence.paint.firstContentfulPaintMs == null ? "n/a" : `${evidence.paint.firstContentfulPaintMs}ms`;
    const lcp = evidence.webVitals.lcpMs == null ? "n/a" : `${evidence.webVitals.lcpMs}ms`;
    const cls = evidence.webVitals.cls == null ? "n/a" : evidence.webVitals.cls;
    console.log(`✓ ${entry.label} ${pathname}: TTFB ${evidence.navigation.ttfbMs}ms · FCP ${fcp} · LCP ${lcp} · CLS ${cls} · resources ${evidence.resources.count}`);
    return evidence;
  } finally {
    await context.close();
  }
}

const browserMatrix = [
  { id: "webkit-iphone13", label: "WebKit · iPhone 13", browserType: webkit, device: devices["iPhone 13"] },
  { id: "chromium-pixel5", label: "Chromium · Pixel 5", browserType: chromium, device: devices["Pixel 5"] },
];
for (const entry of browserMatrix) assert(entry.device, `Missing Playwright device descriptor for ${entry.label}`);

const buildInfo = await verifyProductionBuild();
const report = {
  performanceEvidenceVersion: 1,
  evidenceLevel: "BROWSER_EMULATION",
  realDevicePerformanceVerified: false,
  realDeviceEvidenceRequired: MOBILE_PERFORMANCE_BUDGET.realDeviceEvidenceRequired,
  productionUrl: baseUrl,
  expectedSha: expectedSha || null,
  buildInfo,
  generatedAt: new Date().toISOString(),
  budgets: MOBILE_PERFORMANCE_BUDGET,
  interpretation: "Production browser-emulation measurements are useful regression evidence but do not replace physical-device/network LCP, INP or CLS proof.",
  browsers: [],
};

for (const entry of browserMatrix) {
  const browser = await entry.browserType.launch({ headless: true });
  try {
    const measuredSurfaces = [];
    for (const pathname of surfaces) measuredSurfaces.push(await measureSurface(browser, entry, pathname));
    report.browsers.push({ id: entry.id, label: entry.label, evidenceLevel: "BROWSER_EMULATION", realDevicePerformanceVerified: false, surfaces: measuredSurfaces });
    await fs.writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  } finally {
    await browser.close();
  }
}

await fs.writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
console.log(`✓ Production mobile performance evidence recorded for ${report.browsers.length}/${browserMatrix.length} browser/device profiles`);
console.log("✓ Performance evidence remains BROWSER_EMULATION; real iPhone/network evidence is still required for 100 LIVE VERIFIED");
