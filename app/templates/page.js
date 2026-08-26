import Link from "next/link";
import { TEMPLATE_OBJECTS } from "../../engine/templates.js";

export default function TemplatesPage() {
  return (
    <main className="templatesPage">
      <header><div className="eyebrow">STARTER TEMPLATES</div><h1>Build faster with a proven starting point.</h1><p>Choose a template, then let Autonomous AI customize it for your business.</p><Link href="/" className="button">Create from scratch</Link></header>
      <section className="grid">
        {TEMPLATE_OBJECTS.map((t) => (
          <article className="card" key={t.id}>
            <div className="icon">✦</div><h2>{t.name}</h2><p>{t.description}</p>
            <Link href={`/?template=${encodeURIComponent(t.id)}`} className="use">Use template →</Link>
          </article>
        ))}
      </section>
      <style>{`body{margin:0;background:#03100d;color:#f5fff9;font-family:Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}.templatesPage{min-height:100vh;padding:50px clamp(18px,5vw,70px);background:linear-gradient(145deg,#03100d,#0a2119 58%,#06140f)}header{max-width:1180px;margin:0 auto 35px}h1{font-size:clamp(38px,6vw,68px);max-width:850px;margin:10px 0}p{color:#9eb5ab;line-height:1.6}.eyebrow{color:#d8bf62;font-size:12px;font-weight:900;letter-spacing:.2em}.button,.use{display:inline-flex;text-decoration:none;font-weight:800;border-radius:13px;padding:12px 16px}.button{background:#d8bf62;color:#07130e;margin-top:10px}.grid{max-width:1180px;margin:auto;display:grid;grid-template-columns:repeat(auto-fill,minmax(245px,1fr));gap:15px}.card{padding:21px;border:1px solid rgba(255,255,255,.08);border-radius:20px;background:rgba(3,16,13,.76)}.icon{width:42px;height:42px;display:grid;place-items:center;border-radius:12px;background:linear-gradient(145deg,#d8bf62,#8c7331);color:#07130e}.card h2{font-size:19px}.use{margin-top:8px;background:#0e3024;color:#d8bf62;width:calc(100% - 32px);justify-content:center}`}</style>
    </main>
  );
}
