export const dynamic = "force-dynamic";

const COMMIT_SHA = /^[0-9a-f]{40}$/i;

function buildIdentity() {
  const commitSha = String(process.env.VERCEL_GIT_COMMIT_SHA || "").trim();
  const commitRef = String(process.env.VERCEL_GIT_COMMIT_REF || "").trim();
  const environment = String(process.env.VERCEL_ENV || "").trim().toLowerCase();
  const exactProductionBuildVerified = environment === "production" && commitRef === "main" && COMMIT_SHA.test(commitSha);
  return Object.freeze({ commitSha, commitRef, environment, exactProductionBuildVerified });
}

function headers() {
  return {
    "Content-Type": "text/html; charset=utf-8",
    "Cache-Control": "private, no-store, max-age=0",
    "X-Robots-Tag": "noindex, nofollow, noarchive",
  };
}

function lockedHtml(build) {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><title>LANERIQ AI Production Closure — Locked</title></head><body style="margin:0;background:#020b08;color:#f5fff9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif"><main style="max-width:760px;margin:0 auto;padding:64px 20px"><p style="color:#d8bf62;font-weight:900;letter-spacing:.14em">LANERIQ AI · TRUTH GATE</p><h1>Production closure evidence is locked</h1><p style="line-height:1.6;color:#b7c9c0">This workflow can run only on an exact Vercel Production deployment built from <code>main</code> with a verifiable 40-character commit SHA. Preview, local and non-main deployments cannot execute Generate, Publish or Unpublish evidence.</p><pre style="white-space:pre-wrap;overflow-wrap:anywhere;padding:14px;border-radius:14px;background:#061410">${JSON.stringify(build, null, 2)}</pre></main></body></html>`;
}

const BASE_HTML = String.raw`<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover" />
<title>LANERIQ AI App Builder Production Closure E2E</title>
<style>
:root{color-scheme:dark}*{box-sizing:border-box}body{margin:0;background:radial-gradient(circle at 82% 0,#6e51db2e,transparent 28%),linear-gradient(145deg,#020a12,#071622 56%,#03110d);color:#f7f4e9;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}main{max-width:820px;margin:0 auto;padding:calc(28px + env(safe-area-inset-top)) 18px calc(50px + env(safe-area-inset-bottom))}.brand{font-size:12px;font-weight:900;letter-spacing:.16em;color:#e1bd58}.hero{margin:8px 0 20px}h1{font-size:clamp(30px,7vw,46px);line-height:1.02;margin:8px 0}p{color:#afbeb7;line-height:1.55}.card{padding:18px;border:1px solid #8d763d78;border-radius:22px;background:#071620de;box-shadow:0 28px 90px #0008;backdrop-filter:blur(16px)}textarea{width:100%;min-height:170px;padding:16px;border:1px solid #d9c98f;border-radius:16px;background:#f7f1e2;color:#17231f;font:inherit;font-size:16px;line-height:1.45;resize:vertical}.consent{display:flex;gap:12px;align-items:flex-start;margin:14px 0;padding:12px;border:1px solid #375d5b;border-radius:14px;background:#061a1a}.consent input{width:22px;height:22px;flex:0 0 22px}.consent label{font-size:14px;line-height:1.45;color:#c8d8d0}button,.link{width:100%;display:block;min-height:50px;margin-top:12px;padding:15px 18px;border-radius:16px;font:inherit;font-size:16px;font-weight:900;text-align:center;text-decoration:none;touch-action:manipulation}button{border:0;background:linear-gradient(135deg,#efcb64,#ad751c);color:#06110d}button:disabled{opacity:.44}.link{border:1px solid #496e7f;background:#0a2231;color:#ead078}#status,#report{margin-top:14px;padding:14px;border-radius:14px;white-space:pre-wrap;overflow-wrap:anywhere}#status{background:#071e2a;color:#d7e1dc;min-height:50px}#report{display:none;background:#020b11;border:1px solid #244151;font-size:12px;line-height:1.5}.ok{color:#78efa6!important}.bad{color:#ff9d94!important}.rule{margin-top:14px;padding:12px;border:1px solid #314e57;border-radius:14px;background:#061722;color:#b8c9c3;font-size:13px;line-height:1.5}.grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin-top:14px}.pill{padding:12px;border-radius:14px;background:#06151d;border:1px solid #243f4a}.pill span{display:block;font-size:11px;color:#8fa39b}.pill b{display:block;margin-top:4px;font-size:13px}button:focus-visible,.link:focus-visible,textarea:focus-visible,input:focus-visible{outline:3px solid #efca64;outline-offset:3px}@media(max-width:620px){.grid{grid-template-columns:1fr}.card{padding:15px}}@media(prefers-reduced-motion:reduce){*{animation:none!important;transition:none!important;scroll-behavior:auto!important}}
</style>
</head>
<body>
<main>
  <div class="brand">LANERIQ AI · APP BUILDER · PRODUCTION CLOSURE</div>
  <section class="hero"><h1>Generate → Preview → Publish → Unpublish</h1><p>One authenticated, zero-spend, exact-main Production journey that proves the same newly generated App + Website can be persisted, previewed, release-gated, published to anonymous users, and returned to private state.</p></section>
  <section class="card">
    <textarea id="idea">Create a polished mobile-first property CRM App and responsive customer Website with clients, properties, enquiries, appointments, notes and a clear contact journey.</textarea>
    <div class="consent"><input id="consent" type="checkbox" /><label for="consent"><b>I understand this test creates a real private project and briefly publishes that test project.</b><br/>LANERIQ AI will automatically unpublish it in a finally cleanup path. The generated project remains private afterward as evidence.</label></div>
    <button id="run" disabled>RUN FULL PRODUCTION CLOSURE</button>
    <a class="link" href="/auth?next=%2Fproduction-closure-e2e">Sign in / Verify Email</a>
    <div class="grid"><div class="pill"><span>Server Production SHA</span><b id="sha">—</b></div><div class="pill"><span>Evidence boundary</span><b>Authenticated browser · zero-spend</b></div></div>
    <div class="rule"><b>Truth boundary:</b> this proves LANERIQ App Builder Production browser behavior only. It does not prove a physical iPhone/Android device, a specific external AI provider, Apple/Google Store submission, Email delivery or SMS.</div>
    <div id="status">Ready. Sign in, review the consent, then run the full closure journey.</div>
    <pre id="report"></pre>
    <button id="copy" type="button" style="display:none;background:#0b2733;color:#e9d07b;border:1px solid #496e7f">COPY EVIDENCE REPORT</button>
  </section>
</main>
<script>
(function(){
  const SERVER_BUILD=Object.freeze(__EXPECTED_BUILD__);
  const COMMIT_SHA=/^[0-9a-f]{40}$/i;
  const idea=document.getElementById('idea');
  const consent=document.getElementById('consent');
  const run=document.getElementById('run');
  const status=document.getElementById('status');
  const report=document.getElementById('report');
  const copy=document.getElementById('copy');
  document.getElementById('sha').textContent=SERVER_BUILD.commitSha;

  consent.addEventListener('change',function(){run.disabled=!consent.checked});
  function setStatus(text,kind){status.textContent=text;status.className=kind||''}
  function showReport(value){report.style.display='block';report.textContent=JSON.stringify(value,null,2);copy.style.display='block'}
  function rid(prefix){try{return prefix+':'+crypto.randomUUID()}catch{return prefix+':'+Date.now()+':'+Math.random().toString(36).slice(2,10)}}
  async function readJson(response){const text=await response.text();try{return text?JSON.parse(text):{}}catch{return {raw:text}}}
  async function ownerJson(url,init){
    const options=Object.assign({credentials:'include',cache:'no-store',redirect:'manual',headers:{Accept:'application/json','Cache-Control':'no-store'}},init||{});
    options.headers=Object.assign({Accept:'application/json','Cache-Control':'no-store'},(init&&init.headers)||{});
    const response=await fetch(url,options);
    if(response.type==='opaqueredirect'||response.status===0){const e=new Error('Authentication redirect detected. Sign in again.');e.status=401;throw e}
    const data=await readJson(response);
    if(!response.ok){const e=new Error(data.error||('Request failed ('+response.status+')'));e.status=response.status;e.code=data.code||'';e.data=data;throw e}
    return data;
  }
  async function post(url,body,timeoutMs){
    const controller=new AbortController();const timer=setTimeout(function(){controller.abort()},timeoutMs||120000);
    try{return await ownerJson(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),signal:controller.signal})}finally{clearTimeout(timer)}
  }
  async function verifyExactProduction(){
    const data=await ownerJson('/api/build-info');
    const commitSha=String(data.commitSha||'').trim();const commitRef=String(data.commitRef||'').trim();const environment=String(data.environment||'').trim().toLowerCase();
    const ok=data.ok===true&&data.product==='LANERIQ AI'&&environment==='production'&&commitRef==='main'&&COMMIT_SHA.test(commitSha)&&commitSha===SERVER_BUILD.commitSha;
    if(!ok)throw new Error('Exact Production identity mismatch. Server='+SERVER_BUILD.commitSha+', runtime='+commitSha+', ref='+commitRef+', env='+environment+'.');
    return {commitSha:commitSha,commitRef:commitRef,environment:environment,exactProductionBuildVerified:true};
  }
  async function ownerHtml(path){
    const started=performance.now();const response=await fetch(path,{method:'GET',credentials:'include',cache:'no-store',redirect:'manual',headers:{'Cache-Control':'no-store'}});
    if(response.type==='opaqueredirect'||response.status===0)return {path:path,status:0,ok:false,authRedirect:true,elapsedMs:Math.round(performance.now()-started)};
    const text=await response.text();const type=response.headers.get('content-type')||'';const bad=/404: This page could not be found|Internal Server Error|Authentication required/i.test(text);
    return {path:path,status:response.status,ok:response.ok&&type.toLowerCase().includes('text/html')&&text.length>200&&!bad,bytes:new Blob([text]).size,contentType:type,elapsedMs:Math.round(performance.now()-started)};
  }
  async function anonymousProbe(path,nonce){
    const sep=path.indexOf('?')>=0?'&':'?';const url=path+sep+'laneriq_closure='+encodeURIComponent(nonce);const started=performance.now();
    const response=await fetch(url,{method:'GET',credentials:'omit',cache:'no-store',redirect:'manual',headers:{'Cache-Control':'no-store','Pragma':'no-cache'}});const text=await response.text().catch(function(){return ''});
    const location=response.headers.get('location')||'';const authRedirect=response.status>=300&&response.status<400&&/\/auth(?:\?|$)/.test(location);const notFound=response.status===404||/This page could not be found|NEXT_HTTP_ERROR_FALLBACK;404/i.test(text);const frameworkError=/__next_error__|Internal Server Error/i.test(text);
    return {path:path,status:response.status,notFound:notFound,authRedirect:authRedirect,frameworkError:frameworkError,bytes:new Blob([text]).size,elapsedMs:Math.round(performance.now()-started)};
  }
  function publicState(app){return app&&((app.publish_status==='published')||app.visibility==='listed'||app.visibility==='public'||Boolean(app.published_version_id))}
  async function publishAction(appId,versionId,action,requestId){return await post('/api/apps/'+encodeURIComponent(appId)+'/publish',{requestId:requestId,expectedVersionId:versionId,action:action},45000)}
  async function cleanup(appId,versionId,requestId){
    try{const value=await publishAction(appId,versionId,'unpublish',requestId);return {ok:true,result:value,versionId:versionId}}
    catch(first){
      try{const latest=await ownerJson('/api/apps/'+encodeURIComponent(appId));const latestVersion=latest&&latest.app&&latest.app.current_version_id;if(!latestVersion)throw first;const value=await publishAction(appId,latestVersion,'unpublish',rid('closure-unpublish-recovery'));return {ok:true,result:value,versionId:latestVersion,recoveredFromStaleVersion:latestVersion!==versionId}}
      catch(second){return {ok:false,error:(second&&second.message)||(first&&first.message)||'Cleanup failed.',code:(second&&second.code)||(first&&first.code)||''}}
    }
  }

  run.addEventListener('click',async function(){
    if(!consent.checked)return;const prompt=idea.value.trim();if(!prompt){setStatus('Enter an App + Website idea.','bad');return}
    run.disabled=true;report.style.display='none';copy.style.display='none';let reservationHeld=false;let createId='';let appId='';let versionId='';let publishAttempted=false;let cleanupResult=null;let after=null;let build=null;let lifecycleError=null;
    try{
      setStatus('1/10 Verifying exact Production main SHA…');build=await verifyExactProduction();
      setStatus('2/10 Planning the App + Website…');const planned=await post('/api/orchestrate',{idea:prompt,assetCount:0},45000);const plan=planned.plan||{};
      createId=rid('app-builder-closure');setStatus('3/10 Reserving zero-spend creation entitlement…');const reservation=await post('/api/production-e2e/zero-spend',{action:'reserve',requestId:createId},15000);if(reservation.zeroSpendOnly!==true||reservation.aiCreditsCharged!==0||reservation.projectCreditsCharged!==0)throw new Error('Zero-spend reservation contract failed.');reservationHeld=true;
      setStatus('4/10 Generating and atomically saving App + Website…');const buildIdea=[prompt,Array.isArray(plan.selectedModules)&&plan.selectedModules.length?'AUTONOMOUS MODULE PLAN: '+plan.selectedModules.join(', '):'',Array.isArray(plan.workflows)&&plan.workflows.length?'STARTER WORKFLOWS: '+plan.workflows.map(function(x){return x&&x.name}).filter(Boolean).join(', '):'','CLOSURE RULE: Create one coherent, functional, mobile-first App and responsive customer Website.','COST RULE: Do not require paid external providers.'].filter(Boolean).join('\n\n');
      const generated=await post('/api/generate',{idea:buildIdea,assetIds:[],requestId:createId,themeMode:'preset',themePreset:'luxury-gold',styleRequest:'Premium mobile-first responsive product UI with accessible controls and clear hierarchy.',wallpaperMode:'selected',wallpaperPreset:'moon-city'},150000);reservationHeld=false;appId=generated&&generated.app&&generated.app.id;versionId=generated&&generated.app&&generated.app.versionId;if(!appId||!versionId)throw new Error('Generate did not return persisted App/version identity.');
      setStatus('5/10 Verifying persisted exact version…');const persisted=await ownerJson('/api/apps/'+encodeURIComponent(appId));const versions=Array.isArray(persisted.versions)?persisted.versions:[];const exactVersion=versions.find(function(v){return v&&v.id===versionId});if(!persisted.app||persisted.app.id!==appId||persisted.app.current_version_id!==versionId||!exactVersion||!exactVersion.specification)throw new Error('Persisted exact-version verification failed.');
      setStatus('6/10 Verifying owner App + Website previews…');const appPreviewPath='/a/'+encodeURIComponent(appId)+'?demo=1';const websitePreviewPath='/website/'+encodeURIComponent(appId);const previews=await Promise.all([ownerHtml(appPreviewPath),ownerHtml(websitePreviewPath)]);if(!previews[0].ok||!previews[1].ok)throw new Error('Generated App or Website owner preview failed.');
      setStatus('7/10 Rechecking exact-version 100/100 release gate…');const quality=await ownerJson('/api/apps/'+encodeURIComponent(appId)+'/quality');if(quality.releaseReady!==true||!quality.version||quality.version.id!==versionId)throw new Error('Exact generated version is not release-ready.');
      setStatus('8/10 Proving private baseline, then publishing exact version…');const nonce=rid('closure-probe').replace(/:/g,'-');const before={app:await anonymousProbe('/a/'+encodeURIComponent(appId),nonce+'-before-app'),website:await anonymousProbe('/website/'+encodeURIComponent(appId),nonce+'-before-web')};if(!before.app.notFound||!before.website.notFound||before.app.authRedirect||before.website.authRedirect)throw new Error('Anonymous pre-publish baseline is not fail-closed 404.');publishAttempted=true;const publish=await publishAction(appId,versionId,'publish',rid('closure-publish'));if(!publish.app||publish.app.publish_status!=='published'||publish.app.published_version_id!==versionId)throw new Error('Publish did not pin the exact reviewed version.');
      setStatus('9/10 Verifying anonymous public App + Website…');const during={app:await anonymousProbe('/a/'+encodeURIComponent(appId),nonce+'-live-app'),website:await anonymousProbe('/website/'+encodeURIComponent(appId),nonce+'-live-web')};[during.app,during.website].forEach(function(p){if(p.status<200||p.status>=300||p.notFound||p.authRedirect||p.frameworkError||p.bytes<100)throw new Error('Published anonymous App/Website surface failed healthy 2xx verification.')});
      setStatus('10/10 Unpublishing and proving private state again…');cleanupResult=await cleanup(appId,versionId,rid('closure-unpublish'));if(!cleanupResult.ok)throw new Error('Automatic unpublish cleanup failed: '+cleanupResult.error);const finalDetail=await ownerJson('/api/apps/'+encodeURIComponent(appId));if(publicState(finalDetail.app))throw new Error('Project state remained public after cleanup.');after={app:await anonymousProbe('/a/'+encodeURIComponent(appId),nonce+'-after-app'),website:await anonymousProbe('/website/'+encodeURIComponent(appId),nonce+'-after-web')};if(!after.app.notFound||!after.website.notFound||after.app.authRedirect||after.website.authRedirect)throw new Error('Anonymous routes did not return to private 404 state.');
      const evidence={success:true,reportVersion:1,evidenceLevel:'AUTHENTICATED_PRODUCTION_APP_BUILDER_CLOSURE',generatedAt:new Date().toISOString(),build:build,zeroSpendOnly:true,aiCreditsCharged:0,projectCreditsCharged:0,planningVerified:true,generationVerified:generated.success===true,saveVerified:true,persistedExactVersionVerified:true,appPreviewVerified:previews[0].ok,websitePreviewVerified:previews[1].ok,releaseReadyVerified:true,publishExactVersionPinned:true,anonymousAppPublicVerified:true,anonymousWebsitePublicVerified:true,unpublishCleanupVerified:true,anonymousPrivateAfterCleanupVerified:true,writesExercised:true,project:{id:appId,name:(generated.app&&generated.app.name)||(generated.specification&&generated.specification.name)||null,versionId:versionId,remainsPrivateAfterTest:true},quality:{releaseReady:quality.releaseReady,target:quality.target||100,overall:quality.report&&quality.report.overall},before:before,during:during,after:after,cleanup:cleanupResult,safety:{userTriggered:true,initialProjectCreatedByThisRun:true,automaticUnpublishFinally:true,physicalDeviceVerified:false,originalGenerationProviderVerified:false,officialStoreSubmissionVerified:false,emailExercised:false,smsExercised:false}};setStatus('PASS — full App Builder Production closure completed and the generated test project is private again.','ok');showReport(evidence);return;
    }catch(err){lifecycleError=err;}
    finally{
      if(reservationHeld&&createId){try{await post('/api/production-e2e/zero-spend',{action:'release',requestId:createId},15000)}catch{}}
      if(publishAttempted&&appId&&versionId&&!cleanupResult?.ok){cleanupResult=await cleanup(appId,versionId,rid('closure-finally-unpublish'));if(cleanupResult.ok&&!after){const nonce=rid('closure-finally').replace(/:/g,'-');after={app:await anonymousProbe('/a/'+encodeURIComponent(appId),nonce+'-app').catch(function(e){return {error:e.message}}),website:await anonymousProbe('/website/'+encodeURIComponent(appId),nonce+'-web').catch(function(e){return {error:e.message}})}}}
      run.disabled=!consent.checked;
    }
    const cleaned=Boolean(!publishAttempted||(cleanupResult&&cleanupResult.ok&&after&&after.app&&after.app.notFound&&after.website&&after.website.notFound));const evidence={success:false,reportVersion:1,evidenceLevel:'AUTHENTICATED_PRODUCTION_APP_BUILDER_CLOSURE',generatedAt:new Date().toISOString(),build:build,error:lifecycleError&&lifecycleError.message||'Unknown failure',status:lifecycleError&&lifecycleError.status||0,project:{id:appId||null,versionId:versionId||null},cleanup:cleanupResult,after:after,safety:{zeroSpendOnly:true,aiCreditsCharged:0,projectCreditsCharged:0,automaticUnpublishFinally:true,cleanupVerified:cleaned,physicalDeviceVerified:false,originalGenerationProviderVerified:false,officialStoreSubmissionVerified:false,emailExercised:false,smsExercised:false}};setStatus((cleaned?'FAILED — cleanup is safe: ':'CRITICAL — cleanup could not be proven: ')+evidence.error,cleaned?'bad':'bad');showReport(evidence);
  });

  copy.addEventListener('click',async function(){try{await navigator.clipboard.writeText(report.textContent);setStatus('Evidence report copied.','ok')}catch{setStatus('Copy is unavailable in this browser. Select the report manually.','bad')}});
})();
</script>
</body>
</html>`;

export async function GET() {
  const build = buildIdentity();
  if (!build.exactProductionBuildVerified) return new Response(lockedHtml(build), { status: 200, headers: headers() });
  const safeBuild = JSON.stringify(build).replace(/</g, "\\u003c");
  return new Response(BASE_HTML.replace("__EXPECTED_BUILD__", safeBuild), { status: 200, headers: headers() });
}
