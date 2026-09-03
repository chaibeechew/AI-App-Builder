import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { chromium, devices, webkit } from "playwright";

const baseUrl = String(process.env.LANERIQ_PRODUCTION_URL || "https://laneriq-ai.vercel.app").replace(/\/$/, "");
const productionOrigin = new URL(baseUrl).origin;
const expectedSha = String(process.env.LANERIQ_EXPECTED_SHA || "").trim();
const artifactDir = path.resolve("artifacts/production-mobile-browser-qa");

await fs.mkdir(artifactDir, { recursive: true });

async function fetchJson(url) {
  const response = await fetch(url, { headers: { Accept: "application/json" }, cache: "no-store" });
  const text = await response.text();
  let body = null;
  try { body = JSON.parse(text); } catch {}
  return { response, body, text };
}

async function verifyProductionBuild() {
  const { response, body, text } = await fetchJson(`${baseUrl}/api/build-info`);
  assert.equal(response.status, 200, `build-info must return 200, got ${response.status}: ${text.slice(0, 200)}`);
  assert.equal(body?.ok, true, "build-info must report ok=true");
  assert.equal(body?.product, "LANERIQ AI", "build-info must identify LANERIQ AI");
  assert.match(String(response.headers.get("cache-control") || ""), /no-store/i, "build-info must never be cached");
  if (expectedSha) assert.equal(body?.commitSha, expectedSha, `Production commit ${body?.commitSha || "unknown"} does not match expected ${expectedSha}`);
  return body;
}

