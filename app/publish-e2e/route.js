import { createClient } from "../../lib/supabase/server.js";

export const dynamic = "force-dynamic";

const html = String.raw`<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover" />
<title>LANERIQ AI Publish Production E2E</title>
<style>
  :root{color-scheme:dark}
  *{box-sizing:border-box}
  body{margin:0;background:radial-gradient(circle at 80% 2%,#7d5be42f,transparent 28%),linear-gradient(145deg,#020b16,#071725 58%,#03120e);color:#f7f4e9;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
  main{max-width:820px;margin:0 auto;padding:calc(24px + env(safe-area-inset-top)) 18px calc(48px + env(safe-area-inset-bottom))}
  .brand{font-size:12px;font-weight:900;letter-spacing:.18em;color:#e5c45f;margin-bottom:9px}
  h1{font-size:clamp(28px,7vw,42px);line-height:1.04;margin:0 0 10px}
  p{color:#aebdb7;line-height:1.55}
  .card{margin-top:18px;padding:18px;border:1px solid #9c7f3675;border-radius:22px;background:#071521dd;box-shadow:0 26px 80px #0008;backdrop-filter:blur(16px)}
  label{display:block;margin:4px 0 8px;color:#dce7e1;font-weight:800}
  select,button,.link{width:100%;min-height:50px;border-radius:15px;font:inherit;font-size:16px;touch-action:manipulation}
  select{padding:12px 14px;border:1px solid #607c88;background:#071d2c;color:#f6f3e8}
  button{margin-top:14px;border:0;padding:15px 18px;background:linear-gradient(135deg,#efcb62,#aa6a13);color:#06100c;font-weight:900;cursor:pointer}
  button:disabled{opacity:.45;cursor:not-allowed}
  .link{display:block;margin-top:12px;padding:14px 18px;text-align:center;text-decoration:none;background:#0c2436;color:#ebd47f;border:1px solid #466b7e;font-weight:800}
  .rule{margin-top:14px;padding:13px;border:1px solid #345565;border-radius:14px;background:#061824;color:#b8cac3;font-size:13px;line-height:1.5}
  #status,#result{margin-top:14px;padding:14px;border-radius:14px;white-space:pre-wrap;overflow-wrap:anywhere}
  #status{background:#091f2e;color:#d8e3de;min-height:50px}
  #result{display:none;background:#020b12;border:1px solid #223f52}
  .ok{color:#76efa5}.bad{color:#ff9f94}.muted{font-size:12px;color:#84958d}
  button:focus-visible,.link:focus-visible,select:focus-visible{outline:3px solid #f0ce69;outline-offset:3px}
  @media(max-width:560px){.card{padding:15px}h1{font-size:30px}}
  @media(prefers-reduced-motion:reduce){*{animation:none!important;transition:none!important;scroll-behavior:auto!important}}
</style>
</head>
<body>
<main>
  <div class="brand">LANERIQ AI · APP BUILDER · PRODUCTION EVIDENCE</div>
  <h1>Publish → Public URL → Unpublish</h1>
  <p>This authenticated runner uses the normal LANERIQ AI Publish API. It publishes the exact current project version only after the existing 100-point release gate passes, verifies the App and Website anonymously, then unpublishes and proves both public routes are hidden again.</p>
  <div class="card">
    <label for="project">Draft project</label>
    <select id="project"><option value="">Loading your projects…</option></select>
    <button id="run" disabled>RUN PUBLISH CYCLE</button>
    <a class="link" href="/quick-test">CREATE A FRESH TEST PROJECT FIRST</a>
    <a class="link" href="/production-e2e">OPEN READ-ONLY EVIDENCE CENTER</a>
    <div class="rule"><b>Truth boundary:</b> this runner does not generate provider evidence, send Email/SMS, submit to Apple/Google, or claim a physical-device result. It only proves the authenticated Web Publish cycle on the exact Production main build.</div>
    <div id="status">Loading owned draft projects…</div>
    <div id="result"></div>
  </div>
  <p class="muted">Projects already published are deliberately excluded. If a failure occurs after this runner publishes a project, it attempts a normal API unpublish cleanup before reporting failure.</p>
</main>
<script>
(function(){
  const project=document.getElementById('project');
  const run=document.getElementById('run');
  const status=document.getElementById('status');
  const result=document.getElementById('result');
  const COMMIT_SHA=/^[0-9a-f]{40}$/i;
  let projects=[];

  function setStatus(text,kind){status.textContent=text;status.className=kind||'';}
  function show(value){result.style.display='block';result.textContent=JSON.stringify(value,null,2);}
  function requestId(suffix){
    let token='';
    try{token=crypto.randomUUID()}catch{token=String(Date.now())+'-'+Math.random().toString(16).slice(2)}
    return 'publish-e2e-'+token+'-'+suffix;
  }
  async function readJson(response){const text=await response.text();try{return text?JSON.parse(text):{}}catch{return{raw:text}}}
  async function getJson(url,timeoutMs=30000){
    const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),timeoutMs);
    try{
      const response=await fetch(url,{method:'GET',credentials:'same-origin',cache:'no-store',redirect:'manual',headers:{Accept:'application/json','Cache-Control':'no-cache'},signal:controller.signal});
      if(response.type==='opaqueredirect'||response.status===0){const error=new Error('Authentication redirect detected. Sign in again.');error.status=401;throw error}
      const data=await readJson(response);if(!response.ok){const error=new Error(data.error||('Request failed ('+response.status+')'));error.status=response.status;error.data=data;throw error}return data;
    }finally{clearTimeout(timer)}
  }
  async function post(url,body,timeoutMs=45000){
    const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),timeoutMs);
    try{
      const response=await fetch(url,{method:'POST',credentials:'same-origin',cache:'no-store',headers:{'Content-Type':'application/json','Cache-Control':'no-cache'},body:JSON.stringify(body),signal:controller.signal});
      const data=await readJson(response);if(!response.ok){const error=new Error(data.error||('Request failed ('+response.status+')'));error.status=response.status;error.data=data;throw error}return data;
    }finally{clearTimeout(timer)}
  }
  async function verifyExactProductionBuild(){
    const data=await getJson('/api/build-info',15000);
    const commitSha=String(data.commitSha||'').trim();
    const commitRef=String(data.commitRef||'').trim();
    const environment=String(data.environment||'').trim().toLowerCase();
    const exactProductionBuildVerified=data.ok===true&&data.product==='LANERIQ AI'&&environment==='production'&&commitRef==='main'&&COMMIT_SHA.test(commitSha);
    if(!exactProductionBuildVerified)throw new Error('Production evidence is locked to an exact main deployment. Detected environment='+environment+', ref='+commitRef+', sha='+commitSha+'.');
    return{commitSha,commitRef,environment,exactProductionBuildVerified};
  }
  async function anonymousProbe(url){
    const started=performance.now();
    const response=await fetch(url,{method:'GET',credentials:'omit',cache:'no-store',redirect:'manual',headers:{'Cache-Control':'no-cache'}});
    const text=await response.text();
    const type=response.headers.get('content-type')||'';
    const bad=/404: This page could not be found|Internal Server Error|Authentication required/i.test(text);
    const visible=response.ok&&type.toLowerCase().includes('text/html')&&text.length>250&&!bad;
    return{url,status:response.status,visible,hidden:response.status===404,elapsedMs:Math.round(performance.now()-started),bytes:new Blob([text]).size,contentType:type};
  }
  async function loadProjects(){
    try{
      const data=await getJson('/api/apps');
      projects=Array.isArray(data.apps)?data.apps:[];
      project.replaceChildren();
      const candidates=projects.filter(item=>item&&item.id&&item.current_version_id&&item.publish_status!=='published'&&!item.published_version_id);
      if(!candidates.length){const option=document.createElement('option');option.value='';option.textContent='No draft project is ready — create one with Quick Test';project.appendChild(option);run.disabled=true;setStatus('No unpublished project with a current version is available. Create a fresh App + Website first.');return}
      for(const item of candidates){const option=document.createElement('option');option.value=item.id;option.textContent=(item.name||'Untitled project')+' · '+String(item.id).slice(0,8);project.appendChild(option)}
      run.disabled=false;setStatus('Ready. Choose a draft project and run the exact-version Publish cycle.');
    }catch(error){project.replaceChildren();const option=document.createElement('option');option.value='';option.textContent='Unable to load projects';project.appendChild(option);run.disabled=true;setStatus('AUTH / ACCESS: '+(error.message||String(error)),'bad')}
  }

  run.addEventListener('click',async()=>{
    const appId=String(project.value||'').trim();if(!appId){setStatus('Choose a draft project first.','bad');return}
    run.disabled=true;result.style.display='none';
    let versionId='';let publishedByRunner=false;let publishRequestId='';let unpublishRequestId='';
    try{
      setStatus('1/7 Verifying exact Production main build…');
      const build=await verifyExactProductionBuild();

      setStatus('2/7 Verifying owned draft and exact current version…');
      const before=await getJson('/api/apps/'+encodeURIComponent(appId));
      const app=before.app||{};versionId=String(app.current_version_id||'').trim();
      if(!versionId)throw new Error('Selected project has no current version.');
      if(app.publish_status==='published'||app.published_version_id)throw new Error('Selected project is already published. This runner only starts from a draft/private state.');
      const version=(Array.isArray(before.versions)?before.versions:[]).find(item=>item&&item.id===versionId);
      if(!version||!version.specification)throw new Error('Exact current project version could not be verified.');

      const appPath='/a/'+encodeURIComponent(appId);const websitePath='/website/'+encodeURIComponent(appId);
      setStatus('3/7 Proving anonymous routes are hidden before Publish…');
      const [beforeApp,beforeWebsite]=await Promise.all([anonymousProbe(appPath),anonymousProbe(websitePath)]);
      if(!beforeApp.hidden||!beforeWebsite.hidden)throw new Error('Draft project unexpectedly resolved on an anonymous public route. Publish cycle stopped.');

      setStatus('4/7 Publishing exact reviewed version through normal release gate…');
      publishRequestId=requestId('publish');
      const published=await post('/api/apps/'+encodeURIComponent(appId)+'/publish',{requestId:publishRequestId,expectedVersionId:versionId,action:'publish'},60000);
      if(published.success!==true||published.app?.published_version_id!==versionId||published.version?.id!==versionId||published.version?.published!==true)throw new Error('Publish response did not prove an exact published-version pin.');
      publishedByRunner=true;

      setStatus('5/7 Verifying anonymous App + Website are public…');
      const [publicApp,publicWebsite]=await Promise.all([anonymousProbe(appPath),anonymousProbe(websitePath)]);
      if(!publicApp.visible||!publicWebsite.visible)throw new Error('Published App or Website did not resolve anonymously.');

      setStatus('6/7 Unpublishing through the normal exact-version API…');
      unpublishRequestId=requestId('unpublish');
      const unpublished=await post('/api/apps/'+encodeURIComponent(appId)+'/publish',{requestId:unpublishRequestId,expectedVersionId:versionId,action:'unpublish'},60000);
      if(unpublished.success!==true||unpublished.app?.published_version_id)throw new Error('Unpublish did not clear the published-version pin.');
      publishedByRunner=false;

      setStatus('7/7 Proving state and anonymous routes returned to private…');
      const after=await getJson('/api/apps/'+encodeURIComponent(appId));
      const restored=after.app||{};
      if(restored.publish_status==='published'||restored.published_version_id||restored.visibility==='public'||restored.visibility==='listed')throw new Error('Project did not return to a private draft state after Unpublish.');
      const [afterApp,afterWebsite]=await Promise.all([anonymousProbe(appPath),anonymousProbe(websitePath)]);
      if(!afterApp.hidden||!afterWebsite.hidden)throw new Error('Anonymous App or Website remained visible after Unpublish.');

      const report={
        success:true,
        reportVersion:1,
        evidenceLevel:'AUTHENTICATED_PRODUCTION_PUBLISH_CYCLE',
        exactProductionBuildVerified:true,
        authenticatedOwnerFlowVerified:true,
        exactPublishedVersionPinVerified:true,
        anonymousPublicAppVerified:true,
        anonymousPublicWebsiteVerified:true,
        unpublishVerified:true,
        anonymousHiddenAfterUnpublishVerified:true,
        privateDraftRestorationVerified:true,
        physicalDeviceVerified:false,
        originalGenerationProviderVerified:false,
        officialStoreSubmissionVerified:false,
        storeSubmissionExercised:false,
        emailExercised:false,
        smsExercised:false,
        build,
        appId,
        versionId,
        publishRequestId,
        unpublishRequestId,
        releaseQuality:published.quality||null,
        releaseTarget:published.target||null,
        before:{app:beforeApp,website:beforeWebsite},
        public:{app:publicApp,website:publicWebsite},
        after:{app:afterApp,website:afterWebsite},
        releasePath:'/release/'+appId
      };
      setStatus('SUCCESS — exact-version Publish → anonymous App/Website → Unpublish cycle verified on Production.','ok');show(report);
    }catch(error){
      let cleanup=null;
      if(publishedByRunner&&appId){
        try{
          const latest=await getJson('/api/apps/'+encodeURIComponent(appId),15000);
          const cleanupVersion=String(latest.app?.current_version_id||versionId||'').trim();
          if(cleanupVersion){cleanup=await post('/api/apps/'+encodeURIComponent(appId)+'/publish',{requestId:requestId('cleanup-unpublish'),expectedVersionId:cleanupVersion,action:'unpublish'},45000);publishedByRunner=false}
        }catch(cleanupError){cleanup={success:false,error:cleanupError.message||String(cleanupError)}}
      }
      setStatus('FAILED: '+(error.message||String(error)),'bad');
      show({success:false,reportVersion:1,evidenceLevel:'AUTHENTICATED_PRODUCTION_PUBLISH_CYCLE',error:error.message||String(error),status:error.status||0,details:error.data||null,cleanup,physicalDeviceVerified:false,originalGenerationProviderVerified:false,officialStoreSubmissionVerified:false,emailExercised:false,smsExercised:false});
    }finally{run.disabled=false;loadProjects()}
  });

  loadProjects();
})();
</script>
</body>
</html>`;

export async function GET(request) {
  const supabase=await createClient();
  const {data:{user},error}=await supabase.auth.getUser();
  if(error||!user)return Response.redirect(new URL("/auth?next=%2Fpublish-e2e",request.url),303);
  if(!user.confirmed_at&&!user.email_confirmed_at&&!user.phone_confirmed_at)return new Response("Account verification is required before Production Publish evidence can run.",{status:403,headers:{"content-type":"text/plain; charset=utf-8","cache-control":"private, no-store, max-age=0"}});
  return new Response(html,{status:200,headers:{"content-type":"text/html; charset=utf-8","cache-control":"private, no-store, max-age=0","pragma":"no-cache","x-robots-tag":"noindex, nofollow","x-content-type-options":"nosniff"}});
}
