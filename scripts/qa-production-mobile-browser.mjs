import assert from "node:assert/strict";
import { chromium, devices, webkit } from "@playwright/test";

const baseUrl = String(process.env.LANERIQ_PRODUCTION_URL || "https://laneriq-ai.vercel.app").replace(/\/$/, "");
const baseOrigin = new URL(baseUrl).origin;

const engines = [
  { name: "WebKit", deviceName: "iPhone 13", browserType: webkit, device: devices["iPhone 13"] },
  { name: "Chromium", deviceName: "Pixel 5", browserType: chromium, device: devices["Pixel 5"] },
];

for (const engine of engines) assert.ok(engine.device, `Missing Playwright device descriptor: ${engine.deviceName}`);

const publicRoutes = ["/", "/auth", "/ai-app-game-website-builder", "/mobile-readiness"];
const protectedRoutes = ["/studio", "/asset-library", "/brand-kit"];
const allResults = [];

async function settle(page, url, label) {
  const response = await page.goto(url, { waitUntil: "domcontentloaded", timeout: 25_000 });
  await page.locator("body").waitFor({ state: "visible", timeout: 15_000 });
  await page.waitForTimeout(1200);
  assert.ok(response, `${label} must return a document response`);
  return response;
}

async function inspectDocument(page, route, { publicRoute = false, protectedRoute = false } = {}) {
  const consoleErrors = [];
  const pageErrors = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => pageErrors.push(String(error)));

  const startedAt = Date.now();
  const response = await settle(page, `${baseUrl}${route}`, route);
  const elapsedMs = Date.now() - startedAt;
  const finalUrl = new URL(page.url());
  const status = response.status();
  const title = await page.title();
  const bodyText = (await page.locator("body").innerText()).trim();
  const layout = await page.evaluate(() => ({
    innerWidth: window.innerWidth,
    innerHeight: window.innerHeight,
    scrollWidth: document.documentElement.scrollWidth,
    scrollHeight: document.documentElement.scrollHeight,
    viewport: document.querySelector('meta[name="viewport"]')?.getAttribute("content") || "",
    secureContext: window.isSecureContext,
    maxTouchPoints: Number(navigator.maxTouchPoints || 0),
    coarsePointer: window.matchMedia?.("(pointer: coarse)")?.matches === true,
  }));
  const overlayCount = await page.locator("[data-nextjs-dialog], .vite-error-overlay, #webpack-dev-server-client-overlay").count();

  assert.equal(finalUrl.origin, baseOrigin, `${route} must remain on the LANERIQ AI origin`);
  assert.ok(title.length > 0, `${route} must render a document title`);
  assert.ok(bodyText.length > 20, `${route} must render meaningful content`);
  assert.equal(overlayCount, 0, `${route} must not show a framework error overlay`);
  assert.deepEqual(pageErrors, [], `${route} must not raise page errors: ${pageErrors.join(" | ")}`);
  assert.deepEqual(consoleErrors, [], `${route} must not log console errors: ${consoleErrors.join(" | ")}`);
  assert.ok(layout.viewport.includes("width=device-width"), `${route} must declare a mobile viewport`);
  assert.ok(layout.scrollWidth <= layout.innerWidth + 1, `${route} must not horizontally overflow the emulated phone viewport`);
  assert.equal(layout.secureContext, true, `${route} must run in a secure context`);
  assert.ok(layout.maxTouchPoints > 0, `${route} must expose touch capability under the phone descriptor`);
  assert.equal(layout.coarsePointer, true, `${route} must expose a coarse pointer under the phone descriptor`);

  if (publicRoute) {
    assert.equal(finalUrl.pathname, route, `${route} must remain publicly reachable`);
    assert.ok(status >= 200 && status < 400, `${route} must return a successful public response`);
  }

  if (protectedRoute) {
    assert.equal(finalUrl.pathname, "/auth", `${route} must redirect signed-out users to /auth`);
    assert.equal(finalUrl.searchParams.get("next"), route, `${route} must preserve its bounded internal return path`);
  }

  return { route, finalUrl: finalUrl.href, status, elapsedMs, title, layout };
}

