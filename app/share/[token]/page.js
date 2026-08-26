import { notFound } from "next/navigation";
import { createClient } from "../../../lib/supabase/server.js";

export default async function SharedAppPage({ params }) {
  const { token } = await params;
  const supabase = await createClient();
  const { data } = await supabase.rpc("read_public_app_share", { p_token: String(token || "") });
  const share = Array.isArray(data) ? data[0] : data;
  if (!share) notFound();
  const spec = share.specification || {};
  const pages = Array.isArray(spec.pages) ? spec.pages : [];
  const features = Array.isArray(spec.features) ? spec.features : [];
  return (
    <main className="shared"><div className="badge">AI APP BUILDER · PUBLIC DEMO</div><h1>{share.app_name}</h1><p>{share.app_description || "AI-generated application"}</p><section><h2>Preview</h2>{pages.map((p, i) => <div className="row" key={`${p?.name}-${i}`}><strong>{p?.name || `Page ${i + 1}`}</strong><span>{p?.purpose || "Application page"}</span></div>)}</section><section><h2>Features</h2>{features.map((f, i) => <div className="row" key={`${f?.name || f}-${i}`}><strong>{typeof f === "string" ? f : f?.name || "Feature"}</strong><span>{typeof f === "string" ? "AI-generated feature" : f?.description || "AI-generated feature"}</span></div>)}</section><footer>Shared from AI App Builder · Store publishing is not enabled by this public demo link.</footer><style>{`body{margin:0;background:#03100d;color:#f5fff9;font-family:Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}.shared{min-height:100vh;max-width:900px;margin:auto;padding:55px 20px;background:linear-gradient(145deg,#03100d,#0a2119 58%,#06140f)}.badge{color:#d8bf62;font-size:11px;font-weight:900;letter-spacing:.18em}h1{font-size:clamp(40px,7vw,72px);margin:12px 0}p{color:#9eb5ab;line-height:1.6;font-size:18px}section{margin-top:28px;padding:22px;border:1px solid rgba(255,255,255,.08);border-radius:20px;background:rgba(3,16,13,.72)}h2{margin-top:0}.row{display:flex;gap:18px;justify-content:space-between;padding:14px 0;border-bottom:1px solid rgba(255,255,255,.06)}.row span{color:#91aaa0;text-align:right}footer{color:#6f867d;margin-top:30px;font-size:13px}@media(max-width:650px){.row{display:block}.row span{display:block;text-align:left;margin-top:5px}}`}</style></main>
  );
}
