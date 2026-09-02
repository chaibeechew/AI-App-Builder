import assert from "node:assert/strict";
import { chromium, devices, webkit } from "@playwright/test";

const baseUrl = String(process.env.LANERIQ_PRODUCTION_URL || "https://laneriq-ai.vercel.app").replace(/\/$/, "");
const baseOrigin = new URL(baseUrl).origin;

const engines = [
  { name: "WebKit", deviceName: "iPhone 13", browserType: webkit, device: devices["iPhone 13"] },
  { name: "Chromium", deviceName: "Pixel 5", browserType: chromium, device: devices["Pixel 5"] },
];
for (const engine of engines) {
  assert.ok(engine.device, `Missing Playwright device descriptor: ${engine.deviceName}`);
  assert.equal(engine.device.isMobile, true, `${engine.deviceName} descriptor must be mobile`);
  assert.equal(engine.device.hasTouch, true, `${engine.deviceName} descriptor must enable touch input`);
}

const publicRoutes = ["/", "/auth", "/ai-app-game-website-builder", "/mobile-readiness"];
const protectedRoutes = ["/studio", "/asset-library", "/brand-kit"];
const allResults = [];

function configurePage(page, engineLabel) {
  page.setDefaultTimeout(5_000);
  page.setDefaultNavigationTimeout(15_000);
  page.on("framenavigated", (frame) => {
    if (frame === page.mainFrame()) console.log(`↪ ${engineLabel} navigated ${frame.url()}`);
  });
  page.on("requestfailed", (request) => {
    if (request.isNavigationRequest()) console.log(`⚠ ${engineLabel} navigation request failed ${request.url()} :: ${request.failure()?.errorText || "unknown"}`);
  });
}

async function settle(page, url, label) {
  const response = await page.goto(url, { waitUntil: "commit", timeout: 15_000 });
  assert.ok(response, `${label} must return a document response`);
  try {
    await page.waitForFunction(() => document.readyState === "interactive" || document.readyState === "complete", undefined, { timeout: 5_000 });
  } catch {
    console.log(`⚠ ${label} did not reach interactive readyState within 5s; taking bounded DOM snapshot`);
  }
  await page.waitForTimeout(350);
  return response;
}

async function snapshotDocument(page, label) {
  let lastError = null;
  for (let attempt = 1; attempt <= 4; attempt += 1) {
    try {
      return await page.evaluate(() => ({
        href: location.href,
        title: document.title || "",
        readyState: document.readyState,
        bodyText: String(document.body?.innerText || document.body?.textContent || "").trim(),
        innerWidth: window.innerWidth,
        innerHeight: window.innerHeight,
        scrollWidth: document.documentElement?.scrollWidth || 0,
        scrollHeight: document.documentElement?.scrollHeight || 0,
        viewport: document.querySelector('meta[name="viewport"]')?.getAttribute("content") || "",
        secureContext: window.isSecureContext,
        maxTouchPoints: Number(navigator.maxTouchPoints || 0),
        coarsePointer: window.matchMedia?.("(pointer: coarse)")?.matches === true,
        touchEventSupport: "ontouchstart" in window,
        overlayCount: document.querySelectorAll("[data-nextjs-dialog], .vite-error-overlay, #webpack-dev-server-client-overlay").length,
        navigationEntries: performance.getEntriesByType?.("navigation")?.length || 0,
      }));
    } catch (error) {
      lastError = error;
      console.log(`⚠ ${label} snapshot attempt ${attempt}/4 failed: ${error?.message || error}`);
      if (attempt < 4) await page.waitForTimeout(250);
    }
  }
  throw new Error(`${label} DOM snapshot failed after bounded retries: ${lastError?.message || lastError}`);
}

