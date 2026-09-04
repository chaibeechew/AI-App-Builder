import Link from "next/link";
import { redirect } from "next/navigation";
import { loadOwnerBuyoutLicense } from "../../../../lib/buyout-license/server.js";
import { BUYOUT_LICENSE_ISSUANCE_POLICY } from "../../../../config/buyout-license-policy.js";

function dateText(value){
  if(!value)return "—";
  try{return new Intl.DateTimeFormat("en",{year:"numeric",month:"short",day:"2-digit",hour:"2-digit",minute:"2-digit",timeZone:"UTC",timeZoneName:"short"}).format(new Date(value));}catch{return String(value);}
}

export default async function BuyoutLicensePage({params}){
  const {id}=await params;
  const result=await loadOwnerBuyoutLicense({appId:id});
  if(!result?.ok){
    if(result?.code==="AUTHENTICATION_REQUIRED")redirect("/auth");
    redirect(`/app-dashboard/${id}`);
  }
  const {project,license,policy}=result.data;
  if(!license){
    return <main className="page"><div className="wrap"><Link className="back" href={`/app-dashboard/${id}`}>← Project Dashboard</Link><section className="empty"><small>BUYOUT LICENSE</small><h1>No Buyout License has been issued for this project.</h1><p>Normal eligible non-Game projects keep the existing Buyout pricing: <b>Personal US$49</b>, <b>Business US$199</b>, <b>Enterprise US$499</b>. Game projects and the specific project that redeemed Encourage Creator support do not offer Buyout.</p><p>A Buyout License is issued only after the applicable payment is confirmed and before publication.</p></section></div><style>{styles}</style></main>;
  }
  const active=license.status==="active";
  return <main className="page"><div className="wrap">
    <div className="top"><Link className="back" href={`/app-dashboard/${id}`}>← Project Dashboard</Link><span>{active?"ACTIVE LICENSE":"LICENSE RECORD"}</span></div>
    <section className="certificate">
      <div className="brand"><small>LANERIQ AI</small><h1>BUYOUT LICENSE</h1><p>Electronic License Certificate</p></div>
      <div className="seal">LQ</div>
      <div className="grid">
        <div><small>LICENSE ID</small><strong>{license.license_number}</strong></div>
        <div><small>STATUS</small><strong>{String(license.status||"").toUpperCase()}</strong></div>
        <div><small>PROJECT</small><strong>{license.project_name_snapshot||project.name}</strong></div>
        <div><small>PROJECT ID</small><strong>{project.id}</strong></div>
        <div><small>LICENSE TIER</small><strong>{String(license.license_tier||"").toUpperCase()}</strong></div>
        <div><small>LICENSE FEE</small><strong>{license.currency} {Number(license.license_price||0).toFixed(2)}</strong></div>
        <div><small>ISSUED</small><strong>{dateText(license.issued_at||license.accepted_at)}</strong></div>
        <div><small>TERMS VERSION</small><strong>{license.terms_version}</strong></div>
      </div>
      <div className="rights"><h2>What this record confirms</h2><p>For this licensed project, LANERIQ AI records an active project-specific Buyout License, customer project ownership remains preserved, and the future LANERIQ AI revenue-share rate after Buyout is <b>0%</b>, subject to the applicable Buyout License terms and third-party/open-source rights.</p><p>Active Buyout projects receive the source-code access defined by the LANERIQ AI Buyout policy. This certificate does not transfer LANERIQ AI platform infrastructure, provider accounts, third-party licenses, private keys or unrelated proprietary platform services.</p></div>
      <div className="delivery"><div><small>DASHBOARD COPY</small><strong>Permanent account record</strong><p>This Dashboard copy is the source of truth for the issued License.</p></div><div><small>EMAIL COPY</small><strong>{String(license.email_delivery_status||"not_attempted").replaceAll("_"," ").toUpperCase()}</strong><p>Email delivery problems do not invalidate an already-issued active License.</p></div></div>
      <footer><span>Certificate Version · {license.certificate_version||BUYOUT_LICENSE_ISSUANCE_POLICY.certificateVersion}</span><span>LANERIQ AI · Project-specific electronic license record</span></footer>
    </section>
    <p className="printNote">You can use your browser’s Print / Save as PDF function to keep an offline copy.</p>
  </div><style>{styles}</style></main>;
}

