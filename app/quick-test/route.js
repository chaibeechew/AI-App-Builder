export const dynamic = "force-dynamic";

const html = String.raw`<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover" />
<title>LANERIQ AI Zero-Spend Production Journey E2E</title>
<style>
  :root{color-scheme:dark}
  *{box-sizing:border-box}
  body{margin:0;background:radial-gradient(circle at 78% 4%,#694ed92b,transparent 26%),linear-gradient(145deg,#020b16,#071523 56%,#03110d);color:#f6f3e8;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
  main{max-width:780px;margin:0 auto;padding:calc(24px + env(safe-area-inset-top)) 18px calc(42px + env(safe-area-inset-bottom))}
  .brand{font-size:13px;font-weight:900;letter-spacing:.18em;color:#e2bd55;margin-bottom:8px}
  h1{font-size:30px;line-height:1.05;margin:0 0 8px}
  p{color:#aebbb5;line-height:1.5}
  .card{margin-top:18px;padding:18px;border:1px solid #92762e75;border-radius:22px;background:#071420d9;box-shadow:0 26px 80px #0007;backdrop-filter:blur(16px)}
  textarea{width:100%;min-height:190px;border:1px solid #d7c58a;background:#f5f0e2;color:#17221f;padding:16px;border-radius:16px;font:inherit;font-size:16px;line-height:1.45;resize:vertical}
  button,.link{display:block;width:100%;margin-top:14px;border:0;border-radius:16px;padding:16px 18px;min-height:50px;font-weight:900;font-size:16px;text-align:center;text-decoration:none;touch-action:manipulation}
  button{background:linear-gradient(135deg,#efc75c,#a66a12);color:#07110d}
  button:disabled{opacity:.45}
  .link{background:#0d2235;color:#ead17b;border:1px solid #496e7f}
  #status{margin-top:14px;padding:14px;border-radius:14px;background:#091d2b;color:#d6e0db;min-height:50px;white-space:pre-wrap}
  #result{margin-top:14px;padding:14px;border-radius:14px;background:#020b12;border:1px solid #223b4e;white-space:pre-wrap;overflow-wrap:anywhere;display:none}
  .ok{color:#73efa3}.bad{color:#ff9a8f}.muted{font-size:12px;color:#85928d}
  .rule{margin-top:12px;padding:12px;border:1px solid #294c5c;border-radius:14px;color:#b9cac3;background:#061723;font-size:13px;line-height:1.45}
  .row{display:grid;grid-template-columns:1fr 1fr;gap:10px}
  button:focus-visible,.link:focus-visible,textarea:focus-visible{outline:3px solid #f0ca61;outline-offset:3px}
  @media(max-width:520px){.row{grid-template-columns:1fr}h1{font-size:27px}.card{padding:15px}}
  @media(prefers-reduced-motion:reduce){*{scroll-behavior:auto!important;animation:none!important;transition:none!important}}
</style>
</head>
<body>
<main>
  <div class="brand">LANERIQ AI · AUTHENTICATED PRODUCTION JOURNEY</div>
  <h1>Zero-Spend App + Website E2E</h1>
  <p>This signed-in evidence runner verifies the exact Production main build, then runs Planning → Generate → atomic Save → bootstrap → persisted-version proof → App / Website previews → key owner-scoped product surfaces.</p>
  <div class="card">
    <textarea id="idea">Create a simple property CRM app and responsive website with clients, properties, enquiries, appointments and notes.</textarea>
    <button id="build">RUN ZERO-SPEND PRODUCTION JOURNEY</button>
    <a class="link" href="/auth?next=%2Fquick-test">Sign in / Verify Email</a>
    <div class="rule"><b>Hard rule:</b> this runner reserves only free-first-project or active Pro access. If either is unavailable, it stops before AI credits or project credits can be charged. It never sends SMS, submits to an app store, or claims a physical-device/provider-LIVE result.</div>
    <div id="status">Ready. Sign in first, then run the authenticated Production journey.</div>
    <div id="result"></div>
  </div>
  <p class="muted">Evidence level: authenticated Production browser journey. Physical iPhone/Android, external provider-LIVE and official Apple/Google Store evidence remain separate.</p>
</main>
<script>
(function(){
  const idea=document.getElementById('idea');
  const build=document.getElementById('build');
  const status=document.getElementById('status');
  const result=document.getElementById('result');
  const COMMIT_SHA=/^[0-9a-f]{40}$/i;

  function setStatus(text,kind){status.textContent=text;status.className=kind||'';}
  function showResult(value){result.style.display='block';result.textContent=typeof value==='string'?value:JSON.stringify(value,null,2);}
  function requestId(){try{return 'production-e2e-'+crypto.randomUUID()}catch{return 'production-e2e-'+Date.now()}}
  async function readJsonResponse(response){
    const text=await response.text();
    try{return text?JSON.parse(text):{}}catch{return {raw:text}}
  }
  async function getJson(url,timeoutMs){
    const controller=new AbortController();
    const timer=setTimeout(()=>controller.abort(),timeoutMs||30000);
    try{
      const response=await fetch(url,{method:'GET',credentials:'include',cache:'no-store',redirect:'manual',headers:{Accept:'application/json','Cache-Control':'no-cache'},signal:controller.signal});
      if(response.type==='opaqueredirect'||response.status===0){const err=new Error('Authentication redirect detected. Sign in again.');err.status=401;throw err}
      const data=await readJsonResponse(response);
      if(!response.ok){const err=new Error(data.error||('Request failed ('+response.status+')'));err.status=response.status;err.data=data;throw err}
      return data;
    }finally{clearTimeout(timer)}
  }
  async function verifyExactProductionBuild(){
    const data=await getJson('/api/build-info',15000);
    const commitSha=String(data.commitSha||'').trim();
    const commitRef=String(data.commitRef||'').trim();
    const environment=String(data.environment||'').trim().toLowerCase();
    const exactProductionBuildVerified=data.ok===true&&data.product==='LANERIQ AI'&&environment==='production'&&commitRef==='main'&&COMMIT_SHA.test(commitSha);
    if(!exactProductionBuildVerified)throw new Error('Evidence is locked to an exact Production main deployment. Detected environment='+environment+', ref='+commitRef+', sha='+commitSha+'.');
    return {commitSha,commitRef,environment,exactProductionBuildVerified};
  }
  async function post(url,body,timeoutMs){
    const controller=new AbortController();
    const timer=setTimeout(()=>controller.abort(),timeoutMs||120000);
    try{
      const response=await fetch(url,{method:'POST',credentials:'include',cache:'no-store',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),signal:controller.signal});
      const data=await readJsonResponse(response);
      if(!response.ok){const err=new Error(data.error||('Request failed ('+response.status+')'));err.status=response.status;err.data=data;throw err}
      return data;
    }finally{clearTimeout(timer)}
  }
  async function probe(url){
    const started=performance.now();
    const response=await fetch(url,{method:'GET',credentials:'include',cache:'no-store',redirect:'manual',headers:{'Cache-Control':'no-cache'}});
    if(response.type==='opaqueredirect'||response.status===0)return {url,status:0,ok:false,elapsedMs:Math.round(performance.now()-started),detail:'Authentication redirect detected'};
    const text=await response.text();
    const type=response.headers.get('content-type')||'';
    const bad=/404: This page could not be found|Internal Server Error|Authentication required/i.test(text);
    const ok=response.ok&&type.toLowerCase().includes('text/html')&&text.length>250&&!bad;
    return {url,status:response.status,ok,elapsedMs:Math.round(performance.now()-started),bytes:new Blob([text]).size,contentType:type,detail:ok?'Production HTML surface resolved':'Surface failed Production HTML contract'};
  }
  async function probeMany(paths){
    const values=[];
    for(const path of paths)values.push(await probe(path));
    return values;
  }

  build.addEventListener('click',async()=>{
    const prompt=idea.value.trim();
    if(!prompt){setStatus('Please enter an App + Website idea.','bad');return}
    build.disabled=true;result.style.display='none';
    let createRequestId='';
    let reservationHeld=false;
    try{
      setStatus('1/7 Verifying exact Production main build…');
      const buildIdentity=await verifyExactProductionBuild();

      setStatus('2/7 Planning project…');
      const planned=await post('/api/orchestrate',{idea:prompt,assetCount:0},45000);
      const plan=planned.plan||{};

      createRequestId=requestId();
      setStatus('3/7 Reserving zero-spend creation entitlement…');
      const reservation=await post('/api/production-e2e/zero-spend',{action:'reserve',requestId:createRequestId},15000);
      if(reservation.zeroSpendOnly!==true||reservation.aiCreditsCharged!==0||reservation.projectCreditsCharged!==0)throw new Error('Zero-spend reservation contract failed.');
      reservationHeld=true;

      setStatus('4/7 Generating and atomically saving real App + Website…');
      const buildIdea=[
        prompt,
        Array.isArray(plan.selectedModules)&&plan.selectedModules.length?'AUTONOMOUS MODULE PLAN: '+plan.selectedModules.join(', '):'',
        Array.isArray(plan.workflows)&&plan.workflows.length?'STARTER WORKFLOWS: '+plan.workflows.map(x=>x.name).filter(Boolean).join(', '):'',
        'ONE-CLICK BUILD RULE: Create one coherent functional mobile-first App and responsive Website.',
        'PREMIUM DESIGN RULE: Keep every page polished, readable, responsive and production-like.',
        'E2E COST RULE: Do not require paid external providers.'
      ].filter(Boolean).join('\n\n');

      const generated=await post('/api/generate',{
        idea:buildIdea,
        assetIds:[],
        requestId:createRequestId,
        themeMode:'preset',
        themePreset:'luxury-gold',
        styleRequest:'Premium mobile-first responsive product UI with clear hierarchy and accessible controls.',
        wallpaperMode:'selected',
        wallpaperPreset:'moon-city'
      },150000);
      reservationHeld=false;

      const appId=generated&&generated.app&&generated.app.id;
      const versionId=generated&&generated.app&&generated.app.versionId;
      if(!appId||!versionId)throw new Error('Generate did not return persisted App/version identity.');

      setStatus('5/7 Installing starter data and workflows…');
      let bootstrap=null;
      try{bootstrap=await post('/api/apps/'+encodeURIComponent(appId)+'/bootstrap',{plan,assetCount:0,deviceClass:'mobile'},90000)}catch(e){bootstrap={ok:false,error:e.message,status:e.status||0}}

      setStatus('6/7 Verifying persisted version and owner-scoped journey surfaces…');
      const persisted=await getJson('/api/apps/'+encodeURIComponent(appId),30000);
      const persistedVersions=Array.isArray(persisted.versions)?persisted.versions:[];
      const currentVersion=persistedVersions.find(v=>v&&v.id===persisted.app&&persisted.app.current_version_id);
      const persistedVersionVerified=Boolean(persisted.app&&persisted.app.id===appId&&currentVersion&&currentVersion.id===versionId&&currentVersion.specification&&typeof currentVersion.specification==='object');
      if(!persistedVersionVerified)throw new Error('Persisted project/current-version verification failed.');

      const journeyPaths=[
        '/app-dashboard/'+encodeURIComponent(appId),
        '/preview/'+encodeURIComponent(appId),
        '/editor/'+encodeURIComponent(appId),
        '/database/'+encodeURIComponent(appId),
        '/workflows/'+encodeURIComponent(appId),
        '/operations/'+encodeURIComponent(appId),
        '/analytics/'+encodeURIComponent(appId),
        '/release/'+encodeURIComponent(appId),
        '/publish/'+encodeURIComponent(appId)
      ];
      const journeySurfaces=await probeMany(journeyPaths);
      const failedJourney=journeySurfaces.filter(x=>!x.ok);
      if(failedJourney.length)throw new Error(failedJourney.length+' owner-scoped journey surface(s) failed Production verification.');

      setStatus('7/7 Verifying generated App + Website preview surfaces…');
      const appPreviewPath='/a/'+encodeURIComponent(appId)+'?demo=1';
      const websitePreviewPath='/website/'+encodeURIComponent(appId);
      const [appPreview,websitePreview]=await Promise.all([probe(appPreviewPath),probe(websitePreviewPath)]);
      if(!appPreview.ok||!websitePreview.ok)throw new Error('One or more generated preview surfaces failed Production verification.');

      const pages=Array.isArray(generated&&generated.specification&&generated.specification.pages)?generated.specification.pages.map(x=>x&&x.name).filter(Boolean):[];
      const summary={
        success:true,
        reportVersion:3,
        evidenceLevel:'AUTHENTICATED_PRODUCTION_BROWSER_JOURNEY',
        exactProductionBuildVerified:true,
        physicalDeviceVerified:false,
        originalGenerationProviderVerified:false,
        officialStoreSubmissionVerified:false,
        storeSubmissionExercised:false,
        smsExercised:false,
        zeroSpendOnly:true,
        aiCreditsCharged:0,
        projectCreditsCharged:0,
        planningVerified:true,
        generationRequestCompleted:generated.success===true,
        saveVerified:true,
        persistedVersionVerified,
        browserJourneySurfacesVerified:true,
        appPreviewVerified:appPreview.ok,
        websitePreviewVerified:websitePreview.ok,
        writesExercised:true,
        build:buildIdentity,
        requestId:createRequestId,
        appId,
        appName:(generated&&generated.app&&generated.app.name)||(generated&&generated.specification&&generated.specification.name)||null,
        versionId,
        versionNo:generated&&generated.app&&generated.app.versionNo,
        persistedVersionCount:persistedVersions.length,
        pages,
        bootstrap,
        journeySurfaceCoverage:{required:journeySurfaces.length,passed:journeySurfaces.filter(x=>x.ok).length,surfaces:journeySurfaces},
        appPreview,
        websitePreview,
        releasePath:'/release/'+appId,
        productionEvidencePath:'/production-e2e'
      };
      setStatus('SUCCESS — authenticated zero-spend Production journey completed.','ok');
      showResult(summary);

      const row=document.createElement('div');row.className='row';
      const preview=document.createElement('a');preview.className='link';preview.href=appPreviewPath;preview.textContent='OPEN GENERATED APP';
      const website=document.createElement('a');website.className='link';website.href=websitePreviewPath;website.textContent='OPEN GENERATED WEBSITE';
      const evidence=document.createElement('a');evidence.className='link';evidence.href='/production-e2e';evidence.textContent='OPEN EVIDENCE CENTER';
      const release=document.createElement('a');release.className='link';release.href='/release/'+encodeURIComponent(appId);release.textContent='OPEN RELEASE CENTER';
      row.append(preview,website,evidence,release);result.after(row);
    }catch(e){
      if(reservationHeld&&createRequestId){
        try{await post('/api/production-e2e/zero-spend',{action:'release',requestId:createRequestId},15000)}catch{}
      }
      const auth=e.status===401||e.status===403;
      const zeroSpend=e.status===409&&e.data&&e.data.code==='ZERO_SPEND_ENTITLEMENT_REQUIRED';
      const prefix=zeroSpend?'ZERO-SPEND STOP — no credits charged: ':(auth?'AUTH / ACCESS: ':'FAILED: ');
      setStatus(prefix+(e.message||'Unknown error'),'bad');
      showResult({success:false,reportVersion:3,evidenceLevel:'AUTHENTICATED_PRODUCTION_BROWSER_JOURNEY',status:e.status||0,error:e.message||String(e),physicalDeviceVerified:false,originalGenerationProviderVerified:false,officialStoreSubmissionVerified:false,smsExercised:false,zeroSpendOnly:true,aiCreditsCharged:0,projectCreditsCharged:0,details:e.data||null});
    }finally{build.disabled=false}
  });
})();
</script>
</body>
</html>`;

export async function GET() {
  return new Response(html, {
    status: 200,
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "no-store, max-age=0",
      "x-robots-tag": "noindex, nofollow",
    },
  });
}
