import Link from "next/link";
import { PRODUCT_BRAND } from "../../lib/product-brand.js";
import { SEO_PAGES } from "../../lib/seo-foundation.js";

export default function SeoLandingPage({ slug }) {
  const page = SEO_PAGES[slug];
  if (!page) return null;
  const related = Object.entries(SEO_PAGES).filter(([key]) => key !== slug).slice(0, 4);
  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: page.faq.map(([question, answer]) => ({
      "@type": "Question",
      name: question,
      acceptedAnswer: { "@type": "Answer", text: answer },
    })),
  };

  return (
    <main className="seoPage">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
      <section className="seoHero">
        <div className="seoShell">
          <Link href="/" className="seoBrand" aria-label={`${PRODUCT_BRAND.name} home`}>
            <span>LANERIQ AI</span>
            <small>APPS • GAMES • WEB</small>
          </Link>
          <div className="seoEyebrow">{page.eyebrow}</div>
          <h1>{page.heading}</h1>
          <p className="seoIntro">{page.intro}</p>
          <div className="seoActions">
            <Link href={page.ctaHref} className="seoPrimary">{page.ctaLabel} →</Link>
            <Link href="/" className="seoSecondary">Explore LANERIQ AI</Link>
          </div>
          <p className="seoTagline">{PRODUCT_BRAND.tagline}</p>
        </div>
      </section>

      <section className="seoSection">
        <div className="seoShell">
          <div className="seoSectionHead"><small>WHY LANERIQ AI</small><h2>From idea to a testable product path</h2></div>
          <div className="seoGrid">{page.benefits.map((item, index) => <article key={item}><b>{String(index + 1).padStart(2, "0")}</b><h3>{item}</h3></article>)}</div>
        </div>
      </section>

      <section className="seoSection seoAlt">
        <div className="seoShell">
          <div className="seoSectionHead"><small>USE CASES</small><h2>What you can start creating</h2></div>
          <div className="seoUseCases">{page.examples.map(item => <div key={item}>✓ {item}</div>)}</div>
        </div>
      </section>

      <section className="seoSection">
        <div className="seoShell seoFaqWrap">
          <div className="seoSectionHead"><small>FAQ</small><h2>Common questions</h2></div>
          <div className="seoFaq">{page.faq.map(([question, answer]) => <details key={question}><summary>{question}</summary><p>{answer}</p></details>)}</div>
        </div>
      </section>

      <section className="seoTruth">
        <div className="seoShell"><strong>Truth boundary</strong><p>LANERIQ AI only claims production capabilities when the required external evidence exists. Live providers, signed native builds, measured real-device performance and official store approval remain explicitly evidence-gated.</p></div>
      </section>

      <section className="seoRelated">
        <div className="seoShell"><small>RELATED</small><div>{related.map(([key, item]) => <Link key={key} href={item.path}>{item.primaryKeyword} →</Link>)}</div></div>
      </section>

      <style>{`
        .seoPage{min-height:100vh;background:#020706;color:#eef7f3;font-family:Inter,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}.seoShell{width:min(1120px,calc(100% - 34px));margin:0 auto}.seoHero{padding:118px 0 84px;background:radial-gradient(circle at 74% 8%,rgba(216,191,98,.18),transparent 34%),radial-gradient(circle at 12% 52%,rgba(30,116,86,.2),transparent 32%),linear-gradient(155deg,#03110d,#020706 72%)}.seoBrand{display:inline-flex;align-items:center;gap:12px;text-decoration:none;color:#fff;border:1px solid #d8bf6230;border-radius:999px;padding:8px 13px;background:#071812aa}.seoBrand span{font-weight:950;letter-spacing:.05em}.seoBrand small{font-size:9px;letter-spacing:.16em;color:#d8bf62}.seoEyebrow,.seoSectionHead small,.seoRelated small{margin-top:54px;color:#d8bf62;font-size:11px;font-weight:950;letter-spacing:.18em}.seoHero h1{max-width:900px;margin:13px 0 18px;font-size:clamp(42px,8vw,84px);line-height:.98;letter-spacing:-.045em}.seoIntro{max-width:780px;color:#a7bbb2;font-size:18px;line-height:1.7}.seoActions{display:flex;gap:10px;flex-wrap:wrap;margin-top:28px}.seoActions a{border-radius:14px;padding:13px 17px;text-decoration:none;font-weight:900}.seoPrimary{background:#d8bf62;color:#07110d}.seoSecondary{border:1px solid #ffffff1f;color:#e8f1ed;background:#ffffff08}.seoTagline{margin-top:28px;color:#71887e;font-size:13px;letter-spacing:.05em}.seoSection{padding:76px 0;border-top:1px solid #ffffff0d}.seoAlt{background:#04110d}.seoSectionHead{max-width:720px}.seoSectionHead small{margin:0}.seoSectionHead h2{font-size:clamp(28px,5vw,50px);line-height:1.05;margin:10px 0 28px}.seoGrid{display:grid;grid-template-columns:repeat(4,1fr);gap:12px}.seoGrid article{min-height:160px;padding:20px;border:1px solid #ffffff12;border-radius:20px;background:linear-gradient(145deg,#071a14,#05110e)}.seoGrid article b{color:#d8bf62;font-size:11px;letter-spacing:.14em}.seoGrid article h3{font-size:18px;line-height:1.35;margin-top:28px}.seoUseCases{display:grid;grid-template-columns:1fr 1fr;gap:12px}.seoUseCases div{padding:18px;border-radius:16px;border:1px solid #ffffff12;background:#071712;color:#b8cbc3}.seoFaq{display:grid;gap:10px}.seoFaq details{border:1px solid #ffffff12;border-radius:16px;background:#06140f;padding:4px 18px}.seoFaq summary{cursor:pointer;padding:17px 0;font-weight:900}.seoFaq p{color:#9fb2aa;line-height:1.65;margin:0 0 18px}.seoTruth{padding:28px 0;background:#100d05;border-top:1px solid #d8bf6220;border-bottom:1px solid #d8bf6220}.seoTruth .seoShell{display:flex;gap:22px;align-items:flex-start}.seoTruth strong{color:#d8bf62;white-space:nowrap}.seoTruth p{margin:0;color:#9eaa9e;line-height:1.55;font-size:13px}.seoRelated{padding:52px 0 90px}.seoRelated small{display:block;margin:0 0 16px}.seoRelated div{display:flex;gap:10px;flex-wrap:wrap}.seoRelated a{padding:10px 13px;border-radius:999px;border:1px solid #ffffff14;color:#b9cdc4;text-decoration:none;font-size:12px}.seoRelated a:hover{border-color:#d8bf6255;color:#d8bf62}@media(max-width:820px){.seoHero{padding-top:96px}.seoGrid{grid-template-columns:1fr 1fr}.seoUseCases{grid-template-columns:1fr}.seoTruth .seoShell{display:grid}.seoBrand{align-items:flex-start;flex-direction:column;gap:3px;border-radius:16px}}@media(max-width:480px){.seoShell{width:min(100% - 24px,1120px)}.seoHero h1{font-size:44px}.seoIntro{font-size:16px}.seoGrid{grid-template-columns:1fr}.seoSection{padding:56px 0}}
      `}</style>
    </main>
  );
}
