import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { chromium, devices, webkit } from "playwright";

const baseUrl=String(process.env.LANERIQ_PRODUCTION_URL||"https://laneriq-ai.vercel.app").replace(/\/$/,"");
const expectedSha=String(process.env.LANERIQ_EXPECTED_SHA||"").trim();
const artifactDir=path.resolve("artifacts/production-mobile-browser-qa");
await fs.mkdir(artifactDir,{recursive:true});

async function verifyBuild(){
  const response=await fetch(`${baseUrl}/api/build-info`,{headers:{Accept:"application/json","Cache-Control":"no-cache"},cache:"no-store"});
  const body=await response.json();
  assert.equal(response.status,200,"build-info must be public and healthy");
  assert.equal(body?.product,"LANERIQ AI");
  if(expectedSha)assert.equal(body?.commitSha,expectedSha,`Production commit ${body?.commitSha||"unknown"} must match ${expectedSha}`);
  return body;
}

function atLeast44(size,label){
  assert(Number(size?.width)>=44,`${label} width ${size?.width}px is below 44px`);
  assert(Number(size?.height)>=44,`${label} height ${size?.height}px is below 44px`);
}

async function box(page,selector){
  return page.locator(selector).evaluate(el=>{const r=el.getBoundingClientRect();return{width:Math.round(r.width),height:Math.round(r.height),fontSize:Number.parseFloat(getComputedStyle(el).fontSize||"0")};});
}

async function layerOrder(page, modalSelector){
  return page.evaluate((selector)=>{
    const modal=document.querySelector(selector);
    const language=document.querySelector(".laneriqLangButton.floating");
    return {
      modalZ:Number.parseInt(getComputedStyle(modal).zIndex||"0",10)||0,
      languageZ:language?(Number.parseInt(getComputedStyle(language).zIndex||"0",10)||0):0,
    };
  },modalSelector);
}

const buildInfo=await verifyBuild();
const matrix=[
  {id:"webkit-iphone13",label:"WebKit · iPhone 13",browserType:webkit,device:devices["iPhone 13"]},
  {id:"chromium-pixel5",label:"Chromium · Pixel 5",browserType:chromium,device:devices["Pixel 5"]},
];
const results=[];