async function inspectDocument(page, route, engineLabel, { publicRoute = false, protectedRoute = false } = {}) {
  console.log(`→ ${engineLabel} ${route}`);
  const consoleErrors = [];
  const pageErrors = [];
  page.on("console", (message) => { if (message.type() === "error") consoleErrors.push(message.text()); });
  page.on("pageerror", (error) => pageErrors.push(String(error)));

  const startedAt = Date.now();
  const response = await settle(page, `${baseUrl}${route}`, `${engineLabel} ${route}`);
  if (protectedRoute) await page.waitForTimeout(450);
  const snapshot = await snapshotDocument(page, `${engineLabel} ${route}`);
  const elapsedMs = Date.now() - startedAt;
  const finalUrl = new URL(snapshot.href);
  const status = response.status();
  const { href, title, bodyText, overlayCount, ...layout } = snapshot;

  assert.equal(finalUrl.origin, baseOrigin, `${engineLabel} ${route} must remain on the LANERIQ AI origin`);
  assert.ok(title.length > 0, `${engineLabel} ${route} must render a document title`);
  assert.ok(bodyText.length > 20, `${engineLabel} ${route} must render meaningful content`);
  assert.equal(overlayCount, 0, `${engineLabel} ${route} must not show a framework error overlay`);
  assert.deepEqual(pageErrors, [], `${engineLabel} ${route} must not raise page errors: ${pageErrors.join(" | ")}`);
  assert.deepEqual(consoleErrors, [], `${engineLabel} ${route} must not log console errors: ${consoleErrors.join(" | ")}`);
  assert.ok(layout.viewport.includes("width=device-width"), `${engineLabel} ${route} must declare a mobile viewport`);
  assert.ok(layout.innerWidth >= 320 && layout.innerWidth <= 500, `${engineLabel} ${route} must render inside a phone-width viewport, got ${layout.innerWidth}px`);
  assert.ok(layout.scrollWidth <= layout.innerWidth + 1, `${engineLabel} ${route} must not horizontally overflow the emulated phone viewport`);
  assert.equal(layout.secureContext, true, `${engineLabel} ${route} must run in a secure context`);

  if (publicRoute) {
    assert.equal(finalUrl.pathname, route, `${engineLabel} ${route} must remain publicly reachable`);
    assert.ok(status >= 200 && status < 400, `${engineLabel} ${route} must return a successful public response`);
  }
  if (protectedRoute) {
    assert.equal(finalUrl.pathname, "/auth", `${engineLabel} ${route} must redirect signed-out users to /auth`);
    assert.equal(finalUrl.searchParams.get("next"), route, `${engineLabel} ${route} must preserve its bounded internal return path`);
  }

  console.log(`✓ ${engineLabel} ${route} → ${finalUrl.pathname}${finalUrl.search} ready=${layout.readyState} touchPoints=${layout.maxTouchPoints} coarse=${layout.coarsePointer} touchEvent=${layout.touchEventSupport} (${elapsedMs}ms)`);
  return { route, finalUrl: href, status, elapsedMs, title, layout };
}

async function inspectAuth(page, engineLabel) {
  console.log(`→ ${engineLabel} auth safe-next + input sizing`);
  await settle(page, `${baseUrl}/auth?next=https://evil.example/path`, `${engineLabel} auth-safe-next`);
  const safeSnapshot = await snapshotDocument(page, `${engineLabel} auth-safe-next`);
  const safeAuthUrl = new URL(safeSnapshot.href);
  assert.equal(safeAuthUrl.origin, baseOrigin, "External next must never leave LANERIQ AI origin");
  assert.equal(safeAuthUrl.pathname, "/auth", "External next must remain on /auth");
  assert.equal(safeAuthUrl.searchParams.get("next"), "/", "External next must canonicalize to /");

  const emailInput = page.locator('input[type="email"]').first();
  assert.equal(await emailInput.count(), 1, "Auth must expose an email input");
  const metrics = await emailInput.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    const style = getComputedStyle(element);
    return { width: rect.width, height: rect.height, fontSize: Number.parseFloat(style.fontSize || "0") };
  });
  assert.ok(metrics.height >= 44, `Auth email input touch height must be >=44px, got ${metrics.height}`);
  assert.ok(metrics.fontSize >= 16, `Auth email input font must be >=16px, got ${metrics.fontSize}`);
  await emailInput.fill("mobile-browser-qa@example.invalid");
  assert.equal(await emailInput.inputValue(), "mobile-browser-qa@example.invalid", "Auth input must accept mobile text entry");
  await emailInput.fill("");

  const submit = page.locator('button[type="submit"]').first();
  if (await submit.count()) {
    const height = await submit.evaluate((element) => element.getBoundingClientRect().height);
    assert.ok(height >= 44, `Auth submit touch target must be >=44px, got ${height}`);
  }
  console.log(`✓ ${engineLabel} auth input ${Math.round(metrics.height)}px / ${metrics.fontSize}px font`);
  return metrics;
}