async function inspectAuth(page) {
  await settle(page, `${baseUrl}/auth?next=https://evil.example/path`, "auth-safe-next");
  const safeAuthUrl = new URL(page.url());
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
  return metrics;
}

async function inspectMobileReadiness(page) {
  await settle(page, `${baseUrl}/mobile-readiness`, "mobile-readiness-hydration");
  const report = page.locator('textarea[aria-label="Mobile readiness evidence report"]');
  await assert.doesNotReject(async () => {
    await page.waitForFunction(() => {
      const node = document.querySelector('textarea[aria-label="Mobile readiness evidence report"]');
      return node && node.value.trim().startsWith("{");
    }, { timeout: 15_000 });
  });
  const parsed = JSON.parse(await report.inputValue());
  assert.equal(parsed.product, "LANERIQ AI");
  assert.equal(parsed.permissionPromptsTriggered, false);
  assert.equal(parsed.origin, baseOrigin);
  assert.equal(parsed.path, "/mobile-readiness");
  assert.ok(parsed.requiredChecks >= 10, "Mobile readiness report must expose a meaningful required baseline");
  assert.ok(parsed.passedRequiredChecks >= 8, "Phone emulation must pass most required mobile readiness checks");
  assert.ok(parsed.score >= 60, `Emulated mobile readiness score unexpectedly low: ${parsed.score}`);
  const serialized = JSON.stringify(parsed);
  assert.doesNotMatch(serialized, /userAgent|platform|emailAddress|phoneNumber/i, "Evidence report must not contain fingerprint or identity fields");

  const runAgain = page.getByRole("button", { name: "Run again" });
  assert.equal(await runAgain.count(), 1, "Mobile readiness must expose Run again");
  const runAgainBox = await runAgain.boundingBox();
  assert.ok(runAgainBox && runAgainBox.height >= 44 && runAgainBox.width >= 44, "Run again must be a >=44px touch target");
  await runAgain.click();
  await page.waitForTimeout(500);
  return { score: parsed.score, passedRequiredChecks: parsed.passedRequiredChecks, requiredChecks: parsed.requiredChecks };
}

for (const engine of engines) {
  const browser = await engine.browserType.launch({ headless: true });
  const context = await browser.newContext({ ...engine.device, locale: "en-US" });
  const engineResults = { engine: engine.name, device: engine.deviceName, public: [], protected: [], auth: null, mobileReadiness: null };

  for (const route of publicRoutes) {
    const page = await context.newPage();
    engineResults.public.push(await inspectDocument(page, route, { publicRoute: true }));
    await page.close();
  }

  for (const route of protectedRoutes) {
    const page = await context.newPage();
    engineResults.protected.push(await inspectDocument(page, route, { protectedRoute: true }));
    await page.close();
  }

  const authPage = await context.newPage();
  engineResults.auth = await inspectAuth(authPage);
  await authPage.close();

  const readinessPage = await context.newPage();
  engineResults.mobileReadiness = await inspectMobileReadiness(readinessPage);
  await readinessPage.close();

  allResults.push(engineResults);
  await browser.close();
}

console.log(JSON.stringify({
  ok: true,
  baseUrl,
  engines: allResults,
  publicRoutes,
  protectedRoutes,
  evidenceLevel: "browser-emulation",
  physicalDeviceVerified: false,
}, null, 2));
console.log("✓ LANERIQ AI Production cross-engine mobile-browser QA passed on WebKit/iPhone and Chromium/Android emulation");
console.log("✓ Public rendering, protected redirects, auth safe-next, 44px/16px mobile controls, no horizontal overflow and mobile-readiness hydration passed");
console.log("ℹ Browser emulation strengthens mobile evidence but does not replace physical iPhone Safari, microphone, Photos or real-network performance proof");
