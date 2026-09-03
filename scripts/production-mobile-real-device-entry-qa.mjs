import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { devices, webkit } from "playwright";

const baseUrl = String(process.env.LANERIQ_PRODUCTION_URL || "https://laneriq-ai.vercel.app").replace(/\/$/, "");
const expectedSha = String(process.env.LANERIQ_EXPECTED_SHA || "").trim();
const artifactDir = path.resolve("artifacts/production-mobile-browser-qa");
const reportPath = path.join(artifactDir, "real-device-entry-report.json");

await fs.mkdir(artifactDir, { recursive: true });

async function productionBuild() {
  const response = await fetch(`${baseUrl}/api/build-info`, { cache: "no-store", headers: { Accept: "application/json", "Cache-Control": "no-cache" } });
  const body = await response.json().catch(() => ({}));
  assert.equal(response.status, 200, "Production build-info must return HTTP 200");
  assert.equal(body?.ok, true, "Production build-info must report ok=true");
  assert.equal(body?.product, "LANERIQ AI", "Production build must identify LANERIQ AI");
  if (expectedSha) assert.equal(body?.commitSha, expectedSha, `Production SHA ${body?.commitSha || "unknown"} does not match ${expectedSha}`);
  return body;
}

const build = await productionBuild();
const browser = await webkit.launch({ headless: true });
const device = devices["iPhone 13"];
assert(device, "Playwright iPhone 13 device descriptor is required");
const context = await browser.newContext({ ...device, locale: "en-MY", timezoneId: "Asia/Kuala_Lumpur" });
const page = await context.newPage();
const pageErrors = [];
const consoleErrors = [];
page.on("pageerror", (error) => pageErrors.push(String(error?.message || error)));
page.on("console", (message) => { if (message.type() === "error") consoleErrors.push(message.text()); });

try {
  const response = await page.goto(`${baseUrl}/mobile-readiness`, { waitUntil: "domcontentloaded", timeout: 45_000 });
  assert(response, "Mobile readiness navigation must return a response");
  assert.equal(response.status(), 200, "Mobile readiness must return HTTP 200");
  await page.waitForLoadState("networkidle", { timeout: 20_000 }).catch(() => {});

  const reportField = page.locator('textarea[aria-label="Mobile readiness evidence report"]');
  await reportField.waitFor({ state: "visible", timeout: 20_000 });
  await page.waitForFunction(() => {
    const field = document.querySelector('textarea[aria-label="Mobile readiness evidence report"]');
    return field && field.value.trim().startsWith("{");
  }, { timeout: 20_000 });
  const readiness = JSON.parse(await reportField.inputValue());

  assert.equal(readiness.reportVersion, 2, "Mobile readiness report version must be 2");
  assert.equal(readiness.evidenceLevel, "REAL_DEVICE_SELF_TEST", "Mobile readiness must label itself as the real-device self-test surface");
  assert.equal(readiness.physicalDeviceVerified, false, "Browser emulation must never claim physical-device verification");
  assert.equal(readiness.permissionPromptsTriggered, false, "Initial Production readiness load must not trigger permission prompts");
  for (const key of ["microphone", "photoLibrary", "camera"]) {
    assert.equal(readiness.interactiveEvidence?.[key]?.status, "not-run", `${key} must remain not-run until a real user taps it`);
  }

  const buttonNames = ["Test microphone", "Test Photos", "Test camera"];
  const touchTargets = [];
  for (const name of buttonNames) {
    const button = page.getByRole("button", { name, exact: true });
    await button.waitFor({ state: "visible", timeout: 10_000 });
    const box = await button.boundingBox();
    assert(box, `${name} must have a measurable touch target`);
    assert(box.width >= 44 && box.height >= 44, `${name} is ${Math.round(box.width)}×${Math.round(box.height)}px; minimum is 44×44px`);
    touchTargets.push({ name, width: Math.round(box.width), height: Math.round(box.height) });
  }

  const pickerContract = await page.evaluate(() => {
    const photos = document.querySelector("[data-mobile-photo-probe]");
    const camera = document.querySelector("[data-mobile-camera-probe]");
    return {
      photos: photos ? { type: photos.getAttribute("type"), accept: photos.getAttribute("accept"), capture: photos.getAttribute("capture") } : null,
      camera: camera ? { type: camera.getAttribute("type"), accept: camera.getAttribute("accept"), capture: camera.getAttribute("capture") } : null,
      horizontalOverflow: document.documentElement.scrollWidth > window.innerWidth + 1,
    };
  });
  assert.equal(pickerContract.photos?.type, "file", "Photos probe must use a local file input");
  assert.equal(pickerContract.photos?.accept, "image/*", "Photos probe must be image-scoped");
  assert.equal(pickerContract.photos?.capture, null, "Photos probe must not force camera capture");
  assert.equal(pickerContract.camera?.type, "file", "Camera probe must use a local file input");
  assert.equal(pickerContract.camera?.accept, "image/*", "Camera probe must be image-scoped");
  assert.equal(pickerContract.camera?.capture, "environment", "Camera probe must request the rear-camera capture path");
  assert.equal(pickerContract.horizontalOverflow, false, "Mobile readiness must not overflow horizontally");
  assert.deepEqual(pageErrors, [], `Mobile readiness page errors: ${pageErrors.join(" | ")}`);
  assert.deepEqual(consoleErrors, [], `Mobile readiness console errors: ${consoleErrors.join(" | ")}`);

  const evidence = {
    evidenceVersion: 1,
    evidenceLevel: "BROWSER_EMULATION",
    product: "LANERIQ AI",
    generatedAt: new Date().toISOString(),
    productionUrl: baseUrl,
    build: { commitSha: build.commitSha, commitRef: build.commitRef, environment: build.environment },
    browserProfile: "WebKit · iPhone 13",
    deployedRealDeviceEntryVerified: true,
    physicalDeviceVerified: false,
    permissionActionsExercised: false,
    microphoneCaptureExercised: false,
    pickerInteractionExercised: false,
    touchTargets,
    pickerContract,
    initialInteractiveEvidence: readiness.interactiveEvidence,
    pageErrors,
    consoleErrors,
  };
  await page.screenshot({ path: path.join(artifactDir, "webkit-iphone13-real-device-entry.png"), fullPage: true });
  await fs.writeFile(reportPath, `${JSON.stringify(evidence, null, 2)}\n`, "utf8");
  console.log("✓ Production WebKit/iPhone 13 exposes real-device microphone, Photos and rear-camera test entries at 44px+");
  console.log("✓ Initial page load triggers no permissions and browser emulation remains explicitly physicalDeviceVerified=false");
} finally {
  await context.close();
  await browser.close();
}
