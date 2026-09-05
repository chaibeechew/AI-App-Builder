import {test,expect} from "@playwright/test";
import fs from "node:fs";

fs.mkdirSync("test-results",{recursive:true});

test("V6 creates a real browser graphics context and sustained frames",async({page})=>{
  await page.goto("/landing/game-world-v6-evidence",{waitUntil:"networkidle",timeout:60000});
  await expect(page.getByTestId("v6-evidence-probe")).toBeVisible();
  const status=page.getByTestId("gpu-status");
  await expect(status).toBeVisible();
  await page.waitForFunction(()=>{
    const el=document.querySelector('[data-testid="gpu-status"]');
    const api=el?.getAttribute("data-api")||"";
    const fps=Number(el?.getAttribute("data-fps")||0);
    return /WebGL[12] LIVE/.test(api)&&fps>0;
  },null,{timeout:30000});
  const canvas=page.getByTestId("runtime-v6-canvas");
  const box=await canvas.boundingBox();
  expect(box?.width||0).toBeGreaterThan(300);
  expect(box?.height||0).toBeGreaterThan(300);
  await page.waitForFunction(()=>window.__LANERIQ_V6_EVIDENCE__?.summary?.sampleCount>=3,null,{timeout:15000});
  const evidence=await page.evaluate(()=>window.__LANERIQ_V6_EVIDENCE__);
  expect(evidence.browser.contextCreated).toBe(true);
  expect(["WebGL2","WebGL1"]).toContain(evidence.browser.api);
  expect(evidence.truth.browserRuntimeVerified).toBe(true);
  expect(evidence.truth.measuredBrowserFpsVerified).toBe(true);
  expect(evidence.truth.realDeviceFpsVerified).toBe(false);
  expect(evidence.truth.realDeviceThermalVerified).toBe(false);
  expect(evidence.truth.productionRuntimeVerified).toBe(false);
  expect(evidence.summary.sampleCount).toBeGreaterThanOrEqual(3);
  expect(evidence.summary.medianFps).toBeGreaterThan(0);
  expect(evidence.summary.maxResidentChunks).toBeGreaterThan(0);
  fs.writeFileSync("test-results/game-world-v6-runtime-evidence.json",JSON.stringify(evidence,null,2));
  await page.screenshot({path:"test-results/game-world-v6-runtime.png",fullPage:true});
});