async function inspectMobileReadiness(page, engineLabel) {
  console.log(`→ ${engineLabel} mobile-readiness hydration`);
  await settle(page, `${baseUrl}/mobile-readiness`, `${engineLabel} mobile-readiness-hydration`);
  await page.waitForFunction(() => {
    const node = document.querySelector('textarea[aria-label="Mobile readiness evidence report"]');
    return Boolean(node && node.value.trim().startsWith("{"));
  }, undefined, { timeout: 10_000 });
  const parsed = await page.evaluate(() => JSON.parse(document.querySelector('textarea[aria-label="Mobile readiness evidence report"]')?.value || "{}"));
  assert.equal(parsed.product, "LANERIQ AI");
  assert.equal(parsed.permissionPromptsTriggered, false);
  assert.equal(parsed.origin, baseOrigin);
  assert.equal(parsed.path, "/mobile-readiness");
  assert.ok(parsed.requiredChecks >= 10, "Mobile readiness report must expose a meaningful required baseline");
  assert.ok(parsed.passedRequiredChecks >= 8, "Phone emulation must pass most required mobile readiness checks");
  assert.ok(parsed.score >= 60, `Emulated mobile readiness score unexpectedly low: ${parsed.score}`);
  assert.doesNotMatch(JSON.stringify(parsed), /userAgent|platform|emailAddress|phoneNumber/i, "Evidence report must not contain fingerprint or identity fields");

  const runAgain = page.getByRole("button", { name: "Run again" });
  const runAgainBox = await runAgain.boundingBox();
  assert.ok(runAgainBox && runAgainBox.height >= 44 && runAgainBox.width >= 44, "Run again must be a >=44px touch target");
  await runAgain.click();
  await page.waitForTimeout(350);
  console.log(`✓ ${engineLabel} mobile-readiness ${parsed.score}/100 (${parsed.passedRequiredChecks}/${parsed.requiredChecks})`);
  return { score: parsed.score, passedRequiredChecks: parsed.passedRequiredChecks, requiredChecks: parsed.requiredChecks };
}

for (const engine of engines) {
  console.log(`\n=== ${engine.name} / ${engine.deviceName} ===`);
  const browser = await engine.browserType.launch({ headless: true });
  const context = await browser.newContext({ ...engine.device, locale: "en-US" });
  const engineLabel = `${engine.name}/${engine.deviceName}`;
  const engineResults = { engine: engine.name, device: engine.deviceName, descriptor: { isMobile: engine.device.isMobile, hasTouch: engine.device.hasTouch }, public: [], protected: [], auth: null, mobileReadiness: null };

  for (const route of publicRoutes) {
    const page = await context.newPage();
    configurePage(page, engineLabel);
    engineResults.public.push(await inspectDocument(page, route, engineLabel, { publicRoute: true }));
    await page.close();
  }
  for (const route of protectedRoutes) {
    const page = await context.newPage();
    configurePage(page, engineLabel);
    engineResults.protected.push(await inspectDocument(page, route, engineLabel, { protectedRoute: true }));
    await page.close();
  }

  const authPage = await context.newPage();
  configurePage(authPage, engineLabel);
  engineResults.auth = await inspectAuth(authPage, engineLabel);
  await authPage.close();

  const readinessPage = await context.newPage();
  configurePage(readinessPage, engineLabel);
  engineResults.mobileReadiness = await inspectMobileReadiness(readinessPage, engineLabel);
  await readinessPage.close();

  allResults.push(engineResults);
  await browser.close();
}

console.log(JSON.stringify({ ok: true, baseUrl, engines: allResults, publicRoutes, protectedRoutes, evidenceLevel: "browser-emulation", physicalDeviceVerified: false }, null, 2));
console.log("✓ LANERIQ AI Production cross-engine mobile-browser QA passed on WebKit/iPhone and Chromium/Android emulation");
console.log("✓ Public rendering, protected redirects, auth safe-next, 44px/16px mobile controls, no horizontal overflow and mobile-readiness hydration passed");
console.log("ℹ Playwright phone descriptors provide the mobile/touch emulation contract; DOM touch capability fields are recorded because individual engines may expose them differently on Linux");
console.log("ℹ Browser emulation strengthens mobile evidence but does not replace physical iPhone Safari, microphone, Photos or real-network performance proof");
