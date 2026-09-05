import { LANERIQ_18_PAGES } from "../../lib/product/laneriq-18-page-master.js";

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
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><title>LANERIQ AI Production Closure — Locked</title></head><body style="margin:0;background:#020b08;color:#f5fff9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif"><main style="max-width:760px;margin:0 auto;padding:64px 20px"><p style="color:#d8bf62;font-weight:900;letter-spacing:.14em">LANERIQ AI · TRUTH GATE</p><h1>Production closure evidence is locked</h1><p style="line-height:1.6;color:#b7c9c0">This workflow can run only on an exact Vercel Production deployment built from <code>main</code> with a verifiable 40-character commit SHA. Preview, local and non-main deployments cannot execute Generate, Modify, Database, Workflow, Publish or Unpublish evidence.</p><pre style="white-space:pre-wrap;overflow-wrap:anywhere;padding:14px;border-radius:14px;background:#061410">${JSON.stringify(build, null, 2)}</pre></main></body></html>`;
}

const BASE_HTML = String.raw`<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover" />
<title>LANERIQ AI App Builder Production Closure E2E</title>
<style>
:root{color-scheme:dark}*{box-sizing:border-box}body{margin:0;background:radial-gradient(circle at 82% 0,#6e51db2e,transparent 28%),linear-gradient(145deg,#020a12,#071622 56%,#03110d);color:#f7f4e9;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}main{max-width:860px;margin:0 auto;padding:calc(28px + env(safe-area-inset-top)) 18px calc(50px + env(safe-area-inset-bottom))}.brand{font-size:12px;font-weight:900;letter-spacing:.16em;color:#e1bd58}.hero{margin:8px 0 20px}h1{font-size:clamp(30px,7vw,46px);line-height:1.02;margin:8px 0}p{color:#afbeb7;line-height:1.55}.card{padding:18px;border:1px solid #8d763d78;border-radius:22px;background:#071620de;box-shadow:0 28px 90px #0008;backdrop-filter:blur(16px)}textarea{width:100%;min-height:170px;padding:16px;border:1px solid #d9c98f;border-radius:16px;background:#f7f1e2;color:#17231f;font:inherit;font-size:16px;line-height:1.45;resize:vertical}.consent{display:flex;gap:12px;align-items:flex-start;margin:14px 0;padding:12px;border:1px solid #375d5b;border-radius:14px;background:#061a1a}.consent input{width:22px;height:22px;flex:0 0 22px}.consent label{font-size:14px;line-height:1.45;color:#c8d8d0}button,.link{width:100%;display:block;min-height:50px;margin-top:12px;padding:15px 18px;border-radius:16px;font:inherit;font-size:16px;font-weight:900;text-align:center;text-decoration:none;touch-action:manipulation}button{border:0;background:linear-gradient(135deg,#efcb64,#ad751c);color:#06110d}button:disabled{opacity:.44}.link{border:1px solid #496e7f;background:#0a2231;color:#ead078}#status,#report{margin-top:14px;padding:14px;border-radius:14px;white-space:pre-wrap;overflow-wrap:anywhere}#status{background:#071e2a;color:#d7e1dc;min-height:50px}#report{display:none;background:#020b11;border:1px solid #244151;font-size:12px;line-height:1.5}.ok{color:#78efa6!important}.bad{color:#ff9d94!important}.rule{margin-top:14px;padding:12px;border:1px solid #314e57;border-radius:14px;background:#061722;color:#b8c9c3;font-size:13px;line-height:1.5}.grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin-top:14px}.pill{padding:12px;border-radius:14px;background:#06151d;border:1px solid #243f4a}.pill span{display:block;font-size:11px;color:#8fa39b}.pill b{display:block;margin-top:4px;font-size:13px}button:focus-visible,.link:focus-visible,textarea:focus-visible,input:focus-visible{outline:3px solid #efca64;outline-offset:3px}@media(max-width:620px){.grid{grid-template-columns:1fr}.card{padding:15px}}@media(prefers-reduced-motion:reduce){*{animation:none!important;transition:none!important;scroll-behavior:auto!important}}
</style>
</head>
<body>
<main>
  <div class="brand">LANERIQ AI · APP BUILDER · AUTHENTICATED PRODUCTION CLOSURE</div>
  <section class="hero"><h1>Plan → Build → Modify → Version → Data → Workflow → 18 Pages → Publish</h1><p>One authenticated exact-main Production journey that creates a real test project, validates versioned AI modification, database model rollback, workflow dry-run/idempotency, all 18 product routes, release readiness, brief anonymous publish, and automatic return to private state.</p></section>
  <section class="card">
    <textarea id="idea">Create a polished mobile-first property CRM App and responsive customer Website with clients, properties, enquiries, appointments, notes and a clear contact journey.</textarea>
    <div class="consent"><input id="consent" type="checkbox" /><label for="consent"><b>I understand this test creates and modifies a real private test project, saves database/workflow test metadata, and briefly publishes the exact reviewed version.</b><br/>Workflow execution uses Safe Test only. LANERIQ AI automatically disables the test workflow and unpublishes the project. The project remains private afterward as evidence.</label></div>
    <button id="run" disabled>RUN 18-STAGE PRODUCTION CLOSURE</button>
    <a class="link" href="/auth?next=%2Fproduction-closure-e2e">Sign in / Verify Email</a>
    <div class="grid"><div class="pill"><span>Server Production SHA</span><b id="sha">—</b></div><div class="pill"><span>Evidence boundary</span><b>Authenticated browser · no user credits · Safe Test workflows</b></div></div>
    <div class="rule"><b>Truth boundary:</b> this proves LANERIQ App Builder authenticated Production browser/API behavior and route availability. It does not claim physical-device execution, a specific external AI provider, physical database-table migration, Apple/Google Store submission, Email delivery, WhatsApp delivery or SMS.</div>
    <div id="status">Ready. Sign in, review the consent, then run the 18-stage closure journey.</div>
    <pre id="report"></pre>
    <button id="copy" type="button" style="display:none;background:#0b2733;color:#e9d07b;border:1px solid #496e7f">COPY EVIDENCE REPORT</button>
  </section>
</main>
<script>
(function(){
  const SERVER_BUILD=Object.freeze(__EXPECTED_BUILD__);
  const SURFACE_PAGES=Object.freeze(__SURFACE_PAGES__);
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
  function clone(value){return JSON.parse(JSON.stringify(value))}
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
  async function writeJson(method,url,body,timeoutMs){
    const controller=new AbortController();const timer=setTimeout(function(){controller.abort()},timeoutMs||120000);
    try{return await ownerJson(url,{method:method,headers:{'Content-Type':'application/json'},body:JSON.stringify(body||{}),signal:controller.signal})}finally{clearTimeout(timer)}
  }
  async function post(url,body,timeoutMs){return await writeJson('POST',url,body,timeoutMs)}
  async function patch(url,body,timeoutMs){return await writeJson('PATCH',url,body,timeoutMs)}
  async function verifyExactProduction(){
    const data=await ownerJson('/api/build-info');
    const commitSha=String(data.commitSha||'').trim();const commitRef=String(data.commitRef||'').trim();const environment=String(data.environment||'').trim().toLowerCase();
    const ok=data.ok===true&&data.product==='LANERIQ AI'&&environment==='production'&&commitRef==='main'&&COMMIT_SHA.test(commitSha)&&commitSha===SERVER_BUILD.commitSha;
    if(!ok)throw new Error('Exact Production identity mismatch. Server='+SERVER_BUILD.commitSha+', runtime='+commitSha+', ref='+commitRef+', env='+environment+'.');
    return {commitSha:commitSha,commitRef:commitRef,environment:environment,exactProductionBuildVerified:true};
  }
  async function ownerHtml(path){
    const controller=new AbortController();const timer=setTimeout(function(){controller.abort()},45000);const started=performance.now();
    try{const response=await fetch(path,{method:'GET',credentials:'include',cache:'no-store',redirect:'manual',headers:{'Cache-Control':'no-store'},signal:controller.signal});if(response.type==='opaqueredirect'||response.status===0)return {path:path,status:0,ok:false,authRedirect:true,elapsedMs:Math.round(performance.now()-started)};const text=await response.text();const type=response.headers.get('content-type')||'';const bad=/404: This page could not be found|Internal Server Error|Authentication required/i.test(text);return {path:path,status:response.status,ok:response.ok&&type.toLowerCase().includes('text/html')&&text.length>200&&!bad,bytes:new Blob([text]).size,contentType:type,elapsedMs:Math.round(performance.now()-started)}}finally{clearTimeout(timer)}
  }
  async function anonymousProbe(path,nonce){
    const sep=path.indexOf('?')>=0?'&':'?';const url=path+sep+'laneriq_closure='+encodeURIComponent(nonce);const started=performance.now();
    const response=await fetch(url,{method:'GET',credentials:'omit',cache:'no-store',redirect:'manual',headers:{'Cache-Control':'no-store','Pragma':'no-cache'}});const text=await response.text().catch(function(){return ''});
    const location=response.headers.get('location')||'';const authRedirect=response.status>=300&&response.status<400&&/\/auth(?:\?|$)/.test(location);const notFound=response.status===404||/This page could not be found|NEXT_HTTP_ERROR_FALLBACK;404/i.test(text);const frameworkError=/__next_error__|Internal Server Error/i.test(text);
    return {path:path,status:response.status,notFound:notFound,authRedirect:authRedirect,frameworkError:frameworkError,bytes:new Blob([text]).size,elapsedMs:Math.round(performance.now()-started)};
  }
  function publicState(app){return app&&((app.publish_status==='published')||app.visibility==='listed'||app.visibility==='public'||Boolean(app.published_version_id))}
  function resolveSurfacePath(page,appId,templateId){const id=Number(page&&page.id);const replacement=id===14?templateId:appId;return String(page&&page.route||'/').replace('[id]',encodeURIComponent(replacement||''))}
  async function verify18Pages(appId){
    const catalog=await ownerJson('/api/templates?limit=1');const templateId=Array.isArray(catalog.templates)&&catalog.templates[0]&&catalog.templates[0].id;if(!templateId)throw new Error('Template detail identity is unavailable for the 18-page probe.');
    if(!Array.isArray(SURFACE_PAGES)||SURFACE_PAGES.length!==18)throw new Error('Canonical 18-page surface definition is not exactly 18 pages.');
    const results=[];for(const page of SURFACE_PAGES){const path=resolveSurfacePath(page,appId,templateId);const result=await ownerHtml(path);results.push({id:page.id,name:page.name,path:path,status:result.status,ok:result.ok,bytes:result.bytes||0,elapsedMs:result.elapsedMs});if(!result.ok)throw new Error('Authenticated 18-page surface failed at page '+page.id+' '+page.name+' ('+path+', status '+result.status+').')}
    return {templateId:templateId,count:results.length,allHealthy:results.every(function(x){return x.ok}),results:results};
  }
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
    run.disabled=true;report.style.display='none';copy.style.display='none';let reservationHeld=false;let createId='';let appId='';let initialVersionId='';let modifiedVersionId='';let versionId='';let workflowId='';let workflowDisabled=false;let publishAttempted=false;let cleanupResult=null;let after=null;let build=null;let lifecycleError=null;let stage='not-started';
    try{
      stage='1/18';setStatus('1/18 Verifying exact Production main SHA…');build=await verifyExactProduction();
      stage='2/18';setStatus('2/18 Planning the App + Website…');const planned=await post('/api/orchestrate',{idea:prompt,assetCount:0},45000);const plan=planned.plan||{};
      createId=rid('app-builder-full-closure');stage='3/18';setStatus('3/18 Reserving zero-spend creation entitlement…');const reservation=await post('/api/production-e2e/zero-spend',{action:'reserve',requestId:createId},15000);if(reservation.zeroSpendOnly!==true||reservation.aiCreditsCharged!==0||reservation.projectCreditsCharged!==0)throw new Error('Zero-spend reservation contract failed.');reservationHeld=true;
      stage='4/18';setStatus('4/18 Generating and atomically saving App + Website…');const buildIdea=[prompt,Array.isArray(plan.selectedModules)&&plan.selectedModules.length?'AUTONOMOUS MODULE PLAN: '+plan.selectedModules.join(', '):'',Array.isArray(plan.workflows)&&plan.workflows.length?'STARTER WORKFLOWS: '+plan.workflows.map(function(x){return x&&x.name}).filter(Boolean).join(', '):'','CLOSURE RULE: Create one coherent, functional, mobile-first App and responsive customer Website.','COST RULE: Do not require paid external providers.'].filter(Boolean).join('\n\n');const generated=await post('/api/generate',{idea:buildIdea,assetIds:[],requestId:createId,themeMode:'preset',themePreset:'luxury-gold',styleRequest:'Premium mobile-first responsive product UI with accessible controls and clear hierarchy.',wallpaperMode:'selected',wallpaperPreset:'moon-city'},150000);reservationHeld=false;appId=generated&&generated.app&&generated.app.id;initialVersionId=generated&&generated.app&&generated.app.versionId;versionId=initialVersionId;if(!appId||!initialVersionId)throw new Error('Generate did not return persisted App/version identity.');
      stage='5/18';setStatus('5/18 Verifying persisted initial version…');const persisted=await ownerJson('/api/apps/'+encodeURIComponent(appId));const initialVersions=Array.isArray(persisted.versions)?persisted.versions:[];const exactInitial=initialVersions.find(function(v){return v&&v.id===initialVersionId});if(!persisted.app||persisted.app.id!==appId||persisted.app.current_version_id!==initialVersionId||!exactInitial||!exactInitial.specification)throw new Error('Persisted initial-version verification failed.');
      stage='6/18';setStatus('6/18 Verifying owner App + Website previews…');const appPreviewPath='/a/'+encodeURIComponent(appId);const websitePreviewPath='/website/'+encodeURIComponent(appId);const previews=await Promise.all([ownerHtml(appPreviewPath),ownerHtml(websitePreviewPath)]);if(!previews.every(function(x){return x.ok}))throw new Error('Owner App/Website preview verification failed.');
      stage='7/18';setStatus('7/18 Applying a no-user-credit AI modification and saving version 2…');const modified=await post('/api/modify',{appId:appId,expectedVersionId:initialVersionId,requestId:rid('closure-modify'),instruction:'Add a non-destructive VIP client status badge and a dashboard filter for VIP clients. Preserve every existing page, feature, data model, accessibility protection and visual quality.'},150000);modifiedVersionId=modified&&modified.version&&modified.version.id;if(modified.success!==true||!modifiedVersionId||modifiedVersionId===initialVersionId)throw new Error('AI Modify did not create a distinct saved version.');if(Number(modified&&modified.credits&&modified.credits.charged||0)!==0)throw new Error('AI Modify charged user credits during no-credits launch mode.');versionId=modifiedVersionId;
      stage='8/18';setStatus('8/18 Verifying append-only Version History and Undo rollback…');const afterModify=await ownerJson('/api/apps/'+encodeURIComponent(appId));const modifyVersions=Array.isArray(afterModify.versions)?afterModify.versions:[];if(afterModify.app.current_version_id!==modifiedVersionId||!modifyVersions.some(function(v){return v.id===initialVersionId})||!modifyVersions.some(function(v){return v.id===modifiedVersionId}))throw new Error('Version History did not preserve initial and modified versions.');const rollback=await post('/api/apps/'+encodeURIComponent(appId)+'/rollback',{versionId:initialVersionId,expectedCurrentVersionId:modifiedVersionId,requestId:rid('closure-version-rollback')},45000);const rollbackVersionId=rollback&&rollback.version&&rollback.version.id;if(rollback.success!==true||!rollbackVersionId||rollbackVersionId===initialVersionId||rollbackVersionId===modifiedVersionId)throw new Error('Undo rollback did not append a new rollback version.');versionId=rollbackVersionId;const afterRollback=await ownerJson('/api/apps/'+encodeURIComponent(appId));const rollbackVersions=Array.isArray(afterRollback.versions)?afterRollback.versions:[];if(afterRollback.app.current_version_id!==versionId||rollbackVersions.length<3||!rollbackVersions.some(function(v){return v.id===versionId}))throw new Error('Rollback version was not persisted as the current append-only version.');
      stage='9/18';setStatus('9/18 Building the safe no-code Database model…');const databaseV1=await post('/api/apps/'+encodeURIComponent(appId)+'/database',{},45000);const schemaV1=databaseV1&&databaseV1.model&&databaseV1.model.schema_json;if(databaseV1.success!==true||!schemaV1||schemaV1.providerHidden!==true||!Array.isArray(schemaV1.entities)||schemaV1.entities.length<1)throw new Error('Database Builder did not persist a safe provider-hidden model.');
      stage='10/18';setStatus('10/18 Evolving and rolling back the Database model safely…');const evolvedSchema=clone(schemaV1);delete evolvedSchema._history;evolvedSchema.entities=(Array.isArray(evolvedSchema.entities)?evolvedSchema.entities:[]).concat([{name:'closure_notes',fields:['id: uuid','owner_id: uuid','note: text','created_at: timestamptz'],note:'Production closure verification metadata only.'}]);const databaseV2=await post('/api/apps/'+encodeURIComponent(appId)+'/database',{schema:evolvedSchema},45000);if(databaseV2.success!==true||Number(databaseV2.version)<=Number(databaseV1.version))throw new Error('Database model evolution did not create a new version.');const databaseRollback=await post('/api/apps/'+encodeURIComponent(appId)+'/database/rollback',{version:Number(databaseV1.version)},45000);if(databaseRollback.success!==true||Number(databaseRollback.newVersion)<=Number(databaseV2.version)||Number(databaseRollback.restoredFrom)!==Number(databaseV1.version))throw new Error('Database model rollback did not restore the prior model as a new version.');
      stage='11/18';setStatus('11/18 Creating an owned Safe Test workflow…');const workflowCreate=await post('/api/apps/'+encodeURIComponent(appId)+'/workflows',{name:'LANERIQ Production Closure Safe Test',triggerType:'form_submitted',triggerConfig:{source:'production-closure'},actions:[{type:'save_crm',label:'Safe dry-run CRM save',config:{critical:true}}],enabled:true},45000);workflowId=workflowCreate&&workflowCreate.workflow&&workflowCreate.workflow.id;if(workflowCreate.success!==true||!workflowId)throw new Error('Workflow creation failed.');
      stage='12/18';setStatus('12/18 Running workflow Safe Test, replaying idempotently, then pausing it…');const workflowRunKey=rid('closure-workflow-run');const workflowRun=await post('/api/apps/'+encodeURIComponent(appId)+'/workflows/'+encodeURIComponent(workflowId)+'/run',{dryRun:true,idempotencyKey:workflowRunKey,payload:{name:'Production Closure Test',status:'vip'}},45000);if(workflowRun.success!==true||workflowRun.safeTest!==true||!Array.isArray(workflowRun.results)||workflowRun.results.some(function(x){return x.status!=='simulated'}))throw new Error('Workflow Safe Test did not stay fully simulated.');const workflowReplay=await post('/api/apps/'+encodeURIComponent(appId)+'/workflows/'+encodeURIComponent(workflowId)+'/run',{dryRun:true,idempotencyKey:workflowRunKey,payload:{name:'Production Closure Test',status:'vip'}},45000);if(workflowReplay.replayed!==true)throw new Error('Workflow idempotency replay was not proven.');const paused=await patch('/api/apps/'+encodeURIComponent(appId)+'/workflows',{workflowId:workflowId,enabled:false},30000);if(paused.success!==true||!paused.workflow||paused.workflow.enabled!==false)throw new Error('Test workflow could not be paused after evidence.');workflowDisabled=true;
      stage='13/18';setStatus('13/18 Verifying all 18 authenticated LANERIQ product routes…');const surfaceEvidence=await verify18Pages(appId);if(surfaceEvidence.count!==18||surfaceEvidence.allHealthy!==true)throw new Error('Authenticated 18-page route surface is incomplete.');
      stage='14/18';setStatus('14/18 Rechecking exact-current-version 100/100 release gate…');const quality=await ownerJson('/api/apps/'+encodeURIComponent(appId)+'/quality');if(quality.releaseReady!==true||!quality.version||quality.version.id!==versionId)throw new Error('Exact current version is not release-ready.');
      stage='15/18';setStatus('15/18 Proving anonymous private baseline…');const nonce=rid('closure-probe').replace(/:/g,'-');const before={app:await anonymousProbe('/a/'+encodeURIComponent(appId),nonce+'-before-app'),website:await anonymousProbe('/website/'+encodeURIComponent(appId),nonce+'-before-web')};if(!before.app.notFound||!before.website.notFound||before.app.authRedirect||before.website.authRedirect)throw new Error('Anonymous pre-publish baseline is not fail-closed 404.');
      stage='16/18';setStatus('16/18 Publishing the exact reviewed current version…');publishAttempted=true;const publish=await publishAction(appId,versionId,'publish',rid('closure-publish'));if(!publish.app||publish.app.publish_status!=='published'||publish.app.published_version_id!==versionId)throw new Error('Publish did not pin the exact reviewed version.');
      stage='17/18';setStatus('17/18 Verifying anonymous public App + Website…');const during={app:await anonymousProbe('/a/'+encodeURIComponent(appId),nonce+'-live-app'),website:await anonymousProbe('/website/'+encodeURIComponent(appId),nonce+'-live-web')};[during.app,during.website].forEach(function(p){if(p.status<200||p.status>=300||p.notFound||p.authRedirect||p.frameworkError||p.bytes<100)throw new Error('Published anonymous App/Website surface failed healthy 2xx verification.')});
      stage='18/18';setStatus('18/18 Unpublishing and proving private state again…');cleanupResult=await cleanup(appId,versionId,rid('closure-unpublish'));if(!cleanupResult.ok)throw new Error('Automatic unpublish cleanup failed: '+cleanupResult.error);const finalDetail=await ownerJson('/api/apps/'+encodeURIComponent(appId));if(publicState(finalDetail.app))throw new Error('Project state remained public after cleanup.');after={app:await anonymousProbe('/a/'+encodeURIComponent(appId),nonce+'-after-app'),website:await anonymousProbe('/website/'+encodeURIComponent(appId),nonce+'-after-web')};if(!after.app.notFound||!after.website.notFound||after.app.authRedirect||after.website.authRedirect)throw new Error('Anonymous routes did not return to private 404 state.');
      const evidence={success:true,reportVersion:2,evidenceLevel:'AUTHENTICATED_PRODUCTION_APP_BUILDER_FULL_CLOSURE_V2',generatedAt:new Date().toISOString(),build:build,zeroSpendCreationVerified:true,userCreditsCharged:0,projectCreditsCharged:0,planningVerified:true,generationVerified:generated.success===true,saveVerified:true,initialVersionVerified:true,appPreviewVerified:previews[0].ok,websitePreviewVerified:previews[1].ok,modifyVerified:true,modifyCreatedNewVersion:true,modifyUserCreditsCharged:0,versionHistoryVerified:true,appendOnlyUndoRollbackVerified:true,databaseModelVerified:true,databaseVersioningVerified:true,databaseRollbackVerified:true,workflowCreatedVerified:true,workflowSafeTestVerified:true,workflowIdempotencyReplayVerified:true,workflowDisabledAfterTest:workflowDisabled,authenticated18PageRoutesVerified:surfaceEvidence.allHealthy,authenticated18PageRouteCount:surfaceEvidence.count,releaseReadyVerified:true,publishExactVersionPinned:true,anonymousAppPublicVerified:true,anonymousWebsitePublicVerified:true,unpublishCleanupVerified:true,anonymousPrivateAfterCleanupVerified:true,writesExercised:true,project:{id:appId,name:(generated.app&&generated.app.name)||(generated.specification&&generated.specification.name)||null,initialVersionId:initialVersionId,modifiedVersionId:modifiedVersionId,currentVersionId:versionId,remainsPrivateAfterTest:true},quality:{releaseReady:quality.releaseReady,target:quality.target||100,overall:quality.report&&quality.report.overall},surfaces:surfaceEvidence,before:before,during:during,after:after,cleanup:cleanupResult,safety:{userTriggered:true,initialProjectCreatedByThisRun:true,automaticUnpublishFinally:true,workflowDryRunOnly:true,workflowExternalActionsTriggered:false,databasePhysicalMigrationClaimed:false,physicalDeviceVerified:false,originalGenerationProviderVerified:false,officialStoreSubmissionVerified:false,emailExercised:false,whatsappExercised:false,smsExercised:false}};setStatus('PASS — 18-stage authenticated Production closure completed and the generated test project is private again.','ok');showReport(evidence);return;
    }catch(err){lifecycleError=err;}
    finally{
      if(reservationHeld&&createId){try{await post('/api/production-e2e/zero-spend',{action:'release',requestId:createId},15000)}catch{}}
      if(workflowId&&!workflowDisabled&&appId){try{const paused=await patch('/api/apps/'+encodeURIComponent(appId)+'/workflows',{workflowId:workflowId,enabled:false},30000);workflowDisabled=Boolean(paused&&paused.success&&paused.workflow&&paused.workflow.enabled===false)}catch{}}
      if(publishAttempted&&appId&&versionId&&!cleanupResult?.ok){cleanupResult=await cleanup(appId,versionId,rid('closure-finally-unpublish'));if(cleanupResult.ok&&!after){const nonce=rid('closure-finally').replace(/:/g,'-');after={app:await anonymousProbe('/a/'+encodeURIComponent(appId),nonce+'-app').catch(function(e){return {error:e.message}}),website:await anonymousProbe('/website/'+encodeURIComponent(appId),nonce+'-web').catch(function(e){return {error:e.message}})}}}
      run.disabled=!consent.checked;
    }
    const cleaned=Boolean(!publishAttempted||(cleanupResult&&cleanupResult.ok&&after&&after.app&&after.app.notFound&&after.website&&after.website.notFound));const evidence={success:false,reportVersion:2,evidenceLevel:'AUTHENTICATED_PRODUCTION_APP_BUILDER_FULL_CLOSURE_V2',generatedAt:new Date().toISOString(),stage:stage,build:build,error:lifecycleError&&lifecycleError.message||'Unknown failure',status:lifecycleError&&lifecycleError.status||0,project:{id:appId||null,initialVersionId:initialVersionId||null,modifiedVersionId:modifiedVersionId||null,currentVersionId:versionId||null},workflow:{id:workflowId||null,disabledAfterTest:workflowDisabled},cleanup:cleanupResult,after:after,safety:{zeroSpendCreationExpected:true,userCreditsChargedExpected:0,projectCreditsChargedExpected:0,workflowDryRunOnly:true,workflowExternalActionsTriggered:false,automaticUnpublishFinally:true,cleanupVerified:cleaned,physicalDeviceVerified:false,originalGenerationProviderVerified:false,officialStoreSubmissionVerified:false,emailExercised:false,whatsappExercised:false,smsExercised:false}};setStatus((cleaned?'FAILED — cleanup is safe: ':'CRITICAL — cleanup could not be proven: ')+evidence.error,'bad');showReport(evidence);
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
  const safeSurfacePages = JSON.stringify(LANERIQ_18_PAGES.map(({ id, name, route }) => ({ id, name, route }))).replace(/</g, "\\u003c");
  return new Response(BASE_HTML.replace("__EXPECTED_BUILD__", safeBuild).replace("__SURFACE_PAGES__", safeSurfacePages), { status: 200, headers: headers() });
}
