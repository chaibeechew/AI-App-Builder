"use client";

import Link from "next/link";

const demos = [
  { icon: "☕", title: "Coffee Shop", text: "Menu, opening hours, location and contact." },
  { icon: "📋", title: "Service Business", text: "Services, booking, customers and enquiries." },
  { icon: "👨‍👩‍👧", title: "Family App", text: "Simple information, activities and sharing." },
];

export default function LandingPage() {
  return (
    <main className="landing">
      <header className="nav">
        <div className="brand">
          <div className="brandMark">✦</div>
          <div>
            <strong>AI APP BUILDER</strong>
            <span>Create. Shape. Build.</span>
          </div>
        </div>
        <Link className="signIn" href="/auth?next=/">Sign In</Link>
      </header>

      <section className="hero">
        <div className="eyebrow">BUILD YOUR APP WITH AI</div>
        <h1>Your idea.<br /><span>Your app.</span></h1>
        <p>Turn a simple idea into a real app in minutes. No coding experience required.</p>
        <div className="actions">
          <Link className="primary" href="/auth?next=/">Create My App →</Link>
          <a className="secondary" href="#demo">See How It Works</a>
        </div>
        <div className="trust">English · 简体中文 · 繁體中文 · 日本語 · 한국어 · ไทย</div>
      </section>

      <section id="demo" className="demo">
        <div className="sectionHead">
          <div className="eyebrow">ONE IDEA. ONE APP.</div>
          <h2>See what you can build</h2>
          <p>From young creators to experienced business owners, anyone can start with an idea.</p>
        </div>
        <div className="demoGrid">
          {demos.map((demo) => (
            <div className="demoCard" key={demo.title}>
              <div className="demoIcon">{demo.icon}</div>
              <h3>{demo.title}</h3>
              <p>{demo.text}</p>
              <div className="miniPreview"><span></span><span></span><span></span></div>
            </div>
          ))}
        </div>
      </section>

      <section className="steps">
        <div><b>01</b><strong>Describe</strong><span>Tell AI what you want.</span></div>
        <div><b>02</b><strong>Generate</strong><span>AI plans your pages and features.</span></div>
        <div><b>03</b><strong>Preview</strong><span>See your app and modify it.</span></div>
        <div><b>04</b><strong>Publish</strong><span>Take your app to the next step.</span></div>
      </section>

      <footer>AI APP BUILDER · Build something from your idea.</footer>

      <style jsx>{`
        *{box-sizing:border-box}.landing{min-height:100vh;background:radial-gradient(circle at 50% 0%,#123d2d 0,#071b14 42%,#03100c 100%);color:#f5fff9;font-family:Arial,sans-serif}.nav{height:76px;display:flex;align-items:center;justify-content:space-between;padding:0 6%;border-bottom:1px solid rgba(216,191,98,.12)}.brand{display:flex;align-items:center;gap:12px}.brandMark{width:42px;height:42px;display:grid;place-items:center;border-radius:13px;background:#d8bf62;color:#07130e;font-size:20px}.brand strong{display:block;font-size:13px;letter-spacing:.14em}.brand span{display:block;margin-top:4px;color:#7f9b90;font-size:11px}.signIn{color:#d8bf62;text-decoration:none;font-weight:700}.hero{max-width:900px;margin:0 auto;padding:90px 24px 75px;text-align:center}.eyebrow{color:#d8bf62;font-size:11px;letter-spacing:.25em;font-weight:800}.hero h1{font-size:clamp(54px,9vw,92px);line-height:.96;margin:20px 0}.hero h1 span{color:#d8bf62}.hero p{max-width:650px;margin:0 auto;color:#a8bdb4;font-size:18px;line-height:1.7}.actions{display:flex;justify-content:center;gap:14px;margin:34px 0 20px;flex-wrap:wrap}.primary,.secondary{padding:15px 24px;border-radius:14px;text-decoration:none;font-weight:800}.primary{background:#d8bf62;color:#07130e}.secondary{border:1px solid rgba(216,191,98,.35);color:#e6eee9}.trust{color:#6f8a7e;font-size:12px;margin-top:22px}.demo{padding:75px 6%;background:rgba(255,255,255,.025)}.sectionHead{text-align:center;max-width:700px;margin:0 auto 35px}.sectionHead h2{font-size:40px;margin:12px 0}.sectionHead p{color:#91a89d;line-height:1.6}.demoGrid{max-width:1050px;margin:auto;display:grid;grid-template-columns:repeat(3,1fr);gap:18px}.demoCard{padding:25px;border:1px solid rgba(216,191,98,.16);border-radius:22px;background:rgba(5,25,18,.7)}.demoIcon{font-size:34px}.demoCard h3{margin:16px 0 8px}.demoCard p{color:#91a89d;min-height:44px;line-height:1.5}.miniPreview{height:100px;margin-top:20px;border-radius:14px;background:#0a261c;padding:15px;display:grid;gap:8px}.miniPreview span{display:block;border-radius:5px;background:rgba(216,191,98,.25)}.miniPreview span:first-child{width:45%;background:rgba(216,191,98,.7)}.steps{max-width:1050px;margin:auto;padding:70px 6%;display:grid;grid-template-columns:repeat(4,1fr);gap:25px}.steps div{display:flex;flex-direction:column;gap:7px}.steps b{color:#d8bf62;font-size:12px}.steps span{color:#7f958b;font-size:13px}.steps strong{font-size:18px}footer{text-align:center;padding:28px;color:#5e766b;font-size:12px;border-top:1px solid rgba(255,255,255,.06)}@media(max-width:760px){.demoGrid,.steps{grid-template-columns:1fr}.hero{padding-top:65px}.hero p{font-size:16px}.nav{padding:0 20px}}
      `}</style>
    </main>
  );
}