function safeName(value) {
  return String(value).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function buildEvidence(buildInfo, results, failure = null) {
  return {
    evidenceVersion: 3,
    evidenceLevel: "BROWSER_EMULATION",
    physicalDeviceVerified: false,
    liveProviderVerified: false,
    officialStoreVerified: false,
    productionUrl: baseUrl,
    expectedSha: expectedSha || null,
    buildInfo,
    generatedAt: new Date().toISOString(),
    browsers: results,
    ...(failure ? { failure } : {}),
  };
}

async function writeEvidence(buildInfo, results, failure = null) {
  await fs.writeFile(
    path.join(artifactDir, "report.json"),
    `${JSON.stringify(buildEvidence(buildInfo, results, failure), null, 2)}\n`,
    "utf8",
  );
}

async function pageBaseline(page, pathname, { requireHome = false } = {}) {
  const response = await page.goto(`${baseUrl}${pathname}`, { waitUntil: "domcontentloaded", timeout: 45_000 });
  assert(response, `${pathname} navigation did not return a response`);
  assert.equal(response.status(), 200, `${pathname} must return HTTP 200`);
  await page.waitForLoadState("networkidle", { timeout: 20_000 }).catch(() => {});
  await page.waitForTimeout(300);

  const metrics = await page.evaluate(({ requireHome }) => {
    const width = window.innerWidth;
    const documentWidth = document.documentElement.scrollWidth;
    const isVisible = (element) => {
      const style = getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      return style.display !== "none" && style.visibility !== "hidden" && Number.parseFloat(style.opacity || "1") > 0 && rect.width > 0 && rect.height > 0;
    };
    const visibleInputs = Array.from(document.querySelectorAll("input:not([type='hidden']), textarea, select"))
      .filter(isVisible)
      .map((element) => {
        const style = getComputedStyle(element);
        const parentClass = element.parentElement?.className;
        return {
          tag: element.tagName.toLowerCase(),
          type: element.getAttribute("type") || null,
          id: element.id || null,
          className: typeof element.className === "string" ? element.className : null,
          parentClassName: typeof parentClass === "string" ? parentClass : null,
          ariaLabel: element.getAttribute("aria-label") || null,
          placeholder: element.getAttribute("placeholder") || null,
          fontSize: Number.parseFloat(style.fontSize || "0"),
        };
      });
    const criticalTargets = requireHome
      ? Array.from(document.querySelectorAll(".buildCta, .liuiRealBottomNav a, .liuiRealBottomNav button, .bottomNav a, .bottomNav button")).filter(isVisible)
      : [];
    const criticalTargetSizes = criticalTargets.map((element) => {
      const rect = element.getBoundingClientRect();
      return {
        selectorFamily: element.closest(".liuiRealBottomNav") ? "liui" : element.closest(".bottomNav") ? "legacy" : "build",
        width: Math.round(rect.width),
        height: Math.round(rect.height),
      };
    });
    return {
      width,
      documentWidth,
      noHorizontalOverflow: documentWidth <= width + 1,
      visibleInputs,
      visibleInputFontMinimum: visibleInputs.length ? Math.min(...visibleInputs.map((input) => input.fontSize)) : null,
      homePresent: Boolean(document.querySelector(".premiumHome")),
      duplicateOverlayCount: document.querySelectorAll(".studioLauncher, .referenceDock, .sv-fab").length,
      wallpaperControlCount: document.querySelectorAll(".wallpaperControl").length,
      criticalTargetSizes,
      liuiNavVisibleTargetCount: criticalTargetSizes.filter((item) => item.selectorFamily === "liui").length,
    };
  }, { requireHome });

  assert.equal(metrics.noHorizontalOverflow, true, `${pathname} has horizontal overflow: ${metrics.documentWidth}px > ${metrics.width}px`);
  const undersizedInputs = metrics.visibleInputs.filter((input) => input.fontSize < 16);
  if (undersizedInputs.length) {
    const details = undersizedInputs.map((input) => `${input.tag}${input.id ? `#${input.id}` : ""}${input.className ? `.${input.className.split(/\s+/).filter(Boolean).join(".")}` : ""}=${input.fontSize}px`).join(", ");
    assert.fail(`${pathname} has visible editable controls below 16px, risking iOS auto-zoom: ${details}`);
  }
  if (requireHome) {
    assert.equal(metrics.homePresent, true, "Homepage must render .premiumHome");
    assert.equal(metrics.duplicateOverlayCount, 0, "Homepage must not mount duplicate Studio / Reference / Voice global overlays");
    assert.equal(metrics.wallpaperControlCount, 0, "Homepage must not mount the global Wallpaper control over primary builder actions");
    assert(metrics.criticalTargetSizes.length >= 6, "Homepage must expose the primary build action and five visible navigation touch targets");
    assert.equal(metrics.liuiNavVisibleTargetCount, 5, "Homepage must expose exactly five visible LIUI primary navigation targets");
    for (const size of metrics.criticalTargetSizes) {
      assert(size.height >= 44, `Homepage visible ${size.selectorFamily} touch target is ${size.height}px tall; minimum is 44px`);
    }
  }
  return metrics;
}

async function readinessEvidence(page) {
  const baseline = await pageBaseline(page, "/mobile-readiness");
  assert.equal(baseline.wallpaperControlCount, 0, "Mobile readiness evidence must not be obscured by the Wallpaper control");
  const reportField = page.locator('textarea[aria-label="Mobile readiness evidence report"]');
  await reportField.waitFor({ state: "visible", timeout: 20_000 });
  await page.waitForFunction(() => {
    const field = document.querySelector('textarea[aria-label="Mobile readiness evidence report"]');
    return field && field.value.trim().startsWith("{");
  }, { timeout: 20_000 });
  const report = JSON.parse(await reportField.inputValue());
  assert.equal(report.permissionPromptsTriggered, false, "Mobile readiness QA must remain permission-free");
  assert.equal(report.origin, baseUrl, "Mobile readiness report must come from the Production origin");
  const checks = new Map((report.checks || []).map((check) => [check.id, check]));
  for (const id of ["secure-context", "viewport-minimum", "horizontal-overflow", "tap-target", "input-font"]) {
    assert.equal(checks.get(id)?.passed, true, `Mobile readiness required check failed: ${id} — ${checks.get(id)?.detail || "missing"}`);
  }
  return report;
}

function classifyHttpFailure(response) {
  const status = response.status();
  if (status < 400) return null;
  const url = new URL(response.url());
  const item = { status, method: response.request().method(), origin: url.origin, path: `${url.pathname}${url.search}` };
  if (url.origin === productionOrigin && url.pathname === "/api/auth/session" && status === 401 && item.method === "GET") {
    return { expected: true, item };
  }
  return { expected: false, item };
}

const browserMatrix = [
  { id: "webkit-iphone13", label: "WebKit · iPhone 13", browserType: webkit, device: devices["iPhone 13"] },
  { id: "chromium-pixel5", label: "Chromium · Pixel 5", browserType: chromium, device: devices["Pixel 5"] },
];

for (const entry of browserMatrix) {
  assert(entry.device, `Missing Playwright device descriptor for ${entry.label}`);
}

const buildInfo = await verifyProductionBuild();
const results = [];
let runFailure = null;

try {
  for (const entry of browserMatrix) {
    const browser = await entry.browserType.launch({ headless: true });
    const context = await browser.newContext({
      ...entry.device,
      locale: "en-MY",
      timezoneId: "Asia/Kuala_Lumpur",
      colorScheme: "dark",
    });
    const page = await context.newPage();
    const pageErrors = [];
    const consoleErrors = [];
    const expectedSession401s = [];
    const unexpectedHttpFailures = [];
    const expected401ConsoleNoise = [];

    page.on("pageerror", (error) => pageErrors.push(String(error?.message || error)));
    page.on("response", (response) => {
      const classified = classifyHttpFailure(response);
      if (!classified) return;
      if (classified.expected) expectedSession401s.push(classified.item);
      else unexpectedHttpFailures.push(classified.item);
    });
    page.on("console", (message) => {
      if (message.type() !== "error") return;
      const text = message.text();
      if (/Failed to load resource:.*status of 401\b/i.test(text)) expected401ConsoleNoise.push(text);
      else consoleErrors.push(text);
    });

    try {
      const home = await pageBaseline(page, "/", { requireHome: true });
      await page.screenshot({ path: path.join(artifactDir, `${entry.id}-home.png`), fullPage: true });

      const auth = await pageBaseline(page, "/auth");
      assert.equal(auth.wallpaperControlCount, 0, "Auth must not mount the Wallpaper control over login actions");
      await page.screenshot({ path: path.join(artifactDir, `${entry.id}-auth.png`), fullPage: true });

      const readiness = await readinessEvidence(page);
      await page.screenshot({ path: path.join(artifactDir, `${entry.id}-mobile-readiness.png`), fullPage: true });

      const discovery = await pageBaseline(page, "/ai-app-game-website-builder");
      await page.screenshot({ path: path.join(artifactDir, `${entry.id}-discovery.png`), fullPage: true });

      assert.deepEqual(pageErrors, [], `${entry.label} page errors: ${pageErrors.join(" | ")}`);
      assert.deepEqual(unexpectedHttpFailures, [], `${entry.label} unexpected HTTP failures: ${JSON.stringify(unexpectedHttpFailures)}`);
      assert.deepEqual(consoleErrors, [], `${entry.label} console errors: ${consoleErrors.join(" | ")}`);
      assert(expected401ConsoleNoise.length <= expectedSession401s.length, `${entry.label} emitted more generic 401 console errors (${expected401ConsoleNoise.length}) than expected signed-out session responses (${expectedSession401s.length})`);

      results.push({
        id: entry.id,
        label: entry.label,
        evidenceLevel: "BROWSER_EMULATION",
        home,
        auth,
        readiness: {
          score: readiness.score,
          requiredChecks: readiness.requiredChecks,
          passedRequiredChecks: readiness.passedRequiredChecks,
          permissionPromptsTriggered: readiness.permissionPromptsTriggered,
          checks: readiness.checks,
        },
        discovery,
        pageErrors,
        consoleErrors,
        expectedSession401s,
        expected401ConsoleNoiseCount: expected401ConsoleNoise.length,
        unexpectedHttpFailures,
        passed: true,
      });
      await writeEvidence(buildInfo, results);
      console.log(`✓ ${entry.label}: Production homepage, auth, mobile readiness and discovery surfaces passed`);
      console.log(`✓ ${entry.label}: ${expectedSession401s.length} signed-out /api/auth/session 401 response(s) classified as expected; unexpected HTTP failures 0`);
    } catch (error) {
      runFailure = {
        browserId: entry.id,
        browserLabel: entry.label,
        url: page.url(),
        message: String(error?.message || error),
        pageErrors,
        consoleErrors,
        expectedSession401s,
        expected401ConsoleNoise,
        unexpectedHttpFailures,
      };
      await page.screenshot({ path: path.join(artifactDir, `${entry.id}-failure.png`), fullPage: true }).catch(() => {});
      await writeEvidence(buildInfo, results, runFailure);
      throw error;
    } finally {
      await context.close();
      await browser.close();
    }
  }
} finally {
  await writeEvidence(buildInfo, results, runFailure);
}

console.log(`✓ Production mobile browser QA passed ${results.length}/${browserMatrix.length} browser/device profiles`);
console.log(`✓ Evidence saved to ${safeName(path.relative(process.cwd(), artifactDir)) || "artifacts"}; this is browser emulation, not physical-device proof`);