const styles=`.page{min-height:100vh;background:radial-gradient(circle at 75% 5%,#d9bd5530,transparent 25%),linear-gradient(145deg,#03110d,#071d16 55%,#03100c);color:#f8fff9;padding:28px 16px 80px}.wrap{width:min(920px,100%);margin:auto}.top{display:flex;justify-content:space-between;gap:15px;align-items:center;margin-bottom:18px}.back{color:#e1c765;text-decoration:none;font-size:12px;font-weight:850}.top>span{font-size:10px;letter-spacing:.15em;color:#8ce0b8;font-weight:950}.certificate{position:relative;border:1px solid #e1c76566;border-radius:28px;background:linear-gradient(145deg,#faf7e9,#fffdf6);color:#142019;padding:clamp(22px,5vw,50px);box-shadow:0 30px 90px #0007;overflow:hidden}.certificate:before{content:"";position:absolute;inset:12px;border:1px solid #b9973040;border-radius:20px;pointer-events:none}.brand{position:relative}.brand small{letter-spacing:.24em;font-weight:950;color:#9a771e}.brand h1{font-size:clamp(42px,8vw,74px);line-height:.92;margin:10px 0 4px;letter-spacing:-.045em}.brand p{margin:0;color:#68766f}.seal{position:absolute;right:45px;top:45px;width:82px;height:82px;border-radius:50%;display:grid;place-items:center;border:2px solid #aa8527;color:#aa8527;font-weight:950;font-size:27px;box-shadow:inset 0 0 0 6px #f6ebc4}.grid{display:grid;grid-template-columns:1fr 1fr;gap:1px;background:#c7b98b55;border:1px solid #c7b98b55;border-radius:18px;overflow:hidden;margin-top:35px}.grid>div{background:#fffdf7;padding:17px}.grid small,.delivery small{display:block;font-size:9px;letter-spacing:.14em;color:#8d805e;font-weight:950}.grid strong{display:block;margin-top:5px;font-size:14px;overflow-wrap:anywhere}.rights{margin-top:24px;padding:20px;border-radius:18px;background:#f4efdc}.rights h2{margin:0 0 8px;font-size:21px}.rights p{color:#4f5c55;line-height:1.65;font-size:13px}.delivery{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:13px}.delivery>div{border:1px solid #cbbb8d;padding:16px;border-radius:16px}.delivery strong{display:block;margin-top:6px}.delivery p{font-size:11px;color:#68766f;line-height:1.5;margin-bottom:0}footer{display:flex;justify-content:space-between;gap:12px;border-top:1px solid #d3c59a;margin-top:26px;padding-top:15px;color:#80765a;font-size:9px;letter-spacing:.08em}.printNote{text-align:center;color:#8fa49a;font-size:11px;margin-top:16px}.empty{border:1px solid #d9bd5540;border-radius:25px;padding:30px;background:#061a14}.empty small{color:#dfc366;letter-spacing:.18em;font-weight:950}.empty h1{font-size:clamp(35px,7vw,60px);line-height:1;margin:12px 0}.empty p{color:#9eb2a8;line-height:1.7}.empty b{color:#e3c869}@media(max-width:620px){.seal{width:58px;height:58px;right:25px;top:25px;font-size:18px}.grid,.delivery{grid-template-columns:1fr}.brand h1{padding-right:55px}footer{flex-direction:column}}@media print{.page{background:#fff;padding:0}.top,.printNote{display:none}.certificate{box-shadow:none;border:1px solid #999;border-radius:0;min-height:95vh}}`;
