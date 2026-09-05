import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "../../../lib/supabase/server.js";
import { assessBuildQuality } from "../../../lib/buildStandards.js";
import { laneriqCommunicationStatus } from "../../../lib/communications/server.js";
import { integrationStatus } from "../../../lib/integrations/server.js";
import OperationsActions from "./OperationsActions.js";

function statusTone(ok){return ok?"ok":"attention"}

export default async function OperationsPage({params}){
  const {id}=await params;
  const supabase=await createClient();
  const {data:{user}}=await supabase.auth.getUser();
  if(!user)redirect(`/auth?next=${encodeURIComponent(`/operations/${id}`)}`);

  const {data:app}=await supabase.from("apps").select("id,name,owner_id,current_version_id,publish_status,visibility").eq("id",id).eq("owner_id",user.id).single();
  if(!app)redirect("/my-apps");

  const [{data:version},{data:workflows},{data:runs},{data:media},{data:events}]=await Promise.all([
    supabase.from("app_versions").select("specification,version_no").eq("id",app.current_version_id).maybeSingle(),
    supabase.from("app_workflows").select("id,enabled,actions").eq("app_id",id).eq("owner_id",user.id),
    supabase.from("workflow_runs").select("status,created_at").eq("app_id",id).eq("owner_id",user.id).order("created_at",{ascending:false}).limit(100),
    supabase.from("project_assets").select("id").eq("app_id",id).eq("owner_id",user.id),
    supabase.from("analytics_events").select("event_name,created_at").eq("app_id",id).gte("created_at",new Date(Date.now()-7*24*60*60*1000).toISOString()).limit(2000)
  ]);

  const quality=assessBuildQuality(version?.specification||{});
  const communications=laneriqCommunicationStatus();
  const managed=integrationStatus();
  const active=(workflows||[]).filter(x=>x.enabled);
  const partial=(runs||[]).filter(x=>x.status==="partial"||x.status==="failed").length;
  const successfulRuns=(runs||[]).filter(x=>x.status==="success").length;
  const views=(events||[]).filter(x=>x.event_name==="app_view"||x.event_name==="website_view").length;
  const externalTypes=new Set(active.flatMap(w=>(w.actions||[]).map(a=>a.type)));
  const needsEmail=externalTypes.has("send_email")&&!communications.channels.email.ready;
  const needsWhatsApp=externalTypes.has("send_whatsapp")&&!communications.channels.whatsapp.ready;
  const needsCalendar=externalTypes.has("calendar")&&!managed.calendar.ready;

  const checks=[
    {key:"quality",label:"Build Quality",ok:quality.overall>=75,detail:`${quality.overall}/100 internal specification quality`},
    {key:"publish",label:"Publish State",ok:app.publish_status==="published",detail:app.publish_status==="published"?"Published project state observed":"Still in draft / preview"},
    {key:"media",label:"Project Media",ok:(media||[]).length>0,detail:`${(media||[]).length} owner-scoped project media assets`},
    {key:"automation",label:"Automation",ok:active.length>0,detail:`${active.length} active workflows`},
    {key:"runs",label:"Workflow Health",ok:partial===0,detail:partial?`${partial} recent failed/partial runs need attention`:"No recent failed/partial runs"},
    {key:"email",label:"LANERIQ Email",ok:!needsEmail,detail:needsEmail?"Required by workflow but delivery is not configured":"Ready or not required"},
    {key:"whatsapp",label:"LANERIQ WhatsApp",ok:!needsWhatsApp,detail:needsWhatsApp?"Required by workflow but delivery is not configured":"Ready or not required"},
    {key:"calendar",label:"Calendar",ok:!needsCalendar,detail:needsCalendar?"Required by workflow but managed calendar is not configured":"Ready or not required"},
  ];
  const attention=checks.filter(x=>!x.ok);
  const passed=checks.length-attention.length;
  const health=Math.max(0,Math.min(100,Math.round((quality.overall*.72)+(passed/checks.length*28))));
  const releaseReady=attention.length===0&&quality.overall>=75;
  const issueGroups=[
    {label:"Critical",count:quality.overall<60?1:0,tone:"critical"},
    {label:"High",count:partial,tone:"high"},
    {label:"Medium",count:attention.filter(x=>["publish","media","automation"].includes(x.key)).length,tone:"medium"},
    {label:"Low",count:attention.filter(x=>["email","whatsapp","calendar"].includes(x.key)).length,tone:"low"},
  ];

  return <main className="page opsReferencePage"><div className="opsReferenceWrap">
    <div className="heroGrid">
      <div className="heroCopy"><Link href={`/app-dashboard/${id}`} className="back">← Project</Link><div className="eyebrow">LANERIQ AI · AI APP &amp; WEB CREATOR</div><h1>AI Testing &amp;<br/>Self-Heal Center</h1><p>Automatically test, diagnose and safely improve your project while keeping release evidence truthful.</p></div>
      <div className="healthCard"><span>Project Health</span><div className="healthRing" style={{"--score":`${health*3.6}deg`}}><b>{health}</b><small>/100</small></div><strong>{health>=90?"Excellent":health>=75?"Good":"Needs attention"}</strong><ul><li>{quality.overall>=75?"Internal quality gate healthy":"Quality gate needs attention"}</li><li>{partial===0?"No recent failed workflow runs":`${partial} workflow run issue(s)`}</li><li>{releaseReady?"Ready for controlled publish review":"Publish review still has blockers"}</li></ul></div>
    </div>

    <section className="metricRow" aria-label="Project testing summary">
      <article><span>✓</span><small>Total Checks</small><b>{checks.length}</b></article>
      <article><span>●</span><small>Passed</small><b>{passed}</b></article>
      <article><span>!</span><small>Needs Review</small><b>{attention.length}</b></article>
      <article><span>↻</span><small>Failed/Partial Runs</small><b>{partial}</b></article>
      <article><span>◌</span><small>7D Views</small><b>{views}</b></article>
    </section>

    <div className="dashboardGrid">
      <section className="pipelineCard">
        <div className="sectionTitle"><div><h2>AI Testing Process</h2><p>Observed project checks and bounded repair workflow.</p></div><span>{health}%</span></div>
        <div className="pipelineSteps"><div className="done"><i>1</i><b>Scan</b><small>Read project state</small></div><em>→</em><div className="done"><i>2</i><b>Analyze</b><small>Assess quality</small></div><em>→</em><div className={attention.length?"active":"done"}><i>3</i><b>Fix (AI)</b><small>Safe issues only</small></div><em>→</em><div className={attention.length?"":"done"}><i>4</i><b>Re-test</b><small>Verify again</small></div><em>→</em><div className={releaseReady?"done":""}><i>5</i><b>Verify</b><small>Release evidence</small></div></div>
        <div className="progressPanel"><div className="bot">✺</div><div><b>{attention.length?"AI found items that need review":"Current checks are healthy"}</b><p>{attention.length?`${attention.length} check(s) still need action before the project can be treated as clean.`:"All current owner-scoped checks pass. Provider, device and store evidence remain separate."}</p><div className="progress"><span style={{width:`${health}%`}}/></div></div></div>
        <OperationsActions appId={id} initialOverall={quality.overall}/>
      </section>

      <section className="issuesCard"><div className="sectionTitle"><h2>Issues Found</h2><Link href={`/editor/${id}`}>View details →</Link></div><div className="issueList">{issueGroups.map(group=><div key={group.label}><span className={group.tone}>{group.label}</span><b>{group.count}</b></div>)}</div><div className="attentionList">{attention.length?attention.slice(0,5).map(item=><article key={item.key}><i className={statusTone(item.ok)}>!</i><div><b>{item.label}</b><small>{item.detail}</small></div></article>):<article><i className="ok">✓</i><div><b>No current blockers</b><small>Observed internal checks are healthy.</small></div></article>}</div><Link className="purpleButton" href={`/editor/${id}`}>Review Safe Fixes</Link></section>
    </div>

    <div className="midGrid">
      <section className="coverageCard"><div className="sectionTitle"><h2>Test Coverage</h2><span>{passed}/{checks.length}</span></div><div className="coverageBody"><div className="coverageRing" style={{"--score":`${Math.round(passed/checks.length*100)*3.6}deg`}}><b>{Math.round(passed/checks.length*100)}%</b><small>Checks Passing</small></div><div className="coverageBars">{checks.slice(0,5).map(item=><div key={item.key}><span>{item.label}</span><i><em style={{width:item.ok?"100%":"45%"}}/></i><b>{item.ok?"Pass":"Review"}</b></div>)}</div></div></section>
      <section className="categoriesCard"><div className="sectionTitle"><h2>Test Categories</h2><Link href={`/release/${id}`}>Run release check →</Link></div><div className="categoryGrid">{checks.slice(0,6).map((item,index)=><article key={item.key}><span>{["✦","◫","⌁","⌘","◉","⌂"][index]}</span><b>{item.label}</b><small>{item.detail}</small><em className={item.ok?"pass":"review"}>{item.ok?"Passed":"Review"}</em></article>)}</div></section>
    </div>

    <div className="lowerGrid">
      <section className="selfHealCard"><div className="sectionTitle"><h2>AI Self-Heal Results</h2><Link href={`/editor/${id}`}>Open editor →</Link></div><div className="healSummary"><article><small>Healthy Checks</small><b>{passed}</b><span>{Math.round(passed/checks.length*100)}% passing</span></article><article><small>Successful Workflow Runs</small><b>{successfulRuns}</b><span>{partial?`${partial} need review`:"No failed/partial runs"}</span></article></div><div className="recentFixes">{attention.length?attention.map(item=><div key={item.key}><span>{item.label}</span><em>Needs review</em></div>):<div><span>No bounded fixes currently required</span><em>Healthy</em></div>}</div><Link href={`/editor/${id}`} className="purpleButton">View / Apply Safe Fixes</Link></section>
      <section className="qualityGate"><div><h2>LIUI Quality Gate™</h2><p>Internal product quality only. It never substitutes for live provider, physical-device or store evidence.</p><ul>{checks.slice(0,6).map(item=><li key={item.key} className={item.ok?"pass":"review"}>{item.ok?"✓":"!"} {item.label}</li>)}</ul></div><div className="gateScore"><b>{health}</b><small>/100</small><strong>{releaseReady?"INTERNAL GATE PASSED":"REVIEW REQUIRED"}</strong></div></section>
    </div>

    <section className="quickActions"><div><h2>Quick Actions</h2><p>Use the real project tools behind this dashboard.</p></div><div className="quickGrid"><Link href={`/release/${id}`}>◉ Run Release Check<small>Truthful readiness review</small></Link><Link href={`/editor/${id}`}>✦ Open AI Editor<small>Apply versioned changes</small></Link><Link href={`/workflows/${id}?view=overview`}>⌘ Review Automation<small>Inspect workflow health</small></Link><Link href={`/analytics/${id}`}>↗ Open Analytics<small>Observed owner-scoped events</small></Link></div></section>

    <section className="readyBar"><div><span className="botSmall">✺</span><div><b>{releaseReady?"Current internal checks completed":"Testing review still has open items"}</b><small>{releaseReady?"Continue to the controlled publish center for external evidence checks.":"Resolve the remaining issues before treating the project as release ready."}</small></div></div><Link href={`/publish/${id}`}>Continue to Publish →</Link></section>

    <div className="truthNote">LANERIQ AI shows observable project state only. Internal quality, live provider availability, physical-device behavior and official store status are separate evidence layers and are never converted into a pass by UI presentation.</div>
  </div><style>{`
    .opsReferencePage{min-height:100vh;padding:24px 18px 190px;background:transparent;color:#f8fbff}.opsReferenceWrap{max-width:1180px;margin:auto}.heroGrid{display:grid;grid-template-columns:1fr 300px;gap:18px;align-items:end}.back{color:#f2bd52;text-decoration:none}.eyebrow{margin-top:14px;color:#f2bd52;letter-spacing:.15em;font-size:10px;font-weight:900}.heroCopy h1{font-size:clamp(38px,5vw,58px);line-height:.98;margin:12px 0}.heroCopy p{max-width:650px;color:#b3c2d0;font-size:16px;line-height:1.55}.healthCard,.metricRow article,.pipelineCard,.issuesCard,.coverageCard,.categoriesCard,.selfHealCard,.qualityGate,.quickActions,.readyBar,.truthNote{border:1px solid rgba(190,216,244,.18);background:linear-gradient(145deg,rgba(7,27,48,.84),rgba(8,18,39,.76));border-radius:22px;box-shadow:0 22px 60px rgba(0,0,0,.28);backdrop-filter:blur(22px) saturate(140%)}.healthCard{padding:18px;display:grid;grid-template-columns:auto 1fr;gap:7px 14px;align-items:center}.healthCard>span{grid-column:1/-1;color:#c7d5e1}.healthRing,.coverageRing{--score:0deg;width:94px;height:94px;border-radius:50%;display:grid;place-items:center;align-content:center;background:radial-gradient(circle,#061526 0 55%,transparent 56%),conic-gradient(#57ec95 var(--score),#193044 0);box-shadow:0 0 32px #57ec9530}.healthRing b,.coverageRing b{font-size:28px}.healthRing small,.coverageRing small{font-size:10px;color:#9fb1c0}.healthCard strong{color:#71e696}.healthCard ul{grid-column:1/-1;margin:4px 0 0;padding:0;list-style:none;color:#9fb1c0;font-size:11px;display:grid;gap:5px}.healthCard li:before{content:'●';color:#65e18e;margin-right:7px}.metricRow{display:grid;grid-template-columns:repeat(5,1fr);gap:10px;margin:18px 0}.metricRow article{padding:14px;display:grid;grid-template-columns:34px 1fr;column-gap:8px;align-items:center}.metricRow article>span{grid-row:1/3;width:34px;height:34px;border-radius:11px;display:grid;place-items:center;background:#6f4cff30;color:#b59cff}.metricRow small{color:#90a5b8}.metricRow b{font-size:23px}.dashboardGrid,.midGrid,.lowerGrid{display:grid;grid-template-columns:1.65fr .9fr;gap:14px;margin-top:14px}.midGrid{grid-template-columns:1fr 1.2fr}.lowerGrid{grid-template-columns:1.2fr 1fr}.pipelineCard,.issuesCard,.coverageCard,.categoriesCard,.selfHealCard,.qualityGate,.quickActions{padding:18px}.sectionTitle{display:flex;align-items:center;justify-content:space-between;gap:12px}.sectionTitle h2{margin:0;font-size:20px}.sectionTitle p{margin:4px 0 0;color:#93a6b7}.sectionTitle>a{color:#9db8ff;text-decoration:none;font-size:12px}.pipelineSteps{display:grid;grid-template-columns:1fr auto 1fr auto 1fr auto 1fr auto 1fr;gap:7px;align-items:center;margin:18px 0}.pipelineSteps>div{text-align:center;color:#788b9e}.pipelineSteps i{width:40px;height:40px;border-radius:50%;display:grid;place-items:center;margin:0 auto 6px;border:1px solid #48617a;background:#0d2135;font-style:normal}.pipelineSteps b,.pipelineSteps small{display:block}.pipelineSteps small{font-size:9px;margin-top:3px}.pipelineSteps .done{color:#dce8f2}.pipelineSteps .done i{background:#174b3b;border-color:#54d98b}.pipelineSteps .active{color:#fff}.pipelineSteps .active i{background:#49229d;border-color:#a36fff;box-shadow:0 0 25px #7f4cff66}.pipelineSteps em{color:#6d8296;font-style:normal}.progressPanel{display:grid;grid-template-columns:90px 1fr;gap:14px;align-items:center;padding:15px;border-radius:18px;background:#071827}.bot{width:78px;height:78px;border-radius:50%;display:grid;place-items:center;font-size:40px;background:radial-gradient(circle,#8f56ff,#2b166c 68%);box-shadow:0 0 36px #8a55ff55}.progressPanel p{color:#91a5b5;line-height:1.5}.progress{height:8px;border-radius:99px;background:#173049;overflow:hidden}.progress span{display:block;height:100%;background:linear-gradient(90deg,#6d56ff,#ae53ff)}.issueList{display:grid;gap:8px;margin:14px 0}.issueList>div{display:flex;align-items:center;justify-content:space-between;padding:10px 12px;border-radius:12px;background:#071827}.issueList span{padding:5px 9px;border-radius:9px;font-size:11px}.critical{color:#ff8d9a;background:#5b1424}.high{color:#ffb179;background:#512b16}.medium{color:#ffd67c;background:#513f16}.low{color:#7dc4ff;background:#153c5b}.attentionList{display:grid;gap:8px}.attentionList article{display:flex;gap:9px;align-items:flex-start;padding:10px;border-radius:12px;background:#071827}.attentionList i{width:26px;height:26px;border-radius:50%;display:grid;place-items:center;font-style:normal}.attentionList i.ok{background:#174b3b;color:#6ced9e}.attentionList i.attention{background:#5b3518;color:#ffd176}.attentionList b,.attentionList small{display:block}.attentionList small{color:#8da2b5;margin-top:2px}.purpleButton{margin-top:14px;min-height:44px;border-radius:12px;background:linear-gradient(90deg,#6c3fe0,#8d49ff);color:#fff;text-decoration:none;display:flex;align-items:center;justify-content:center;font-weight:800}.coverageBody{display:grid;grid-template-columns:145px 1fr;gap:16px;align-items:center;margin-top:16px}.coverageRing{width:130px;height:130px}.coverageBars{display:grid;gap:10px}.coverageBars>div{display:grid;grid-template-columns:1fr 100px 55px;align-items:center;gap:8px;font-size:11px}.coverageBars i{height:6px;background:#193149;border-radius:99px;overflow:hidden}.coverageBars i em{display:block;height:100%;background:linear-gradient(90deg,#52dc91,#6ab2ff)}.categoryGrid{display:grid;grid-template-columns:repeat(3,1fr);gap:9px;margin-top:14px}.categoryGrid article{padding:12px;border-radius:14px;background:#071827;display:grid;gap:5px}.categoryGrid article>span{font-size:20px;color:#a47cff}.categoryGrid small{color:#8ea2b3;line-height:1.35}.categoryGrid em{justify-self:start;padding:4px 7px;border-radius:8px;font-style:normal;font-size:9px}.categoryGrid .pass{background:#183f2d;color:#63df92}.categoryGrid .review{background:#4b3217;color:#ffd271}.healSummary{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:14px 0}.healSummary article{padding:14px;border-radius:14px;background:#071827}.healSummary small,.healSummary span{display:block;color:#8fa3b4}.healSummary b{display:block;font-size:28px;margin:3px 0}.recentFixes{display:grid;gap:7px}.recentFixes>div{display:flex;justify-content:space-between;gap:10px;padding:9px 10px;border-radius:10px;background:#071827}.recentFixes em{font-style:normal;color:#f2bd52}.qualityGate{display:grid;grid-template-columns:1fr 170px;gap:16px}.qualityGate p{color:#8fa4b5;line-height:1.5}.qualityGate ul{list-style:none;padding:0;margin:12px 0 0;display:grid;gap:7px}.qualityGate li.pass{color:#73e59a}.qualityGate li.review{color:#ffd271}.gateScore{display:grid;place-items:center;align-content:center;text-align:center;border-left:1px solid #203850}.gateScore b{font-size:54px}.gateScore small{color:#8ea2b2}.gateScore strong{margin-top:10px;color:#67e595;font-size:11px}.quickActions{margin-top:14px;display:grid;grid-template-columns:220px 1fr;gap:16px}.quickActions h2{margin:0}.quickActions p{color:#8ea2b3}.quickGrid{display:grid;grid-template-columns:repeat(2,1fr);gap:9px}.quickGrid a{padding:12px;border-radius:13px;background:#071827;color:#fff;text-decoration:none;font-weight:700}.quickGrid small{display:block;color:#8ea2b3;font-weight:400;margin-top:3px}.readyBar{margin-top:14px;padding:16px 18px;display:flex;justify-content:space-between;align-items:center;gap:16px}.readyBar>div{display:flex;align-items:center;gap:12px}.botSmall{width:44px;height:44px;border-radius:50%;display:grid;place-items:center;background:#412181;color:#d9c9ff}.readyBar b,.readyBar small{display:block}.readyBar small{color:#8fa3b4;margin-top:3px}.readyBar>a{min-height:48px;padding:0 22px;border-radius:13px;background:linear-gradient(90deg,#6b3fde,#8a4bff);display:flex;align-items:center;color:#fff;text-decoration:none;font-weight:900}.truthNote{margin-top:14px;padding:14px;color:#8096a8;line-height:1.5;font-size:11px}
    @media(max-width:900px){.heroGrid,.dashboardGrid,.midGrid,.lowerGrid{grid-template-columns:1fr}.heroGrid{padding-top:8px}.metricRow{grid-template-columns:repeat(2,1fr)}.metricRow article:last-child{grid-column:1/-1}.pipelineSteps{grid-template-columns:repeat(5,1fr)}.pipelineSteps em{display:none}.qualityGate{grid-template-columns:1fr}.gateScore{border-left:0;border-top:1px solid #203850;padding-top:16px}.quickActions{grid-template-columns:1fr}.categoryGrid{grid-template-columns:repeat(2,1fr)}}
    @media(max-width:560px){.opsReferencePage{padding-left:10px;padding-right:10px}.healthCard{grid-template-columns:82px 1fr}.healthRing{width:78px;height:78px}.metricRow{grid-template-columns:1fr 1fr}.metricRow b{font-size:20px}.pipelineSteps{gap:2px}.pipelineSteps i{width:32px;height:32px}.pipelineSteps b{font-size:10px}.pipelineSteps small{display:none}.progressPanel{grid-template-columns:62px 1fr}.bot{width:58px;height:58px;font-size:28px}.coverageBody{grid-template-columns:1fr}.coverageRing{margin:auto}.coverageBars>div{grid-template-columns:1fr 82px 50px}.categoryGrid{grid-template-columns:1fr 1fr}.healSummary{grid-template-columns:1fr 1fr}.quickGrid{grid-template-columns:1fr 1fr}.readyBar{align-items:stretch;flex-direction:column}.readyBar>a{justify-content:center}}
  `}</style></main>;
}
