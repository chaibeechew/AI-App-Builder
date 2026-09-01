"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { buildAutonomousPlan } from "../../../lib/build/orchestrator.js";

function requestId() {
  try { return crypto.randomUUID(); } catch { return `pro-${Date.now()}-${Math.random().toString(36).slice(2,10)}`; }
}

function moduleLabel(key) {
  return ({ database:"Database", workflows:"Automations", video:"Video Studio", integrations:"Connections", payments:"Payments" })[key] || key;
}

async function fetchWithTimeout(url,options={},timeoutMs=20000){
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),timeoutMs);
  try{return await fetch(url,{...options,signal:controller.signal})}
  catch(error){if(error?.name==="AbortError"){const timeoutError=new Error("Request reached its safety time limit.");timeoutError.code="CLIENT_TIMEOUT";throw timeoutError}throw error}
  finally{clearTimeout(timer)}
}

export default function ProAssistant({ appId, currentVersionId="", quickActions=[] }) {
  const router = useRouter();
  const inFlightRef = useRef(false);
  const pendingOperationRef = useRef(null);
  const expectedVersionRef = useRef(currentVersionId||"");
  const [instruction, setInstruction] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [lastVersion, setLastVersion] = useState(null);
  const [syncedModules, setSyncedModules] = useState([]);
  const [nextTools, setNextTools] = useState([]);
  const canRun = useMemo(() => instruction.trim().length >= 3 && !loading, [instruction, loading]);

  async function runInstruction(text = instruction) {
    const command = String(text || "").trim();
    if (command.length < 3 || inFlightRef.current) return;
    inFlightRef.current=true;
    setInstruction(command);
    setLoading(true); setError(""); setSyncedModules([]); setNextTools([]);
    setMessage("AI is reviewing the current project and applying the requested change…");
    const signature=`${appId}:${expectedVersionRef.current}:${command}`;
    if(!pendingOperationRef.current||pendingOperationRef.current.signature!==signature)pendingOperationRef.current={signature,id:requestId()};
    const operationId=pendingOperationRef.current.id;

    try {
      const plan = buildAutonomousPlan({ idea: command, createVideo: /video|promo|宣传视频|影片|视频/i.test(command) });
      const response = await fetchWithTimeout("/api/modify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ appId, instruction: command, requestId: operationId, expectedVersionId:expectedVersionRef.current||undefined })
      },95000);
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data?.error || "Unable to apply the change.");

      setLastVersion(data?.version || null);
      if(data?.version?.id)expectedVersionRef.current=data.version.id;
      pendingOperationRef.current=null;
      const autoSyncNeeded = Boolean(plan?.modules?.database || plan?.modules?.workflows || plan?.modules?.video);
      let autoSyncNote = "";

      if (autoSyncNeeded) {
        try {
          const bootstrap = await fetchWithTimeout(`/api/apps/${appId}/bootstrap`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ plan, createVideo: Boolean(plan?.modules?.video), expectedVersionId:data?.version?.id||null })
          },20000);
          const boot = await bootstrap.json().catch(() => ({}));
          if (!bootstrap.ok) throw new Error(boot?.error || "Module sync failed.");
          const synced = [];
          if (boot?.results?.database?.status === "ready") synced.push("database");
          if ((boot?.results?.workflows || []).some((item) => ["ready","existing"].includes(item?.status))) synced.push("workflows");
          if (["ready","existing"].includes(boot?.results?.video?.status)) synced.push("video");
          setSyncedModules(synced);
          if (synced.length) autoSyncNote = ` I also synchronized ${synced.map(moduleLabel).join(", ")} from the new version.`;
        } catch (syncError) {
          autoSyncNote = syncError?.code==="CLIENT_TIMEOUT"
            ? " The project version was saved, but module synchronization reached its safety time limit. You can reopen the related tool without losing the saved version."
            : ` The project version was saved, but an automatic module sync needs attention: ${syncError?.message || "unknown error"}`;
        }
      }

      const followUps = [];
      if (plan?.modules?.integrations) followUps.push({ label:"Connections", href:`/integrations/${appId}` });
      if (plan?.modules?.payments) followUps.push({ label:"Payments", href:`/monetization/${appId}` });
      if (/publish|apple|google play|app store|发布|上架/i.test(command)) followUps.push({ label:"Publishing", href:`/publish/${appId}` });
      setNextTools(followUps.filter((item, index, all) => all.findIndex((x) => x.href === item.href) === index));

      setMessage(data?.replayed
        ? `Recovered the already-saved Version ${data?.version?.version_no||""} from the same request without applying the edit twice.${autoSyncNote}`
        : data?.version?.version_no
          ? `Done. Version ${data.version.version_no} was created and passed the modification self-test.${autoSyncNote}`
          : `Done. The AI change was applied and checked.${autoSyncNote}`);
      router.refresh();
    } catch (err) {
      setError(err?.code==="CLIENT_TIMEOUT"
        ? "AI reached the browser safety time limit. Retry the same instruction once: the same request ID will safely recover an already-saved result instead of applying it twice."
        : err?.message || "Unable to apply the change.");
      setMessage("");
    } finally { inFlightRef.current=false; setLoading(false); }
  }

  return <section className="assistantPanel">
    <div className="assistantHead"><div><small>AI COPILOT</small><h2>Just tell AI what you want changed.</h2><p>Professional Mode keeps the same project as Standard Mode. AI can change the product specification and automatically synchronize matching Database, Automation and Video modules when the request requires them.</p></div><span>AI-FIRST</span></div>
    <textarea value={instruction} onChange={(e) => setInstruction(e.target.value)} placeholder="Example: Make the home page more premium, add a customer enquiry database, create an automatic confirmation email, and improve the mobile layout." maxLength={4000}/>
    <div className="commandActions"><button disabled={!canRun} onClick={() => runInstruction()}>{loading ? "AI WORKING…" : "Ask AI to Fix / Change →"}</button><a href={`/a/${appId}?demo=1`} target="_blank" rel="noreferrer">Open Preview</a></div>
    <div className="quickGrid">{quickActions.map((item) => <button key={item} disabled={loading} onClick={() => runInstruction(item)}>{item}</button>)}</div>
    {message && <div className="ok">{message}{lastVersion?.version_no ? " You can compare or rollback from Version History." : ""}</div>}
    {syncedModules.length > 0 && <div className="synced"><strong>Automatically synchronized</strong>{syncedModules.map((item) => <span key={item}>✓ {moduleLabel(item)}</span>)}</div>}
    {nextTools.length > 0 && <div className="nextTools"><strong>Customer confirmation / setup still needed</strong><div>{nextTools.map((item) => <a key={item.href} href={item.href}>{item.label} →</a>)}</div><small>AI prepares these areas, but payments, external provider connections and official store actions must not be guessed or silently confirmed.</small></div>}
    {error && <div className="error">{error}</div>}
    <style jsx>{`.assistantPanel{border:1px solid #ddb94f66;background:linear-gradient(145deg,#071d17eb,#0a2c21e8);border-radius:28px;padding:26px;box-shadow:0 30px 90px #0008}.assistantHead{display:flex;justify-content:space-between;gap:20px}.assistantHead small{color:#efcb69;letter-spacing:.18em;font-weight:950}.assistantHead h2{font-size:34px;margin:8px 0 7px}.assistantHead p{max-width:720px;color:#a8bbb3;line-height:1.6}.assistantHead>span{height:max-content;border:1px solid #e7c45b55;border-radius:999px;padding:9px 12px;color:#e7c45b;font-size:11px;font-weight:950}textarea{width:100%;min-height:145px;margin-top:18px;border:1px solid #e7c45b44;border-radius:18px;padding:18px;background:#020b09aa;color:#fff;font:inherit;line-height:1.55;resize:vertical}textarea:focus{outline:1px solid #e7c45b}.commandActions{display:flex;gap:10px;flex-wrap:wrap;margin-top:12px}.commandActions button,.commandActions a{border-radius:14px;padding:13px 18px;font-weight:900;text-decoration:none}.commandActions button{border:0;background:linear-gradient(135deg,#f1d77c,#bd8425);color:#122019}.commandActions button:disabled{opacity:.5}.commandActions a{border:1px solid #ffffff22;color:#fff}.quickGrid{display:grid;grid-template-columns:1fr 1fr;gap:9px;margin-top:18px}.quickGrid button{text-align:left;border:1px solid #ffffff14;border-radius:14px;padding:13px;background:#ffffff08;color:#dce6e1;line-height:1.45}.quickGrid button:hover{border-color:#e7c45b55}.ok,.error,.synced,.nextTools{margin-top:15px;border-radius:13px;padding:13px;font-size:13px}.ok{background:#176c4933;color:#a8efcb}.error{background:#8b252533;color:#ffc0c0}.synced{display:flex;gap:8px;flex-wrap:wrap;align-items:center;border:1px solid #6fd8aa2b;background:#0b251c}.synced strong{width:100%;color:#fff}.synced span{padding:7px 9px;border-radius:999px;background:#173b2e;color:#9ee8c5}.nextTools{border:1px solid #e7c45b33;background:#241b091f}.nextTools>strong{display:block;margin-bottom:8px}.nextTools>div{display:flex;gap:8px;flex-wrap:wrap}.nextTools a{color:#f0d67a;text-decoration:none;border:1px solid #e7c45b33;border-radius:10px;padding:8px 10px}.nextTools small{display:block;color:#9eafa8;line-height:1.5;margin-top:9px}@media(max-width:680px){.assistantHead{flex-direction:column}.quickGrid{grid-template-columns:1fr}.assistantHead h2{font-size:29px}}`}</style>
  </section>;
}
