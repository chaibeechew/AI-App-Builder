import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "../../../lib/supabase/server.js";
import { loadVisibleProject } from "../../../lib/publishing/public-project-runtime.js";

export const metadata={title:"App + Website Preview — LANERIQ AI",robots:{index:false,follow:false}};

export default async function CombinedPreviewPage({params}){
  const{id}=await params;
  const supabase=await createClient();
  const{data:{user}}=await supabase.auth.getUser();
  if(!user)notFound();
  const visible=await loadVisibleProject({id,userId:user.id});
  if(!visible||!visible.isOwner)notFound();
  const{app,version}=visible;
  const versionNo=Number(version?.version_no||0);
  return <main className="combinedPreview">
    <div className="wrap">
      <header className="top"><div><small>ONE PROJECT · ONE CURRENT VERSION</small><h1>{app.name||"Your Project"}</h1><p>App and Website below are two customer surfaces from the same saved project version{versionNo?` · v${versionNo}`:""}. Modify once, then reopen this page to review both updated surfaces together.</p></div><div className="topActions"><Link href={`/app-dashboard/${id}`}>Project</Link><Link className="gold" href={`/release/${id}`}>Publish Center →</Link></div></header>
      <section className="deliveryStatus"><span>✓ Same project ID</span><span>✓ Same current version</span><span>✓ Same Brand Kit & memory</span><span>✓ Independent customer surfaces</span></section>
      <section className="previewGrid">
        <article><div className="previewHead"><div><small>01 · MOBILE APP</small><h2>App Preview</h2></div><Link href={`/a/${id}?demo=1`}>Open Full App ↗</Link></div><div className="phoneStage"><iframe title={`${app.name||"Project"} App Preview`} src={`/a/${id}?demo=1`} loading="eager"/></div></article>
        <article><div className="previewHead"><div><small>02 · RESPONSIVE WEB</small><h2>Website Preview</h2></div><Link href={`/website/${id}`}>Open Full Website ↗</Link></div><div className="webStage"><iframe title={`${app.name||"Project"} Website Preview`} src={`/website/${id}`} loading="eager"/></div></article>
      </section>
      <section className="next"><div><small>REFINE BOTH</small><h2>One edit updates the shared project version.</h2><p>Use AI Modify from the project workspace. App and Website remain synchronized because neither surface owns a separate shadow specification.</p></div><Link href={`/editor/${id}`}>Modify with AI →</Link></section>
    </div>
    <style>{`*{box-sizing:border-box}.accountNav,.sv-fab,.wallpaperControl{display:none!important}.combinedPreview{min-height:100vh;padding:34px 18px 80px;background:radial-gradient(circle at 80% 3%,rgba(228,190,83,.18),transparent 27%),linear-gradient(145deg,#03100d,#08241a 58%,#020c09);color:#f7fff9;font-family:Inter,system-ui,-apple-system,sans-serif}.wrap{max-width:1380px;margin:auto}.top{display:flex;justify-content:space-between;gap:28px;align-items:flex-start}.top small,.previewHead small,.next small{color:#e4be53;font-weight:950;letter-spacing:.16em}.top h1{font-size:clamp(42px,7vw,76px);line-height:.95;margin:10px 0 16px}.top p,.next p{max-width:780px;color:#9db4aa;line-height:1.65}.topActions{display:flex;gap:10px;flex-wrap:wrap}.topActions a,.previewHead a,.next>a{min-height:44px;display:inline-flex;align-items:center;justify-content:center;padding:11px 14px;border:1px solid rgba(228,190,83,.3);border-radius:12px;color:#e4be53;text-decoration:none;font-weight:900;white-space:nowrap}.topActions .gold,.next>a{background:#e4be53;color:#0d1b14}.deliveryStatus{display:flex;gap:8px;flex-wrap:wrap;margin:24px 0}.deliveryStatus span{padding:8px 11px;border-radius:999px;background:#0d2a20;border:1px solid rgba(103,219,164,.18);color:#a8e6c8;font-size:11px;font-weight:800}.previewGrid{display:grid;grid-template-columns:minmax(330px,.78fr) minmax(540px,1.35fr);gap:18px}.previewGrid>article{min-width:0;padding:18px;border:1px solid rgba(228,190,83,.18);border-radius:24px;background:rgba(3,16,13,.8);box-shadow:0 28px 80px #0005}.previewHead{display:flex;justify-content:space-between;gap:14px;align-items:center;margin-bottom:14px}.previewHead h2{margin:5px 0 0;font-size:24px}.phoneStage,.webStage{position:relative;overflow:hidden;background:#06140f}.phoneStage{width:min(100%,430px);height:720px;margin:auto;border:8px solid #101814;border-radius:38px;box-shadow:0 24px 55px #0008}.webStage{height:720px;border:1px solid #ffffff18;border-radius:18px}.phoneStage iframe,.webStage iframe{width:100%;height:100%;border:0;background:#fff}.next{margin-top:18px;padding:22px;border-radius:22px;border:1px solid rgba(228,190,83,.18);background:#061913;display:flex;justify-content:space-between;align-items:center;gap:20px}.next h2{margin:7px 0;font-size:26px}@media(max-width:1000px){.top,.next{display:block}.topActions,.next>a{margin-top:14px}.previewGrid{grid-template-columns:1fr}.phoneStage{height:680px}.webStage{height:620px}}@media(max-width:600px){.combinedPreview{padding-inline:10px}.previewGrid>article{padding:12px}.previewHead{align-items:flex-start;flex-direction:column}.previewHead a{width:100%}.phoneStage{height:650px;border-width:6px}.webStage{height:580px}.topActions a{flex:1}}`}</style>
  </main>;
}
