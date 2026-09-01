import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "../../lib/supabase/server.js";

export default async function BrandKitPage({ searchParams }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth?next=/brand-kit");

  const { data: kit } = await supabase
    .from("brand_kits")
    .select("company_name,logo_url,primary_color,secondary_color,accent_color,font_style,brand_voice,updated_at")
    .eq("user_id", user.id)
    .maybeSingle();

  async function saveBrandKit(formData) {
    "use server";
    const client = await createClient();
    const { data: { user: currentUser } } = await client.auth.getUser();
    if (!currentUser) redirect("/auth?next=/brand-kit");

    const cleanHex = (value, fallback) => {
      const v = String(value || "").trim();
      return /^#[0-9a-fA-F]{6}$/.test(v) ? v : fallback;
    };

    const payload = {
      user_id: currentUser.id,
      company_name: String(formData.get("company_name") || "").trim().slice(0, 120),
      logo_url: String(formData.get("logo_url") || "").trim().slice(0, 1000),
      primary_color: cleanHex(formData.get("primary_color"), "#0b5d46"),
      secondary_color: cleanHex(formData.get("secondary_color"), "#f4f0e6"),
      accent_color: cleanHex(formData.get("accent_color"), "#d8bf62"),
      font_style: String(formData.get("font_style") || "Modern Humanist").trim().slice(0, 80),
      brand_voice: String(formData.get("brand_voice") || "Clear, warm and natural").trim().slice(0, 300),
      updated_at: new Date().toISOString(),
    };

    const { error } = await client.from("brand_kits").upsert(payload, { onConflict: "user_id" });
    if (error) redirect(`/brand-kit?error=${encodeURIComponent("Unable to save Brand Kit")}`);
    redirect("/brand-kit?saved=1");
  }

  const params = await searchParams;
  const saved = params?.saved === "1";
  const error = params?.error;

  return <main className="brandPage"><div className="wrap">
    <div className="topbar"><Link href="/studio">← Studio</Link><span>BRAND KIT · REUSABLE IDENTITY</span></div>
    <header><small>ONE BRAND, EVERY BUILD</small><h1>Brand Kit</h1><p>Save your identity once. LANERIQ AI can use the same logo, colors, typography direction and brand voice across future App + Website projects.</p></header>
    {saved ? <div className="success">✓ Brand Kit saved.</div> : null}
    {error ? <div className="error">{error}</div> : null}
    <form action={saveBrandKit} className="panel">
      <section><label>Company / Brand Name</label><input name="company_name" defaultValue={kit?.company_name || ""} placeholder="Your company or product name" maxLength={120}/></section>
      <section><label>Logo URL</label><input name="logo_url" defaultValue={kit?.logo_url || ""} placeholder="https://..."/><small>Image upload will be connected to Asset Library next. For now, a secure hosted logo URL can be reused.</small></section>
      <div className="colors">
        <section><label>Primary</label><div className="colorRow"><input type="color" name="primary_color" defaultValue={kit?.primary_color || "#0b5d46"}/><code>{kit?.primary_color || "#0b5d46"}</code></div></section>
        <section><label>Secondary</label><div className="colorRow"><input type="color" name="secondary_color" defaultValue={kit?.secondary_color || "#f4f0e6"}/><code>{kit?.secondary_color || "#f4f0e6"}</code></div></section>
        <section><label>Accent</label><div className="colorRow"><input type="color" name="accent_color" defaultValue={kit?.accent_color || "#d8bf62"}/><code>{kit?.accent_color || "#d8bf62"}</code></div></section>
      </div>
      <section><label>Typography Direction</label><select name="font_style" defaultValue={kit?.font_style || "Modern Humanist"}><option>Modern Humanist</option><option>Editorial Serif</option><option>Clean Geometric</option><option>Luxury Minimal</option><option>Friendly Rounded</option><option>Technical Professional</option></select></section>
      <section><label>Brand Voice</label><textarea name="brand_voice" defaultValue={kit?.brand_voice || "Clear, warm and natural"} maxLength={300} placeholder="Example: calm, trustworthy, premium, natural and concise"/></section>
      <div className="actions"><button type="submit">Save Brand Kit</button><Link href="/">Use in a New Build →</Link></div>
    </form>
    <section className="principles"><article><b>Original</b><p>Brand Kit guides new design; it does not copy third-party identity.</p></article><article><b>Private by default</b><p>Your Brand Kit is protected by per-user database access rules.</p></article><article><b>Reusable</b><p>One identity can guide future App, Website and publishing assets.</p></article></section>
  </div><style>{`
    *{box-sizing:border-box}.brandPage{min-height:100vh;padding:28px 18px 80px;background:radial-gradient(circle at 75% 10%,rgba(216,191,98,.14),transparent 25%),linear-gradient(145deg,#03100d,#0a2119 58%,#06140f);color:#f5fff9}.wrap{max-width:980px;margin:auto}.topbar{display:flex;justify-content:space-between;color:#d8bf62;font-size:11px;letter-spacing:.14em}.topbar a{color:#fff;text-decoration:none;border:1px solid rgba(255,255,255,.12);padding:10px 13px;border-radius:999px}header{padding:60px 0 28px}header small{color:#d8bf62;letter-spacing:.18em;font-weight:900}h1{font-size:clamp(48px,8vw,78px);margin:8px 0 12px;letter-spacing:-.045em}header p{max-width:760px;color:#a3b6ae;line-height:1.7}.panel{background:rgba(3,16,13,.78);border:1px solid rgba(216,191,98,.24);border-radius:24px;padding:24px;display:grid;gap:18px}.panel section{display:grid;gap:8px}.panel label{font-weight:900;color:#e8d88e}.panel input,.panel select,.panel textarea{width:100%;border:1px solid rgba(255,255,255,.12);background:#0a2119;color:#fff;border-radius:12px;padding:13px;font:inherit}.panel textarea{min-height:110px;resize:vertical}.panel small{color:#839b91}.colors{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}.colorRow{display:flex;align-items:center;gap:10px}.colorRow input[type=color]{width:54px;height:44px;padding:3px}.colorRow code{color:#b9c8c2}.actions{display:flex;gap:10px;flex-wrap:wrap}.actions button,.actions a{padding:13px 17px;border-radius:12px;font-weight:900;text-decoration:none}.actions button{border:0;background:#d8bf62;color:#07130e;cursor:pointer}.actions a{border:1px solid rgba(216,191,98,.26);color:#d8bf62}.success,.error{padding:13px 15px;border-radius:13px;margin-bottom:14px}.success{background:rgba(70,190,140,.1);color:#8de0bb}.error{background:rgba(210,80,70,.12);color:#ffaaa0}.principles{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-top:16px}.principles article{border:1px solid rgba(255,255,255,.08);background:rgba(3,16,13,.65);border-radius:18px;padding:18px}.principles b{color:#d8bf62}.principles p{color:#91a79e;line-height:1.5;font-size:13px}@media(max-width:700px){.colors,.principles{grid-template-columns:1fr}.topbar span{display:none}}
  `}</style></main>;
}
