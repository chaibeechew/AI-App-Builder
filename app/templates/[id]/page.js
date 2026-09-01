"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";

export default function TemplateDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [template, setTemplate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const templateId = useMemo(() => String(id || "").slice(0, 140), [id]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    fetch(`/api/templates?id=${encodeURIComponent(templateId)}`, { cache: "no-store" })
      .then(async (response) => {
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data?.error || "Template not found.");
        if (active) setTemplate(data?.template || null);
      })
      .catch((cause) => active && setError(cause?.message || "Template not found."))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [templateId]);

  function useTemplate() {
    if (!template) return;
    const instruction = [
      `Create an original ${template.industry} ${template.archetype} App and customer Website.`,
      `Use this LANERIQ AI template only as inspiration: ${template.title}.`,
      `Visual direction: ${template.style}.`,
      `Useful page ideas: ${(template.pages || []).join(", ")}.`,
      `Useful capabilities: ${(template.features || []).join(", ")}.`,
      "Keep the result mobile-first and responsive across mobile, tablet and desktop.",
      "Reimagine the information architecture, layout, components, copy, visuals and interactions for my own product.",
      "Do not copy third-party brand identity, text, images, source code, proprietary layouts or distinctive trade dress.",
      "Produce a fresh App + Website and let the normal AI Planning gate validate the requirements before generation."
    ].join("\n");

    try {
      sessionStorage.setItem("soolenAppIdea", instruction);
      sessionStorage.setItem("soolenInspirationTemplate", JSON.stringify({
        id: template.id,
        schemaVersion: template.schemaVersion,
        industry: template.industry,
        archetype: template.archetype,
        style: template.style,
        application: "inspiration-only",
      }));
    } catch {}
    router.push("/");
  }

  if (loading) return <main className="page"><div className="eyebrow">LANERIQ AI · TEMPLATE</div><h1>Loading inspiration…</h1><style>{styles}</style></main>;
  if (!template) return <main className="page"><div className="eyebrow">LANERIQ AI · TEMPLATE</div><h1>Template not found</h1><p>{error || "This inspiration is unavailable."}</p><Link href="/templates">← Back to templates</Link><style>{styles}</style></main>;

  return <main className="page">
    <div className="eyebrow">LANERIQ AI · INSPIRATION TEMPLATE</div>
    <h1>{template.title}</h1>
    <p>{template.description}</p>
    <div className="meta"><span>{template.industry}</span><span>{template.archetype}</span><span>{template.style}</span><span>Mobile-first</span></div>
    <section><h2>Suggested pages</h2><div className="chips">{(template.pages || []).map((item) => <span key={item}>{item}</span>)}</div></section>
    <section><h2>Suggested capabilities</h2><div className="chips">{(template.features || []).map((item) => <span key={item}>{item}</span>)}</div></section>
    <div className="notice">Inspiration only. LANERIQ AI will re-plan and reimagine the structure, visuals and copy rather than clone a third-party product.</div>
    <button onClick={useTemplate}>Use as inspiration →</button>
    {error && <div className="error">{error}</div>}
    <Link href="/templates">← All templates</Link>
    <style>{styles}</style>
  </main>;
}

const styles = `body{margin:0;background:#03100d;color:#f5fff9;font-family:Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}.page{min-height:100vh;max-width:860px;margin:auto;padding:70px 20px;background:linear-gradient(145deg,#03100d,#0a2119 58%,#06140f)}.eyebrow{color:#d8bf62;font-size:12px;font-weight:900;letter-spacing:.2em}h1{font-size:clamp(42px,7vw,76px);margin:12px 0}p{color:#9eb5ab;font-size:20px;line-height:1.7}.meta,.chips{display:flex;flex-wrap:wrap;gap:8px}.meta span,.chips span{border:1px solid #ffffff18;border-radius:999px;padding:8px 11px;background:#ffffff08;color:#c6d7cf;font-size:12px}section{margin-top:28px;padding:18px;border:1px solid #ffffff12;border-radius:18px;background:#061813}section h2{font-size:15px;color:#efd171;margin:0 0 12px}.notice{margin-top:22px;padding:15px;border:1px solid #d8bf6242;border-radius:14px;background:#2f271050;color:#cfddcf;line-height:1.5;font-size:13px}button{border:0;border-radius:14px;padding:16px 24px;background:#d8bf62;color:#07130e;font-weight:900;font-size:17px;margin:20px 0;display:block;cursor:pointer}.error{color:#ff9a9a;margin:10px 0 25px}a{color:#d8bf62;text-decoration:none}@media(max-width:560px){.page{padding-top:42px}h1{font-size:44px}p{font-size:17px}button{width:100%}}`;
