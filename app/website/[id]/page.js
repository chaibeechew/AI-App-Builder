import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "../../../lib/supabase/server.js";

function label(value, fallback) {
  if (typeof value === "string" && value.trim()) return value.trim();
  return value?.name || value?.label || value?.title || fallback;
}

export async function generateMetadata({ params }) {
  const { id } = await params;
  return { title: "Customer Website", description: "Website created with AI App Builder", alternates: { canonical: `/website/${id}` } };
}

export default async function CustomerWebsite({ params, searchParams }) {
  const { id } = await params;
  const query = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: app } = await supabase.from("apps").select("id,owner_id,name,description,current_version_id,visibility,publish_status").eq("id", id).single();
  if (!app) notFound();
  const isOwner = app.owner_id === user?.id;
  const canView = isOwner || app.visibility === "public" || app.publish_status === "published";
  if (!canView) notFound();

  const { data: versions } = await supabase.from("app_versions").select("id,version_no,specification").eq("app_id", id).order("version_no", { ascending: false });
  const current = versions?.find(v => v.id === app.current_version_id) || versions?.[0];
  const spec = current?.specification || {};
  const pages = Array.isArray(spec.pages) && spec.pages.length ? spec.pages : [{ name: "Home", purpose: app.description }];
  const features = Array.isArray(spec.features) ? spec.features : [];
  const design = spec.designSystem || {};
  const primary = design.primaryColor || "#12664f";
  const accent = design.accentColor || "#d9ad45";
  const showDomainHelp = query?.domain === "1";

  return <main className="site" style={{ "--primary": primary, "--accent": accent }}>
    {isOwner && <div className="ownerBar"><span>{app.publish_status === "published" ? "LIVE CUSTOMER WEBSITE" : "WEBSITE PREVIEW"}</span><div><Link href={`/app-dashboard/${id}`}>Project Folder</Link><Link href={`/release/${id}`}>Publish Options</Link></div></div>}
    {showDomainHelp && isOwner && <div className="domainHelp"><b>Custom domain</b><span>Publish the website first, then connect the customer’s domain from this project’s Website settings.</span><Link href={`/release/${id}`}>Back to Website settings</Link></div>}
    <header className="nav"><a className="logo" href="#home">✦ {app.name}</a><nav>{pages.slice(0, 5).map((page, index) => <a key={index} href={`#section-${index}`}>{label(page, `Page ${index + 1}`)}</a>)}</nav><a className="cta small" href="#contact">Contact</a></header>
    <section id="home" className="hero"><div><small>WELCOME TO</small><h1>{app.name}</h1><p>{app.description || spec.description || "A customer website created with AI App Builder."}</p><div className="heroActions"><a className="cta" href="#section-0">Explore Website</a><a className="ghost" href="#contact">Get in Touch</a></div></div><div className="visual"><span>✦</span><b>{label(pages[0], "Welcome")}</b><p>{pages[0]?.purpose || pages[0]?.description || "Everything your customers need, in one place."}</p></div></section>
    <section className="featureGrid">{features.slice(0, 6).map((feature, index) => <article key={index}><span>{String(index + 1).padStart(2, "0")}</span><h2>{label(feature, `Feature ${index + 1}`)}</h2><p>{typeof feature === "object" ? feature.description || "Designed for your customers." : "Designed for your customers."}</p></article>)}</section>
    {pages.map((page, index) => <section id={`section-${index}`} className={index % 2 ? "content alternate" : "content"} key={index}><div><small>SECTION {String(index + 1).padStart(2, "0")}</small><h2>{label(page, `Page ${index + 1}`)}</h2></div><div><p>{page?.purpose || page?.description || "Customer-focused information and services."}</p>{Array.isArray(page?.features) && <ul>{page.features.slice(0, 5).map((item, i) => <li key={i}>✓ {label(item, "Website feature")}</li>)}</ul>}</div></section>)}
    <section id="contact" className="contact"><small>READY WHEN YOU ARE</small><h2>Connect with {app.name}</h2><p>Use this website to introduce the business, services and customer experience.</p><a className="cta" href="mailto:">Contact Us</a></section>
    <footer><strong>{app.name}</strong><span>Customer Website · Created with AI App Builder</span></footer>
    <style>{`*{box-sizing:border-box;scroll-behavior:smooth}.site{min-height:100vh;background:#f5f7f4;color:#102c23;font-family:Inter,system-ui,-apple-system,sans-serif}.ownerBar{display:flex;justify-content:space-between;align-items:center;gap:18px;padding:10px 5%;background:#071a14;color:#d8bf62;font-size:11px;font-weight:900;letter-spacing:.12em}.ownerBar div{display:flex;gap:14px}.ownerBar a{color:#fff;text-decoration:none;letter-spacing:0}.domainHelp{display:flex;align-items:center;justify-content:center;gap:14px;flex-wrap:wrap;padding:12px 5%;background:#fff4c9;color:#493b0c;font-size:13px}.domainHelp a{color:#12664f;font-weight:900}.nav{max-width:1180px;margin:auto;padding:23px 20px;display:flex;align-items:center;justify-content:space-between;gap:24px}.logo{font-size:19px;font-weight:950;color:var(--primary);text-decoration:none}.nav nav{display:flex;gap:22px}.nav nav a{color:#52645d;text-decoration:none;font-weight:750;font-size:13px}.hero{max-width:1180px;margin:auto;padding:70px 20px 90px;display:grid;grid-template-columns:1.15fr .85fr;gap:55px;align-items:center}.hero small,.content small,.contact small{color:var(--primary);font-weight:950;letter-spacing:.18em}.hero h1{font-size:clamp(52px,8vw,92px);line-height:.95;margin:16px 0 22px;letter-spacing:-.055em}.hero>div>p{max-width:670px;font-size:20px;line-height:1.65;color:#5c6e66}.heroActions{display:flex;gap:11px;margin-top:28px}.cta,.ghost{display:inline-flex;align-items:center;justify-content:center;border-radius:999px;padding:14px 20px;font-weight:900;text-decoration:none}.cta{background:var(--primary);color:#fff}.ghost{border:1px solid #bdcac4;color:var(--primary)}.small{padding:10px 15px}.visual{min-height:390px;display:flex;flex-direction:column;justify-content:flex-end;padding:34px;border-radius:42px;background:linear-gradient(145deg,var(--primary),#071a14);color:#fff;box-shadow:0 28px 65px #0b2d2240}.visual span{font-size:62px;color:var(--accent);margin:auto}.visual b{font-size:31px}.visual p{color:#cfddd7;line-height:1.55}.featureGrid{max-width:1180px;margin:0 auto 80px;padding:0 20px;display:grid;grid-template-columns:repeat(3,1fr);gap:14px}.featureGrid article{padding:26px;border-radius:22px;background:#fff;box-shadow:0 12px 40px #0c291b0b}.featureGrid span{color:var(--accent);font-weight:950}.featureGrid h2{font-size:20px}.featureGrid p,.content p,.contact p{color:#61736b;line-height:1.65}.content{padding:80px max(20px,calc((100% - 1140px)/2));display:grid;grid-template-columns:1fr 1fr;gap:60px;align-items:start;background:#fff}.content.alternate{background:#e9f0ec}.content h2,.contact h2{font-size:clamp(35px,5vw,56px);margin:12px 0}.content p{font-size:18px}.content ul{padding:0;list-style:none;display:grid;gap:10px}.content li{padding:12px 14px;border-radius:12px;background:#f5f7f4;font-weight:750}.contact{text-align:center;padding:100px 20px;background:#0b2c22;color:#fff}.contact p{color:#bfd0c9}.contact .cta{background:var(--accent);color:#172018;margin-top:15px}footer{display:flex;justify-content:space-between;gap:20px;padding:28px 5%;background:#061711;color:#d1ddd8}footer span{opacity:.7}@media(max-width:760px){.ownerBar,.nav,footer{align-items:flex-start}.ownerBar,.nav,footer{flex-direction:column}.nav nav{max-width:100%;overflow:auto}.nav .small{display:none}.hero,.content{grid-template-columns:1fr}.hero{padding-top:40px;gap:30px}.visual{min-height:320px}.featureGrid{grid-template-columns:1fr}.content{gap:10px;padding-top:60px;padding-bottom:60px}.heroActions{flex-wrap:wrap}}`}</style>
  </main>;
}
