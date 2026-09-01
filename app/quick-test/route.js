export const dynamic = "force-dynamic";

const html = String.raw`<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover" />
<title>LANERIQ AI Quick Build Test</title>
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
  button,.link{display:block;width:100%;margin-top:14px;border:0;border-radius:16px;padding:16px 18px;font-weight:900;font-size:16px;text-align:center;text-decoration:none}
  button{background:linear-gradient(135deg,#efc75c,#a66a12);color:#07110d}
  button:disabled{opacity:.45}
  .link{background:#0d2a21;color:#e8cf74;border:1px solid #496e5e}
  #status{margin-top:14px;padding:14px;border-radius:14px;background:#071d17;color:#d6e0db;min-height:50px;white-space:pre-wrap}
  #result{margin-top:14px;padding:14px;border-radius:14px;background:#020b08;border:1px solid #22352e;white-space:pre-wrap;overflow-wrap:anywhere;display:none}
  .ok{color:#73efa3}.bad{color:#ff9a8f}.muted{font-size:12px;color:#85928d}
  .row{display:grid;grid-template-columns:1fr 1fr;gap:10px}
  @media(max-width:520px){.row{grid-template-columns:1fr}}
</style>
</head>
<body>
<main>
  <div class="brand">LANERIQ AI · QUICK TEST</div>
  <h1>Backend App Generation Test</h1>
  <p>This page intentionally skips the heavy homepage UI. It only tests Planning → Generate → Bootstrap.</p>
  <div class="card">
    <textarea id="idea">Create a simple property CRM app with clients, properties, enquiries, appointments and notes.</textarea>
    <button id="build">BUILD TEST APP</button>
    <a class="link" href="/auth?next=%2Fquick-test">Sign in / Verify Email</a>
    <div id="status">Ready. If you already signed in on this Preview, press BUILD TEST APP.</div>
    <div id="result"></div>
  </div>
  <p class="muted">No background images, templates, credits page, my-apps page, or Next.js navigation prefetch is used here.</p>
</main>
<script>
(function(){
  const idea=document.getElementById('idea');
  const build=document.getElementById('build');
  const status=document.getElementById('status');
  const result=document.getElementById('result');

  function setStatus(text,kind){status.textContent=text;status.className=kind||'';}
  function showResult(value){result.style.display='block';result.textContent=typeof value==='string'?value:JSON.stringify(value,null,2);}
  function requestId(){try{return 'quick-'+crypto.randomUUID()}catch{return 'quick-'+Date.now()}}
  async function post(url,body,timeoutMs){
    const controller=new AbortController();
    const timer=setTimeout(()=>controller.abort(),timeoutMs||120000);
    try{
      const response=await fetch(url,{method:'POST',credentials:'include',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),signal:controller.signal});
      const text=await response.text();
      let data={};
      try{data=text?JSON.parse(text):{}}catch{data={raw:text}}
      if(!response.ok){const err=new Error(data.error||('Request failed ('+response.status+')'));err.status=response.status;err.data=data;throw err}
      return data;
    }finally{clearTimeout(timer)}
  }

  build.addEventListener('click',async()=>{
    const prompt=idea.value.trim();
    if(!prompt){setStatus('Please enter an App idea.','bad');return}
    build.disabled=true;result.style.display='none';
    try{
      setStatus('1/3 Planning project…');
      const planned=await post('/api/orchestrate',{idea:prompt,assetCount:0},45000);
      const plan=planned.plan||{};

      setStatus('2/3 Generating real App… This can take a little while.');
      const buildIdea=[
        prompt,
        Array.isArray(plan.selectedModules)&&plan.selectedModules.length?'AUTONOMOUS MODULE PLAN: '+plan.selectedModules.join(', '):'',
        Array.isArray(plan.workflows)&&plan.workflows.length?'STARTER WORKFLOWS: '+plan.workflows.map(x=>x.name).filter(Boolean).join(', '):'',
        'ONE-CLICK BUILD RULE: Create a functional mobile-first App and responsive Website.',
        'PREMIUM DESIGN RULE: Keep every page polished, readable, responsive and production-like.'
      ].filter(Boolean).join('\n\n');

      const generated=await post('/api/generate',{
        idea:buildIdea,
        assetIds:[],
        requestId:requestId(),
        themeMode:'preset',
        themePreset:'luxury-gold',
        styleRequest:'Premium mobile-first responsive product UI with clear hierarchy and accessible controls.',
        wallpaperMode:'selected',
        wallpaperPreset:'moon-city'
      },150000);

      const appId=generated&&generated.app&&generated.app.id;
      let bootstrap=null;
      if(appId){
        setStatus('3/3 Installing starter data and workflows…');
        try{bootstrap=await post('/api/apps/'+encodeURIComponent(appId)+'/bootstrap',{plan,assetCount:0,deviceClass:'mobile'},90000)}catch(e){bootstrap={ok:false,error:e.message,status:e.status||0}}
      }

      setStatus('SUCCESS — App generation completed.','ok');
      const pages=Array.isArray(generated&&generated.specification&&generated.specification.pages)?generated.specification.pages.map(x=>x&&x.name).filter(Boolean):[];
      const summary={
        success:true,
        appId:appId||null,
        appName:(generated&&generated.app&&generated.app.name)||(generated&&generated.specification&&generated.specification.name)||null,
        versionNo:generated&&generated.app&&generated.app.versionNo,
        pages,
        bootstrap,
        previewPath:appId?'/a/'+appId+'?demo=1':null,
        releasePath:appId?'/release/'+appId:null
      };
      showResult(summary);
      if(appId){
        const row=document.createElement('div');row.className='row';
        const preview=document.createElement('a');preview.className='link';preview.href='/a/'+encodeURIComponent(appId)+'?demo=1';preview.textContent='OPEN GENERATED APP';
        const release=document.createElement('a');release.className='link';release.href='/release/'+encodeURIComponent(appId);release.textContent='OPEN RELEASE WORKSPACE';
        row.append(preview,release);result.after(row);
      }
    }catch(e){
      const auth=e.status===401||e.status===403;
      setStatus((auth?'AUTH / ACCESS: ':'FAILED: ')+(e.message||'Unknown error'),'bad');
      showResult({success:false,status:e.status||0,error:e.message||String(e),details:e.data||null});
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
