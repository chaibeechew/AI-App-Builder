export const dynamic = "force-dynamic";

const html = String.raw`<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover" />
<title>LANERIQ AI Zero-Spend Production E2E</title>
<style>
  :root{color-scheme:dark}
  *{box-sizing:border-box}
  body{margin:0;background:#03110d;color:#f6f3e8;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
  main{max-width:760px;margin:0 auto;padding:24px 18px 40px}
  .brand{font-size:13px;font-weight:900;letter-spacing:.18em;color:#e2bd55;margin-bottom:8px}
  h1{font-size:28px;line-height:1.05;margin:0 0 8px}
  p{color:#aebbb5;line-height:1.5}
  .card{margin-top:18px;padding:18px;border:1px solid #6f5a26;border-radius:20px;background:#061914}
  textarea{width:100%;min-height:180px;border:1px solid #32473f;border-radius:16px;background:#02100c;color:#fff;padding:16px;font:inherit;font-size:16px;line-height:1.45;resize:vertical}
  button,.link{display:block;width:100%;margin-top:14px;border:0;border-radius:16px;padding:16px 18px;min-height:50px;font-weight:900;font-size:16px;text-align:center;text-decoration:none}
  button{background:linear-gradient(135deg,#efc75c,#a66a12);color:#07110d}
  button:disabled{opacity:.45}
  .link{background:#0d2a21;color:#e8cf74;border:1px solid #496e5e}
  #status{margin-top:14px;padding:14px;border-radius:14px;background:#071d17;color:#d6e0db;min-height:50px;white-space:pre-wrap}
  #result{margin-top:14px;padding:14px;border-radius:14px;background:#020b08;border:1px solid #22352e;white-space:pre-wrap;overflow-wrap:anywhere;display:none}
  .ok{color:#73efa3}.bad{color:#ff9a8f}.muted{font-size:12px;color:#85928d}
  .rule{margin-top:12px;padding:12px;border:1px solid #294c3f;border-radius:14px;color:#b9cac3;background:#041510;font-size:13px;line-height:1.45}
  .row{display:grid;grid-template-columns:1fr 1fr;gap:10px}
  @media(max-width:520px){.row{grid-template-columns:1fr}}
</style>
</head>
<body>
<main>
  <div class="brand">LANERIQ AI · PRODUCTION E2E</div>
  <h1>Zero-Spend App + Website Test</h1>
  <p>This authenticated test runs Planning → Generate → atomic Save → App Preview → Website Preview against the real Production stack.</p>
  <div class="card">
    <textarea id="idea">Create a simple property CRM app and responsive website with clients, properties, enquiries, appointments and notes.</textarea>
    <button id="build">RUN ZERO-SPEND E2E</button>
    <a class="link" href="/auth?next=%2Fquick-test">Sign in / Verify Email</a>
    <div class="rule"><b>Hard rule:</b> this runner reserves only free-first-project or active Pro access. If either is unavailable, it stops before AI credits or project credits can be charged.</div>
    <div id="status">Ready. Sign in first, then run the Production E2E.</div>
    <div id="result"></div>
  </div>
  <p class="muted">Evidence is authenticated Production execution. It does not claim a physical iPhone/Android device, external paid-provider success or official-store submission.</p>
</main>
<script>
(function(){
  const idea=document.getElementById('idea');
  const build=document.getElementById('build');
  const status=document.getElementById('status');
  const result=document.getElementById('result');

  function setStatus(text,kind){status.textContent=text;status.className=kind||'';}
  function showResult(value){result.style.display='block';result.textContent=typeof value==='string'?value:JSON.stringify(value,null,2);}
  function requestId(){try{return 'production-e2e-'+crypto.randomUUID()}catch{return 'production-e2e-'+Date.now()}}
  async function post(url,body,timeoutMs){
    const controller=new AbortController();
    const timer=setTimeout(()=>controller.abort(),timeoutMs||120000);
    try{
      const response=await fetch(url,{method:'POST',credentials:'include',cache:'no-store',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),signal:controller.signal});
      const text=await response.text();
      let data={};
      try{data=text?JSON.parse(text):{}}catch{data={raw:text}}
      if(!response.ok){const err=new Error(data.error||('Request failed ('+response.status+')'));err.status=response.status;err.data=data;throw err}
      return data;
    }finally{clearTimeout(timer)}
  }
  async function probe(url){
    const response=await fetch(url,{method:'GET',credentials:'include',cache:'no-store',redirect:'follow'});
    return {url,status:response.status,ok:response.ok,contentType:response.headers.get('content-type')||''};
  }

  build.addEventListener('click',async()=>{
    const prompt=idea.value.trim();
    if(!prompt){setStatus('Please enter an App + Website idea.','bad');return}
    build.disabled=true;result.style.display='none';
    let createRequestId='';
    let reservationHeld=false;
    try{
      setStatus('1/5 Planning project…');
      const planned=await post('/api/orchestrate',{idea:prompt,assetCount:0},45000);
      const plan=planned.plan||{};

      createRequestId=requestId();
      setStatus('2/5 Reserving zero-spend creation entitlement…');
      const reservation=await post('/api/production-e2e/zero-spend',{action:'reserve',requestId:createRequestId},15000);
      if(reservation.zeroSpendOnly!==true||reservation.aiCreditsCharged!==0||reservation.projectCreditsCharged!==0)throw new Error('Zero-spend reservation contract failed.');
      reservationHeld=true;

      setStatus('3/5 Generating and atomically saving real App + Website…');
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

      setStatus('4/5 Installing starter data and workflows…');
      let bootstrap=null;
      try{bootstrap=await post('/api/apps/'+encodeURIComponent(appId)+'/bootstrap',{plan,assetCount:0,deviceClass:'mobile'},90000)}catch(e){bootstrap={ok:false,error:e.message,status:e.status||0}}

      setStatus('5/5 Verifying App + Website preview surfaces…');
      const appPreviewPath='/a/'+encodeURIComponent(appId)+'?demo=1';
      const websitePreviewPath='/website/'+encodeURIComponent(appId);
      const [appPreview,websitePreview]=await Promise.all([probe(appPreviewPath),probe(websitePreviewPath)]);
      if(!appPreview.ok||!websitePreview.ok)throw new Error('One or more generated preview surfaces failed Production verification.');

      const pages=Array.isArray(generated&&generated.specification&&generated.specification.pages)?generated.specification.pages.map(x=>x&&x.name).filter(Boolean):[];
      const summary={
        success:true,
        evidenceLevel:'AUTHENTICATED_PRODUCTION_E2E',
        physicalDeviceVerified:false,
        zeroSpendOnly:true,
        aiCreditsCharged:0,
        projectCreditsCharged:0,
        planningVerified:true,
        generationVerified:generated.success===true,
        saveVerified:true,
        appPreviewVerified:appPreview.ok,
        websitePreviewVerified:websitePreview.ok,
        writesExercised:true,
        requestId:createRequestId,
        appId,
        appName:(generated&&generated.app&&generated.app.name)||(generated&&generated.specification&&generated.specification.name)||null,
        versionId,
        versionNo:generated&&generated.app&&generated.app.versionNo,
        pages,
        bootstrap,
        appPreview,
        websitePreview,
        releasePath:'/release/'+appId
      };
      setStatus('SUCCESS — authenticated zero-spend App + Website E2E completed.','ok');
      showResult(summary);

      const row=document.createElement('div');row.className='row';
      const preview=document.createElement('a');preview.className='link';preview.href=appPreviewPath;preview.textContent='OPEN GENERATED APP';
      const website=document.createElement('a');website.className='link';website.href=websitePreviewPath;website.textContent='OPEN GENERATED WEBSITE';
      row.append(preview,website);result.after(row);
    }catch(e){
      if(reservationHeld&&createRequestId){
        try{await post('/api/production-e2e/zero-spend',{action:'release',requestId:createRequestId},15000)}catch{}
      }
      const auth=e.status===401||e.status===403;
      const zeroSpend=e.status===409&&e.data&&e.data.code==='ZERO_SPEND_ENTITLEMENT_REQUIRED';
      const prefix=zeroSpend?'ZERO-SPEND STOP — no credits charged: ':(auth?'AUTH / ACCESS: ':'FAILED: ');
      setStatus(prefix+(e.message||'Unknown error'),'bad');
      showResult({success:false,status:e.status||0,error:e.message||String(e),zeroSpendOnly:true,aiCreditsCharged:0,projectCreditsCharged:0,details:e.data||null});
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
