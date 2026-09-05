"use client";

import Link from "next/link";
import { useState } from "react";

export default function OperationsActions({appId,initialOverall=0}){
  const[busy,setBusy]=useState(false);
  const[result,setResult]=useState(null);
  const[error,setError]=useState("");

  async function runQualityTests(){
    if(busy)return;
    setBusy(true);setError("");
    try{
      const response=await fetch(`/api/apps/${appId}/quality`,{cache:"no-store"});
      const data=await response.json().catch(()=>({}));
      if(!response.ok)throw new Error(data?.error||"Unable to run the project quality tests.");
      setResult(data);
    }catch(caught){setError(caught?.message||"Unable to run the project quality tests.");}
    finally{setBusy(false);}
  }

  const overall=result?.report?.overall??initialOverall;
  const blockers=Array.isArray(result?.belowTarget)?result.belowTarget:[];
  const fixInstruction=blockers.length
    ? `Improve the current project until every internal release quality dimension reaches its required target. Focus on: ${blockers.map(item=>item.name||item.id).join(", ")}. Preserve all working features, customer data, permissions, automations and brand identity. Do not claim provider, device or store verification unless real evidence exists.`
    : "Review the current project for safe quality improvements. Preserve working features, data, permissions, automations and brand identity. Do not claim live provider, device or store evidence unless it has actually been verified.";

  return <section className="opsActions">
    <div><small>INTERACTIVE TEST & REPAIR</small><h2>Run the current quality gate, then repair safely.</h2><p>This runs the saved-project quality tests now. Provider availability, physical-device behavior and official store status remain separate evidence.</p></div>
    <div className="buttons"><button onClick={runQualityTests} disabled={busy}>{busy?"Running tests…":result?"Re-test Project":"Run Quality Tests"}</button><Link href={{pathname:`/editor/${appId}`,query:{instruction:fixInstruction}}}>✨ Fix Safe Issues with AI →</Link></div>
    {result&&<div className={result.releaseReady?"result ready":"result attention"}><b>{overall}/100</b><span>{result.releaseReady?"Internal release gate passed. Live runtime evidence is still separate.":`${blockers.length||result.missingDimensions?.length||1} quality area(s) still need attention.`}</span></div>}
    {error&&<div className="error">{error}</div>}
    <style jsx>{`.opsActions{margin-top:18px;padding:20px;border:1px solid #d8bf6230;border-radius:20px;background:linear-gradient(135deg,#d8bf620d,#03100dcc)}.opsActions small{color:#d8bf62;font-size:10px;font-weight:900;letter-spacing:.15em}.opsActions h2{margin:6px 0}.opsActions p{max-width:760px;color:#8fa39a;line-height:1.55}.buttons{display:flex;gap:9px;flex-wrap:wrap;margin-top:13px}.buttons button,.buttons :global(a){min-height:44px;display:inline-flex;align-items:center;justify-content:center;border-radius:12px;padding:11px 14px;font-weight:900;text-decoration:none}.buttons button{border:0;background:#d8bf62;color:#07130e}.buttons button:disabled{opacity:.55}.buttons :global(a){border:1px solid #79d7ac40;background:#163c2f;color:#9fe2c2}.result{display:flex;gap:12px;align-items:center;margin-top:14px;padding:12px;border-radius:13px}.result b{font-size:24px}.result span{font-size:12px}.result.ready{background:#1c6b4d33;color:#9fe2c2}.result.attention{background:#6b4b1d40;color:#f2d48a}.error{margin-top:12px;padding:12px;border-radius:12px;background:#7c2d2d44;color:#ffb5ad}@media(max-width:600px){.buttons{display:grid}.buttons button,.buttons :global(a){width:100%}.result{align-items:flex-start;flex-direction:column}}`}</style>
  </section>;
}
