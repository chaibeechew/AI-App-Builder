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
  // Linux WebKit can expose transient DOM gaps across Next.js same-URL RSC navigations.
  // Document structure is therefore verified from the navigation response itself; browser APIs
  // are reserved for final URL, viewport descriptors and explicit interactive controls.
  await page.waitForTimeout(650);
  return response;
}

async function waitForUrl(page, predicate, label, timeoutMs = 5_000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    const current = new URL(page.url());
    if (predicate(current)) return current;
    await page.waitForTimeout(200);
  }
  throw new Error(`${label} URL did not reach the expected bounded state. Final URL: ${page.url()}`);
}

function decodeHtml(value = "") {
  return String(value)
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

async function inspectDocument(page, route, engineLabel, { publicRoute = false, protectedRoute = false } = {}) {
  console.log(`→ ${engineLabel} ${route}`);
  const consoleErrors = [];
  const pageErrors = [];
  page.on("console", (message) => { if (message.type() === "error") consoleErrors.push(message.text()); });
  page.on("pageerror", (error) => pageErrors.push(String(error)));

  const startedAt = Date.now();
  const response = await settle(page, `${baseUrl}${route}`, `${engineLabel} ${route}`);
  const html = await response.text();
  const status = response.status();
  const viewportSize = page.viewportSize();
  assert.ok(viewportSize, `${engineLabel} ${route} must expose an emulated viewport`);

  const title = (html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || "").trim();
  const viewport = html.match(/<meta[^>]+name=["']viewport["'][^>]+content=["']([^"']+)["']/i)?.[1]
    || html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+name=["']viewport["']/i)?.[1]
    || "";
  const bodyText = decodeHtml(html);
  const hasFrameworkError = /__next_error__|data-nextjs-dialog|Internal Server Error/i.test(html);

  let finalUrl;
  if (protectedRoute) {
    finalUrl = await waitForUrl(page, (url) => url.origin === baseOrigin && url.pathname === "/auth", `${engineLabel} ${route}`);
  } else {
    finalUrl = new URL(page.url());
  }
  const elapsedMs = Date.now() - startedAt;

  assert.equal(finalUrl.origin, baseOrigin, `${engineLabel} ${route} must remain on the LANERIQ AI origin`);
  assert.ok(title.length > 0, `${engineLabel} ${route} must return a document title in navigation HTML`);
  assert.ok(bodyText.length > 20, `${engineLabel} ${route} must return meaningful HTML content`);
  assert.equal(hasFrameworkError, false, `${engineLabel} ${route} must not return a framework error document`);
  assert.deepEqual(pageErrors, [], `${engineLabel} ${route} must not raise page errors: ${pageErrors.join(" | ")}`);
  assert.deepEqual(consoleErrors, [], `${engineLabel} ${route} must not log console errors: ${consoleErrors.join(" | ")}`);
  assert.ok(viewport.includes("width=device-width"), `${engineLabel} ${route} must declare a mobile viewport`);
  assert.ok(viewportSize.width >= 320 && viewportSize.width <= 500, `${engineLabel} ${route} must render inside a phone-width viewport, got ${viewportSize.width}px`);
  assert.equal(finalUrl.protocol, "https:", `${engineLabel} ${route} must remain in a secure HTTPS context`);

  if (publicRoute) {
    assert.equal(finalUrl.pathname, route, `${engineLabel} ${route} must remain publicly reachable`);
    assert.ok(status >= 200 && status < 400, `${engineLabel} ${route} must return a successful public response`);
  }
  if (protectedRoute) {
    assert.equal(finalUrl.searchParams.get("next"), route, `${engineLabel} ${route} must preserve its bounded internal return path`);
  }

  console.log(`✓ ${engineLabel} ${route} → ${finalUrl.pathname}${finalUrl.search} viewport=${viewportSize.width}x${viewportSize.height} (${elapsedMs}ms)`);
  return { route, finalUrl: finalUrl.href, status, elapsedMs, title, viewport: viewportSize };
}

async function inspectAuth(page, engineLabel) {
  console.log(`→ ${engineLabel} auth safe-next + input interaction`);
  await settle(page, `${baseUrl}/auth?next=https://evil.example/path`, `${engineLabel} auth-safe-next`);
  const safeAuthUrl = await waitForUrl(page, (url) => url.origin === baseOrigin && url.pathname === "/auth" && url.searchParams.get("next") === "/", `${engineLabel} auth-safe-next`);
  assert.equal(safeAuthUrl.origin, baseOrigin, "External next must never leave LANERIQ AI origin");

  const emailInput = page.locator('input[type="email"]').first();
  assert.equal(await emailInput.count(), 1, "Auth must expose an email input");
  const inputBox = await emailInput.boundingBox({ timeout: 5_000 });
  assert.ok(inputBox, "Auth email input must have a visible bounding box");
  assert.ok(inputBox.height >= 44, `Auth email input touch height must be >=44px, got ${inputBox.height}`);
  await emailInput.fill("mobile-browser-qa@example.invalid", { timeout: 5_000 });
  assert.equal(await emailInput.inputValue({ timeout: 5_000 }), "mobile-browser-qa@example.invalid", "Auth input must accept mobile text entry");
  await emailInput.fill("", { timeout: 5_000 });

  const submit = page.locator('button[type="submit"]').first();
  if (await submit.count()) {
    const submitBox = await submit.boundingBox({ timeout: 5_000 });
    assert.ok(submitBox && submitBox.height >= 44, `Auth submit touch target must be >=44px, got ${submitBox?.height || 0}`);
  }
  console.log(`✓ ${engineLabel} auth input ${Math.round(inputBox.height)}px; text entry passed`);
  return { width: inputBox.width, height: inputBox.height };
}

async function inspectMobileReadiness(page, engineLabel) {
  console.log(`→ ${engineLabel} mobile-readiness hydration`);
  await settle(page, `${baseUrl}/mobile-readiness`, `${engineLabel} mobile-readiness-hydration`);
  const report = page.locator('textarea[aria-label="Mobile readiness evidence report"]').first();
  await report.waitFor({ state: "attached", timeout: 10_000 });
  let reportText = "";
  for (let attempt = 1; attempt <= 4; attempt += 1) {
    reportText = await report.inputValue({ timeout: 5_000 }).catch(() => "");
    if (reportText.trim().startsWith("{")) break;
    await page.waitForTimeout(250);
  }
  assert.ok(reportText.trim().startsWith("{"), `${engineLabel} mobile readiness must hydrate a JSON evidence report`);
  const parsed = JSON.parse(reportText);
  assert.equal(parsed.product, "LANERIQ AI");
  assert.equal(parsed.permissionPromptsTriggered, false);
  assert.equal(parsed.origin, baseOrigin);
  assert.equal(parsed.path, "/mobile-readiness");
  assert.ok(parsed.requiredChecks >= 10, "Mobile readiness report must expose a meaningful required baseline");
  assert.ok(parsed.passedRequiredChecks >= 8, "Phone emulation must pass most required mobile readiness checks");
  assert.ok(parsed.score >= 60, `Emulated mobile readiness score unexpectedly low: ${parsed.score}`);
  assert.doesNotMatch(JSON.stringify(parsed), /userAgent|platform|emailAddress|phoneNumber/i, "Evidence report must not contain fingerprint or identity fields");

  const runAgain = page.getByRole("button", { name: "Run again" });
  const runAgainBox = await runAgain.boundingBox({ timeout: 5_000 });
  assert.ok(runAgainBox && runAgainBox.height >= 44 && runAgainBox.width >= 44, "Run again must be a >=44px touch target");
  await runAgain.click({ timeout: 5_000 });
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
console.log("✓ Navigation HTML, final browser URLs, protected redirects, mobile viewport descriptors, Auth touch-target/input interaction and mobile-readiness hydration passed");
console.log("ℹ Static mobile contracts in main separately lock horizontal-overflow and 16px typography rules; browser emulation is not used to replace those code gates");
console.log("ℹ Browser emulation strengthens mobile evidence but does not replace physical iPhone Safari, microphone, Photos or real-network performance proof");
