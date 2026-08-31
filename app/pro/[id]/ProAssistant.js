"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

export default function ProAssistant({ appId, initialSpec, quickActions }) {
  const router = useRouter();
  const [instruction, setInstruction] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [lastVersion, setLastVersion] = useState(null);
  const canRun = useMemo(() => instruction.trim().length >= 3 && !loading, [instruction, loading]);

  async function runInstruction(text = instruction) {
    const command = String(text || "").trim();
    if (command.length < 3 || loading) return;
    setInstruction(command);
    setLoading(true); setError(""); setMessage("AI is reviewing the current project and applying the requested change…");
    try {
      const response = await fetch("/api/modify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ appId, specification: initialSpec, instruction: command, requestId: crypto.randomUUID() })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data?.error || "Unable to apply the change.");
      setLastVersion(data?.version || null);
      setMessage(data?.version?.version_no ? `Done. Version ${data.version.version_no} was created and the project passed the modification self-test.` : "Done. The AI change was applied and checked.");
      router.refresh();
    } catch (err) {
      setError(err?.message || "Unable to apply the change.");
      setMessage("");
    } finally { setLoading(false); }
  }

  return <section className="assistantPanel">
    <div className="assistantHead"><div><small>AI COPILOT</small><h2>Just tell AI what you want changed.</h2><p>Professional Mode keeps the same project as Standard Mode. AI handles the change first; deeper tools remain available when you want manual control.</p></div><span>AI-FIRST</span></div>
    <textarea value={instruction} onChange={(e) => setInstruction(e.target.value)} placeholder="Example: Make the home page more premium, simplify the enquiry flow, and improve the mobile layout without changing my existing CRM workflow." maxLength={4000}/>
    <div className="commandActions"><button disabled={!canRun} onClick={() => runInstruction()}>{loading ? "AI WORKING…" : "Ask AI to Fix / Change →"}</button><a href={`/a/${appId}?demo=1`} target="_blank" rel="noreferrer">Open Preview</a></div>
    <div className="quickGrid">{quickActions.map((item) => <button key={item} disabled={loading} onClick={() => runInstruction(item)}>{item}</button>)}</div>
    {message && <div className="ok">{message}{lastVersion?.version_no ? " You can compare or rollback from Version History." : ""}</div>}
    {error && <div className="error">{error}</div>}
    <style jsx>{`.assistantPanel{border:1px solid #ddb94f66;background:linear-gradient(145deg,#071d17eb,#0a2c21e8);border-radius:28px;padding:26px;box-shadow:0 30px 90px #0008}.assistantHead{display:flex;justify-content:space-between;gap:20px}.assistantHead small{color:#efcb69;letter-spacing:.18em;font-weight:950}.assistantHead h2{font-size:34px;margin:8px 0 7px}.assistantHead p{max-width:720px;color:#a8bbb3;line-height:1.6}.assistantHead>span{height:max-content;border:1px solid #e7c45b55;border-radius:999px;padding:9px 12px;color:#e7c45b;font-size:11px;font-weight:950}textarea{width:100%;min-height:145px;margin-top:18px;border:1px solid #e7c45b44;border-radius:18px;padding:18px;background:#020b09aa;color:#fff;font:inherit;line-height:1.55;resize:vertical}textarea:focus{outline:1px solid #e7c45b}.commandActions{display:flex;gap:10px;flex-wrap:wrap;margin-top:12px}.commandActions button,.commandActions a{border-radius:14px;padding:13px 18px;font-weight:900;text-decoration:none}.commandActions button{border:0;background:linear-gradient(135deg,#f1d77c,#bd8425);color:#122019}.commandActions button:disabled{opacity:.5}.commandActions a{border:1px solid #ffffff22;color:#fff}.quickGrid{display:grid;grid-template-columns:1fr 1fr;gap:9px;margin-top:18px}.quickGrid button{text-align:left;border:1px solid #ffffff14;border-radius:14px;padding:13px;background:#ffffff08;color:#dce6e1;line-height:1.45}.quickGrid button:hover{border-color:#e7c45b55}.ok,.error{margin-top:15px;border-radius:13px;padding:13px;font-size:13px}.ok{background:#176c4933;color:#a8efcb}.error{background:#8b252533;color:#ffc0c0}@media(max-width:680px){.assistantHead{flex-direction:column}.quickGrid{grid-template-columns:1fr}.assistantHead h2{font-size:29px}}`}</style>
  </section>;
}
