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

function assertAtLeast44(value,label){
  assert(Number(value)>=44,`${label} ${value}px is below 44px`);
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
  try{
    const response=await page.goto(`${baseUrl}/templates`,{waitUntil:"domcontentloaded",timeout:45000});
    assert.equal(response?.status(),200,`${entry.label} /templates must return 200`);
    await page.waitForLoadState("networkidle",{timeout:20000}).catch(()=>{});
    await page.waitForTimeout(250);

    // Public/signed-out pages must not mount private Account, Voice, Upload Ref or Studio controls.
    // This is an access-isolation proof, not an authenticated feature-interaction proof.
    for(const [selector,label] of [
      [".accountNav","Account chrome"],
      [".sv-fab","Voice Idea trigger"],
      [".sv-panel","Voice Idea panel"],
      [".referenceDock","Upload Ref workspace"],
      [".studioLauncher","Studio launcher"],
    ]) assert.equal(await page.locator(selector).count(),0,`${entry.label} public /templates must not expose private ${label}`);

    // Probe the deployed production CSS in-browser without pretending the protected components
    // were rendered or interacted with. The synthetic nodes are removed immediately after measurement.
    const cssProbe=await page.evaluate(()=>{
      const root=document.createElement("div");
      root.setAttribute("data-laneriq-private-feature-css-probe","true");
      root.style.cssText="position:fixed;left:-10000px;top:0;visibility:hidden;pointer-events:none";
      root.innerHTML=`
        <div class="accountNav"><button class="accountTrigger">A</button><button class="visibleLogout">Logout</button><div class="accountMenu"><button>Menu</button></div></div>
        <div class="sv-backdrop"><div class="sv-panel"><button class="sv-close">×</button><button class="sv-mic">Mic</button><button class="sv-play">Play</button><button class="sv-build">Build</button><textarea>Voice</textarea></div></div>
        <div class="referenceDock"><button class="trigger">Ref</button><div class="panel"><header><button>×</button></header><label class="upload">Upload</label></div></div>`;
      document.body.appendChild(root);
      const metric=(selector)=>{const el=root.querySelector(selector);const s=getComputedStyle(el);const r=el.getBoundingClientRect();return{width:Math.round(r.width),height:Math.round(r.height),minHeight:Number.parseFloat(s.minHeight||"0"),fontSize:Number.parseFloat(s.fontSize||"0"),zIndex:Number.parseInt(s.zIndex||"0",10)||0};};
      const out={
        accountTrigger:metric(".accountTrigger"),
        accountLogout:metric(".visibleLogout"),
        accountMenu:metric(".accountMenu button"),
        voiceClose:metric(".sv-close"),
        voiceMic:metric(".sv-mic"),
        voicePlay:metric(".sv-play"),
        voiceBuild:metric(".sv-build"),
        voiceTextarea:metric(".sv-panel textarea"),
        voiceBackdrop:metric(".sv-backdrop"),
        refTrigger:metric(".referenceDock>.trigger"),
        refClose:metric(".referenceDock .panel header>button"),
        refUpload:metric(".referenceDock .panel .upload"),
        refPanel:metric(".referenceDock .panel"),
        viewport:{width:innerWidth,height:innerHeight,scrollWidth:document.documentElement.scrollWidth},
      };
      root.remove();
      return out;
    });

    for(const [name,metric] of Object.entries({
      accountTrigger:cssProbe.accountTrigger,
      accountLogout:cssProbe.accountLogout,
      accountMenu:cssProbe.accountMenu,
      voiceClose:cssProbe.voiceClose,
      voiceMic:cssProbe.voiceMic,
      voicePlay:cssProbe.voicePlay,
      voiceBuild:cssProbe.voiceBuild,
      refTrigger:cssProbe.refTrigger,
      refClose:cssProbe.refClose,
      refUpload:cssProbe.refUpload,
    })) assertAtLeast44(Math.max(metric.minHeight,metric.height),`${entry.label} ${name} touch target`);
    assert(cssProbe.voiceTextarea.fontSize>=16,`${entry.label} Voice textarea font ${cssProbe.voiceTextarea.fontSize}px risks iOS zoom`);
    assert(cssProbe.refPanel.height>=cssProbe.viewport.height*.95,`${entry.label} Upload Ref CSS probe panel ${cssProbe.refPanel.height}px must use almost the full ${cssProbe.viewport.height}px viewport`);
    assert(cssProbe.viewport.scrollWidth<=cssProbe.viewport.width+1,`${entry.label} CSS probe creates horizontal overflow`);

    await page.screenshot({path:path.join(artifactDir,`${entry.id}-private-feature-isolation.png`),fullPage:false});
    results.push({
      id:entry.id,
      label:entry.label,
      evidenceLevel:"BROWSER_EMULATION",
      publicIsolation:{accountHidden:true,voiceHidden:true,uploadRefHidden:true,studioHidden:true},
      cssProbe:{touchTargetsAtLeast44:true,voiceInputFontAtLeast16:true,uploadRefViewportRuleActive:true,noHorizontalOverflow:true},
      account:{authenticatedAccountSurfaceVerified:false,logoutInteractionExercised:false},
      voiceIdea:{componentRendered:false,openInteractionExercised:false,microphoneCaptureExercised:false,speechRecognitionResultVerified:false},
      uploadRef:{componentRendered:false,openInteractionExercised:false,pickerInteractionExercised:false},
      authenticatedActionsExercised:false,
      permissionActionsExercised:false,
      passed:true,
    });
    console.log(`✓ ${entry.label}: public Account/Voice/Upload Ref/Studio isolation and deployed mobile CSS probes passed`);
  }finally{
    await context.close();
    await browser.close();
  }
}

await fs.writeFile(path.join(artifactDir,"feature-surfaces-report.json"),`${JSON.stringify({featureEvidenceVersion:3,evidenceLevel:"BROWSER_EMULATION",physicalDeviceVerified:false,authenticatedFeatureSurfacesVerified:false,authenticatedActionsExercised:false,permissionActionsExercised:false,productionUrl:baseUrl,buildInfo,generatedAt:new Date().toISOString(),results},null,2)}\n`,"utf8");
console.log("✓ Production browser evidence proves signed-out public isolation plus deployed CSS constraints; it does not pretend protected feature controls were rendered or clicked");
console.log("✓ Authenticated Account/Logout, protected Voice/Upload Ref rendering, physical iPhone microphone capture and Photos/Camera picker behavior remain separate LIVE/device-evidence gates");
