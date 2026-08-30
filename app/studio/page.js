import Link from "next/link";
import { BUILD_STANDARDS } from "../../lib/buildStandards.js";

const modules = [
  ["AI Build", "Generate App + Website from text, voice, photo, video, sketch or reference."],
  ["Project Center", "Keep projects, status, previews and publishing in one workspace."],
  ["Templates", "Browse 3,000+ industry inspirations and Trending 100, then AI Reimagine."],
  ["Visual Editor", "Select content and visual areas, then refine them with AI instructions."],
  ["Brand Kit", "Reuse logo, colors, fonts and company identity across every project."],
  ["Asset Library", "Keep reusable images, videos, logos and documents inside the workspace."],
  ["Database", "Plan data, relationships, permissions and business records from the app idea."],
  ["Automations", "Connect forms, CRM, email, notifications and follow-up workflows."],
  ["Integrations", "Prepare connections for payments, maps, calendar, email, messaging and APIs."],
  ["Monetization", "Subscriptions, plans, one-time payments, memberships and customer billing."],
  ["Version History", "Save meaningful changes and prepare rollback points before publishing."],
  ["Quality Gate", "Check stability, security, privacy, comfort, beauty and naturalness."],
  ["Publish Center", "One flow for Web, PWA, iPhone, Android and custom-domain release."],
  ["Analytics", "Measure traffic, conversions, usage and product health after launch."],
  ["AI Operations", "Use AI to review issues, user feedback and improvement opportunities."],
  ["Export & Ownership", "Keep project portability, exportability and customer ownership visible."],
];

