import assert from "node:assert/strict";
import { chromium, devices } from "@playwright/test";

const baseUrl = String(process.env.LANERIQ_PRODUCTION_URL || "https://laneriq-ai.vercel.app").replace(/\/$/, "");
const iphone = devices["iPhone 13"];
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ ...iphone, locale: "en-US" });

const results = [];

async function navigateAndSettle(page, url, label) {
  console.log(`→ browser QA ${label}: navigate`);
  const response = await page.goto(url, { waitUntil: "commit", timeout: 20_000 });
  await page.locator("body").waitFor({ state: "visible", timeout: 15_000 });
  await page.waitForTimeout(2_000);
  console.log(`✓ browser QA ${label}: body rendered`);
  return response;
}

async function inspectPage(route, { expectAuthRedirect = false, expectPublic = false } = {}) {
  const page = await context.newPage();
  const consoleErrors = [];
  const pageErrors = [];

  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => pageErrors.push(String(error)));

  const startedAt = Date.now();
  const response = await navigateAndSettle(page, `${baseUrl}${route}`, route);
  const elapsedMs = Date.now() - startedAt;
  const finalUrl = new URL(page.url());
  const status = response?.status() ?? null;
  const title = await page.title();
  const bodyText = (await page.locator("body").innerText()).trim();
  const overlayCount = await page.locator("[data-nextjs-dialog], .vite-error-overlay, #webpack-dev-server-client-overlay").count();
  const layout = await page.evaluate(() => ({
    innerWidth: window.innerWidth,
    scrollWidth: document.documentElement.scrollWidth,
    innerHeight: window.innerHeight,
    scrollHeight: document.documentElement.scrollHeight,
    viewport: document.querySelector('meta[name="viewport"]')?.getAttribute("content") || "",
  }));

  assert.equal(finalUrl.origin, new URL(baseUrl).origin, `${route} must remain on the LANERIQ AI origin`);
  assert.ok(title.length > 0, `${route} must render a document title`);
  assert.ok(bodyText.length > 20, `${route} must render meaningful content`);
  assert.equal(overlayCount, 0, `${route} must not show a framework error overlay`);
  assert.deepEqual(pageErrors, [], `${route} must not raise page errors`);
  assert.deepEqual(consoleErrors, [], `${route} must not log console errors`);
  assert.ok(layout.viewport.includes("width=device-width"), `${route} must declare a mobile viewport`);
  assert.ok(layout.scrollWidth <= layout.innerWidth + 1, `${route} must not horizontally overflow a 390px iPhone viewport`);

  if (expectPublic) {
    assert.equal(finalUrl.pathname, route.split("?")[0], `${route} must stay publicly reachable`);
    assert.ok(status && status < 400, `${route} must return a successful document response`);
  }

  if (expectAuthRedirect) {
    assert.equal(finalUrl.pathname, "/auth", `${route} must redirect signed-out users to /auth`);
    assert.equal(finalUrl.searchParams.get("next"), route, `${route} must preserve only its internal return path`);
  }

  results.push({ route, finalUrl: finalUrl.href, status, elapsedMs, layout, title });
  console.log(`✓ browser QA ${route}: assertions passed in ${elapsedMs}ms`);
  await page.close();
}

await inspectPage("/", { expectPublic: true });
await inspectPage("/auth", { expectPublic: true });
await inspectPage("/ai-app-game-website-builder", { expectPublic: true });

for (const route of ["/generate", "/projects", "/publishing-center"]) {
  await inspectPage(route, { expectAuthRedirect: true });
}

const authPage = await context.newPage();
const authResponse = await navigateAndSettle(authPage, `${baseUrl}/auth?next=https://evil.example/path`, "auth-safe-next");
assert.ok(authResponse, "Auth canonicalization must return a response");
const safeAuthUrl = new URL(authPage.url());
assert.equal(safeAuthUrl.origin, new URL(baseUrl).origin, "External next must never leave the LANERIQ AI origin");
assert.equal(safeAuthUrl.pathname, "/auth", "External next must remain on /auth");
assert.equal(safeAuthUrl.searchParams.get("next"), "/", "External next must canonicalize to /");

const emailInput = authPage.locator('input[type="email"]').first();
assert.equal(await emailInput.count(), 1, "Auth must expose an email input");
const emailMetrics = await emailInput.evaluate((element) => {
  const rect = element.getBoundingClientRect();
  const style = getComputedStyle(element);
  return { height: rect.height, fontSize: Number.parseFloat(style.fontSize || "0") };
});
assert.ok(emailMetrics.height >= 44, `Auth email input touch height must be >=44px, got ${emailMetrics.height}`);
assert.ok(emailMetrics.fontSize >= 16, `Auth email input font must be >=16px to avoid iOS auto-zoom, got ${emailMetrics.fontSize}`);
await emailInput.fill("mobile-browser-qa@example.invalid");
assert.equal(await emailInput.inputValue(), "mobile-browser-qa@example.invalid", "Auth email input must accept touch/mobile text entry");
await emailInput.fill("");

const submitButton = authPage.locator('button[type="submit"]').first();
if (await submitButton.count()) {
  const submitHeight = await submitButton.evaluate((element) => element.getBoundingClientRect().height);
  assert.ok(submitHeight >= 44, `Auth submit button touch height must be >=44px, got ${submitHeight}`);
}

await authPage.close();
await browser.close();

console.log(JSON.stringify({
  ok: true,
  baseUrl,
  emulatedDevice: "iPhone 13 mobile viewport via Chromium",
  browserEngine: "Chromium",
  pagesChecked: results.length + 1,
  results,
  authInput: emailMetrics,
}, null, 2));
console.log("✓ LANERIQ AI Production mobile-browser QA passed: rendering, mobile layout, auth safety, touch sizing and signed-out redirects are healthy");
console.log("ℹ This is Chromium mobile-emulation evidence only; it does not replace physical iPhone Safari/microphone/Photos/performance testing");