for(const entry of matrix){
  const browser=await entry.browserType.launch({headless:true});
  const context=await browser.newContext({...entry.device,locale:"en-MY",timezoneId:"Asia/Kuala_Lumpur",colorScheme:"dark"});
  const page=await context.newPage();
  await page.addInitScript(()=>{
    window.__laneriqQaCaptureCalls=0;
    try{
      const media=navigator.mediaDevices;
      if(media?.getUserMedia){
        const original=media.getUserMedia.bind(media);
        media.getUserMedia=(...args)=>{window.__laneriqQaCaptureCalls+=1;return original(...args);};
      }
    }catch{}
  });

  try{
    const response=await page.goto(`${baseUrl}/templates`,{waitUntil:"domcontentloaded",timeout:45000});
    assert.equal(response?.status(),200,`${entry.label} /templates must return 200`);
    await page.waitForLoadState("networkidle",{timeout:20000}).catch(()=>{});
    await page.waitForTimeout(300);

    // Signed-out Account behavior only. This browser-emulation run intentionally does not
    // authenticate or execute Logout, so the report must never label Logout as verified.
    assert.equal(await page.locator(".accountNav").count(),0,`${entry.label} signed-out public route must not expose account chrome`);
    const accountCss=await page.evaluate(()=>{
      const shell=document.createElement("div");
      shell.className="accountNav";
      shell.style.cssText="position:fixed;left:-10000px;top:0;visibility:hidden";
      shell.innerHTML='<button class="accountTrigger">A</button><button class="visibleLogout">Logout</button><div class="accountMenu"><button>Menu</button></div>';
      document.body.appendChild(shell);
      const measure=selector=>{const el=shell.querySelector(selector);const s=getComputedStyle(el);return{minHeight:Number.parseFloat(s.minHeight||"0"),touchAction:s.touchAction}};
      const out={trigger:measure(".accountTrigger"),logout:measure(".visibleLogout"),menu:measure(".accountMenu button")};
      shell.remove();
      return out;
    });
    for(const [name,value] of Object.entries(accountCss))assert(value.minHeight>=44,`${entry.label} Account ${name} min-height ${value.minHeight}px is below 44px`);

    const voiceTrigger=page.locator(".sv-fab");
    await voiceTrigger.waitFor({state:"visible",timeout:15000});
    atLeast44(await box(page,".sv-fab"),`${entry.label} Voice Idea trigger`);
    await voiceTrigger.click();
    const voicePanel=page.locator(".sv-panel");
    await voicePanel.waitFor({state:"visible",timeout:10000});
    for(const [selector,label] of [[".sv-close","Voice close"],[".sv-mic","Voice microphone"],[".sv-play","Voice playback"],[".sv-build","Voice build"]])atLeast44(await box(page,selector),`${entry.label} ${label}`);
    const voiceTextarea=await box(page,".sv-panel textarea");
    assert(voiceTextarea.fontSize>=16,`${entry.label} Voice transcript font ${voiceTextarea.fontSize}px risks iOS zoom`);
    const voiceViewport=await page.evaluate(()=>({innerWidth,scrollWidth:document.documentElement.scrollWidth,captureCalls:window.__laneriqQaCaptureCalls||0}));
    assert(voiceViewport.scrollWidth<=voiceViewport.innerWidth+1,`${entry.label} Voice dialog creates horizontal overflow`);
    assert.equal(voiceViewport.captureCalls,0,`${entry.label} opening Voice Idea must not request microphone capture`);
    const voiceLayers=await layerOrder(page,".sv-backdrop");
    assert(voiceLayers.modalZ>voiceLayers.languageZ,`${entry.label} Voice modal z-index ${voiceLayers.modalZ} must exceed floating Language control ${voiceLayers.languageZ}`);
    await voicePanel.screenshot({path:path.join(artifactDir,`${entry.id}-voice-idea-open.png`)});
    await page.locator(".sv-close").click();
    await voicePanel.waitFor({state:"hidden",timeout:5000});

    const refTrigger=page.locator(".referenceDock>.trigger");
    await refTrigger.waitFor({state:"visible",timeout:10000});
    atLeast44(await box(page,".referenceDock>.trigger"),`${entry.label} Upload Ref trigger`);
    await refTrigger.click();
    const refPanelLocator=page.locator(".referenceDock .panel");
    await refPanelLocator.waitFor({state:"visible",timeout:10000});
    for(const [selector,label] of [[".referenceDock .panel header>button","Reference close"],[".referenceDock .panel .upload","Reference upload"]])atLeast44(await box(page,selector),`${entry.label} ${label}`);
    const refPanel=await refPanelLocator.evaluate(el=>{const r=el.getBoundingClientRect();return{height:Math.round(r.height),viewport:window.innerHeight,scrollWidth:document.documentElement.scrollWidth,innerWidth:window.innerWidth};});
    assert(refPanel.height>=refPanel.viewport*.95,`${entry.label} Upload Ref mobile panel must use the viewport instead of a cramped floating sheet`);
    assert(refPanel.scrollWidth<=refPanel.innerWidth+1,`${entry.label} Upload Ref panel creates horizontal overflow`);
    assert.equal(await page.evaluate(()=>window.__laneriqQaCaptureCalls||0),0,`${entry.label} opening Upload Ref must not request media capture`);
    const referenceLayers=await layerOrder(page,".referenceDock");
    assert(referenceLayers.modalZ>referenceLayers.languageZ,`${entry.label} Upload Ref modal z-index ${referenceLayers.modalZ} must exceed floating Language control ${referenceLayers.languageZ}`);
    await refPanelLocator.screenshot({path:path.join(artifactDir,`${entry.id}-upload-ref-open.png`)});
    await page.locator(".referenceDock .panel header>button").click();
    await refPanelLocator.waitFor({state:"hidden",timeout:5000});

    results.push({
      id:entry.id,
      label:entry.label,
      evidenceLevel:"BROWSER_EMULATION",
      account:{
        signedOutChromeHidden:true,
        touchTargetsAtLeast44:true,
        authenticatedAccountSurfaceVerified:false,
        logoutInteractionExercised:false,
      },
      voiceIdea:{
        openedWithoutCapture:true,
        touchTargetsAtLeast44:true,
        inputFontAtLeast16:true,
        noHorizontalOverflow:true,
        modalAboveFloatingUtilities:true,
        closeInteractionPassed:true,
        microphoneCaptureExercised:false,
        speechRecognitionResultVerified:false,
      },
      uploadRef:{
        openedWithoutCapture:true,
        viewportPanel:true,
        touchTargetsAtLeast44:true,
        noHorizontalOverflow:true,
        modalAboveFloatingUtilities:true,
        closeInteractionPassed:true,
        pickerInteractionExercised:false,
      },
      passed:true,
    });
    console.log(`✓ ${entry.label}: signed-out Account surface, Voice Idea UI and Upload Ref UI checks passed`);
  }finally{
    await context.close();
    await browser.close();
  }
}

await fs.writeFile(path.join(artifactDir,"feature-surfaces-report.json"),`${JSON.stringify({featureEvidenceVersion:2,evidenceLevel:"BROWSER_EMULATION",physicalDeviceVerified:false,authenticatedActionsExercised:false,permissionActionsExercised:false,productionUrl:baseUrl,buildInfo,generatedAt:new Date().toISOString(),results},null,2)}\n`,"utf8");
console.log("✓ Three mobile UI surfaces passed Production browser emulation without authenticated Logout or microphone/camera/file-picker permission actions");
console.log("✓ Feature modals stay above floating utility controls and both close actions are pointer-accessible in the evidence matrix");
console.log("✓ Authenticated Account/Logout, physical iPhone microphone capture and Photos/Camera picker behavior remain separate LIVE/device-evidence gates");