export default function StudioPage() {
  return (
    <main className="studioShell">
      <div className="studioBackdrop" />
      <header className="studioTop">
        <Link href="/" className="back">← AI APP BUILDER</Link>
        <span>SOOLENAI · ALL-IN-ONE STUDIO</span>
      </header>

      <section className="heroStudio">
        <small>FROM IDEA TO LIVE PRODUCT</small>
        <h1>One place to build,<br/><em>test, protect and publish.</em></h1>
        <p>AI App Builder is being organized as one continuous service: idea → design → build → data → automation → quality → preview → publish → improve.</p>
        <div className="heroActions">
          <Link href="/" className="primary">Start a Build →</Link>
          <Link href="/templates" className="secondary">Browse Inspirations</Link>
        </div>
      </section>

      <section className="qualityPanel">
        <div className="sectionHead"><div><small>DEFAULT BUILD STANDARD</small><h2>Six quality gates before release</h2></div><b>Target: production-ready direction</b></div>
        <div className="qualityGrid">
          {BUILD_STANDARDS.map((item) => <article key={item.id}><span>{item.target}+</span><h3>{item.name}</h3><p>{item.checks.slice(0,2).join(" · ")}</p></article>)}
        </div>
        <p className="qualityNote">These gates are design and specification checks, not a claim of guaranteed security or legal compliance. Runtime, dependency, infrastructure and real-device testing are still required before production release.</p>
      </section>

      <section className="modules">
        <div className="sectionHead"><div><small>ONE-STOP PLATFORM</small><h2>Everything stays inside the builder</h2></div><b>{modules.length} product modules</b></div>
        <div className="moduleGrid">
          {modules.map(([name, description], index) => <article key={name}><span>{String(index + 1).padStart(2,"0")}</span><h3>{name}</h3><p>{description}</p></article>)}
        </div>
      </section>

      <section className="flowBar">
        <b>Idea</b><i>→</i><b>Design</b><i>→</i><b>Build</b><i>→</i><b>Quality</b><i>→</i><b>Preview</b><i>→</i><b>Publish</b><i>→</i><b>Improve</b>
      </section>

      <style>{`
        *{box-sizing:border-box}.studioShell{min-height:100vh;background:#071713;color:#f7f3e8;font-family:Inter,system-ui,-apple-system,sans-serif;position:relative;overflow:hidden;padding-bottom:80px}.studioBackdrop{position:fixed;inset:0;background:radial-gradient(circle at 68% 18%,rgba(235,196,102,.18),transparent 28%),linear-gradient(180deg,rgba(2,15,12,.32),rgba(2,15,12,.92)),url('/soolen-ai-landscape.jpg') center/cover;filter:saturate(.9);z-index:0}.studioTop,.heroStudio,.qualityPanel,.modules,.flowBar{position:relative;z-index:1}.studioTop{display:flex;justify-content:space-between;align-items:center;padding:22px 5%;font-size:11px;letter-spacing:.14em;font-weight:900}.studioTop span{color:#e5c66c}.back{color:#fff;text-decoration:none;border:1px solid #ffffff33;padding:10px 13px;border-radius:999px;background:#061b15aa;backdrop-filter:blur(12px)}.heroStudio{max-width:1100px;margin:auto;padding:90px 24px 55px}.heroStudio small,.sectionHead small{color:#e4c46b;letter-spacing:.16em;font-weight:900}.heroStudio h1{font-size:clamp(48px,8vw,96px);line-height:.94;letter-spacing:-.055em;margin:16px 0 22px;max-width:950px;text-shadow:0 18px 60px #000}.heroStudio em{font-style:normal;color:#e7c66c}.heroStudio p{max-width:760px;font-size:18px;line-height:1.7;color:#d8e1dc}.heroActions{display:flex;gap:12px;flex-wrap:wrap;margin-top:28px}.heroActions a{text-decoration:none;font-weight:900;padding:15px 20px;border-radius:14px}.primary{background:linear-gradient(135deg,#f3da8b,#c9912e);color:#17231e}.secondary{border:1px solid #ffffff44;background:#061b15bb;color:#fff;backdrop-filter:blur(12px)}.qualityPanel,.modules{width:min(1120px,calc(100% - 28px));margin:18px auto;background:rgba(5,27,22,.72);border:1px solid rgba(232,199,107,.35);border-radius:28px;padding:clamp(20px,4vw,36px);backdrop-filter:blur(24px);box-shadow:0 30px 90px #0006}.sectionHead{display:flex;justify-content:space-between;gap:20px;align-items:flex-end;margin-bottom:22px}.sectionHead h2{font-size:clamp(28px,4vw,44px);margin:6px 0 0;letter-spacing:-.035em}.sectionHead>b{color:#e5c66c;font-size:12px}.qualityGrid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}.qualityGrid article,.moduleGrid article{background:rgba(255,255,255,.075);border:1px solid rgba(255,255,255,.12);border-radius:18px;padding:18px}.qualityGrid span{display:inline-flex;width:48px;height:48px;align-items:center;justify-content:center;border-radius:50%;background:#e5c66c;color:#173027;font-weight:1000}.qualityGrid h3,.moduleGrid h3{font-size:20px;margin:12px 0 7px}.qualityGrid p,.moduleGrid p,.qualityNote{color:#bdcbc4;line-height:1.55;font-size:13px}.qualityNote{margin:18px 2px 0}.moduleGrid{display:grid;grid-template-columns:repeat(4,1fr);gap:12px}.moduleGrid span{color:#e5c66c;font-size:11px;font-weight:900}.flowBar{max-width:1120px;margin:24px auto 0;padding:16px 20px;display:flex;justify-content:center;gap:13px;flex-wrap:wrap;border:1px solid #ffffff22;border-radius:999px;background:#061b15b8;backdrop-filter:blur(14px)}.flowBar i{color:#d2ad4f}@media(max-width:820px){.qualityGrid{grid-template-columns:1fr 1fr}.moduleGrid{grid-template-columns:1fr 1fr}.sectionHead{align-items:flex-start;flex-direction:column}.heroStudio{padding-top:58px}}@media(max-width:520px){.qualityGrid,.moduleGrid{grid-template-columns:1fr}.studioTop span{display:none}.heroStudio h1{font-size:50px}.flowBar{margin-inline:12px;border-radius:24px}}
      `}</style>
    </main>
  );
}
