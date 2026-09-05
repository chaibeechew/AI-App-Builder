import {test,expect} from "@playwright/test";
import fs from "node:fs";

fs.mkdirSync("test-results",{recursive:true});

test("V7 measures WebGL but refuses to treat headless browser as a physical iPhone",async({page})=>{
  await page.goto("/landing/game-world-v7-device-evidence",{waitUntil:"networkidle",timeout:60000});
  await expect(page.getByTestId("v7-device-evidence-probe")).toBeVisible();
  await page.waitForFunction(()=>{
    const el=document.querySelector('[data-testid="gpu-status"]');
    return /WebGL[12] LIVE/.test(el?.getAttribute("data-api")||"")&&Number(el?.getAttribute("data-fps")||0)>0;
  },null,{timeout:30000});
  await page.getByLabel("Device claim").selectOption("iphone");
  await page.getByLabel("Consent to local device evidence").check();
  await page.waitForFunction(()=>window.__LANERIQ_V7_DEVICE_EVIDENCE__?.summary?.sampleCount>=3,null,{timeout:15000});
  const v6=await page.evaluate(()=>window.__LANERIQ_V6_EVIDENCE__);
  const v7=await page.evaluate(()=>window.__LANERIQ_V7_DEVICE_EVIDENCE__);
  expect(v6.browser.contextCreated).toBe(true);
  expect(["WebGL2","WebGL1"]).toContain(v6.browser.api);
  expect(v7.deviceClaim).toBe("iphone");
  expect(v7.environment.webdriver).toBe(true);
  expect(v7.summary.sampleCount).toBeGreaterThanOrEqual(3);
  expect(v7.summary.medianFps).toBeGreaterThan(0);
  expect(v7.truth.foregroundBrowserMeasured).toBe(false);
  expect(v7.truth.selfAttestedDevice).toBe(false);
  expect(v7.truth.nativeDeviceAttested).toBe(false);
  expect(v7.truth.realIosDeviceVerified).toBe(false);
  expect(v7.truth.realAndroidDeviceVerified).toBe(false);
  expect(v7.truth.measuredDeviceTemperature).toBe(false);
  expect(v7.privacy.rawUserAgentStored).toBe(false);
  expect(v7.privacy.ipStored).toBe(false);
  expect(v7.privacy.persistentFingerprintStored).toBe(false);
  fs.writeFileSync("test-results/game-world-v7-device-evidence.json",JSON.stringify({browser:v6,device:v7},null,2));
  await page.screenshot({path:"test-results/game-world-v7-device-evidence.png",fullPage:true});
});
