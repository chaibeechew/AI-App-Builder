"use client";
import Link from "next/link";
import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { TEMPLATE_OBJECTS } from "../../../engine/templates.js";

export default function TemplateDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const template = TEMPLATE_OBJECTS.find((item) => item.id === id);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  if (!template) return <main className="page"><h1>Template not found</h1><Link href="/templates">Back to templates</Link></main>;
  async function useTemplate() {
    setLoading(true); setError("");
    try {
      const response = await fetch("/api/generate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ idea: `Create a ${template[1]} app. ${template[2]}. Start from the ${template[1]} starter template and make it simple for a personal or small business user.` }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || "Unable to generate the app.");
      router.push(data?.app?.id ? `/editor/${data.app.id}` : "/my-apps");
    } catch (e) { setError(e.message); } finally { setLoading(false); }
  }
  return <main className="page"><div className="eyebrow">STARTER TEMPLATE</div><h1>{template[1]}</h1><p>{template[2]}</p><button onClick={useTemplate} disabled={loading}>{loading ? "Building with Autonomous AI…" : "Build this App →"}</button>{error && <div className="error">{error}</div>}<Link href="/templates">← All templates</Link><style>{`body{margin:0;background:#03100d;color:#f5fff9;font-family:Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}.page{min-height:100vh;max-width:800px;margin:auto;padding:70px 20px;background:linear-gradient(145deg,#03100d,#0a2119 58%,#06140f)}.eyebrow{color:#d8bf62;font-size:12px;font-weight:900;letter-spacing:.2em}h1{font-size:clamp(42px,7vw,76px);margin:12px 0}p{color:#9eb5ab;font-size:20px;line-height:1.7}button{border:0;border-radius:14px;padding:16px 24px;background:#d8bf62;color:#07130e;font-weight:900;font-size:17px;margin:20px 0;display:block}button:disabled{opacity:.6}.error{color:#ff9a9a;margin:10px 0 25px}a{color:#d8bf62;text-decoration:none}`}</style></main>;
}
