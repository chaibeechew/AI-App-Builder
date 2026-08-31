"use client";

import Link from "next/link";
import {usePathname} from "next/navigation";

const CREATIVE=[
  {href:"/image-studio?mode=create",eyebrow:"AI ART",title:"AI Art Generator",text:"Concept art, illustrations, characters, environments and game artwork."},
  {href:"/video-studio",eyebrow:"AI VIDEO",title:"AI Video Generator",text:"Realistic, cartoon and mixed video projects with truthful render status."},
  {href:"/image-studio?mode=create",eyebrow:"PHOTO + VIDEO",title:"AI Photo & Video",text:"Mixed visual creation for products, games, social content and store media."},
  {href:"/avatar-studio",eyebrow:"AI AVATAR",title:"AI Avatar Creator",text:"Player avatars, NPC concepts, presenters, mascots and profile characters."}
];

export default function CreationCapabilityBanner(){
  const pathname=usePathname();
  if(pathname!=="/")return null;
  return <section className="creationExpansion" aria-label="AI BUILD APP&WEB creation capabilities">
    <div className="inner">
      <div className="headline"><div><small>ONE IDEA · YOUR OWN PRODUCT</small><h2>Build your own <b>App</b>, <b>Website</b> or <b>Mobile Game</b>.</h2><p>You bring the idea. SoolenAI plans, designs and builds the product foundation—mobile-first, with iOS + Android targets for mobile apps and games, plus a fast web preview path.</p></div><div className="platforms"><span>iOS</span><span>Android</span><span>Web</span><span>Mobile Game</span></div></div>
      <div className="creativeGrid">{CREATIVE.map(item=><Link href={item.href} key={item.title}><small>{item.eyebrow}</small><strong>{item.title}</strong><span>{item.text}</span><em>Open ›</em></Link>)}</div>
      <div className="gameCallout"><div><small>SOOLENAI GAME BUILDER FOUNDATION</small><strong>From “I have a game idea” to a real game plan.</strong><span>Core loop · touch controls · levels · characters · physics · save/load · audio · progression · performance · privacy · iOS/Android store readiness.</span></div><Link href="/?idea=mobile-game">Create a Game ›</Link></div>
    </div>
    <style jsx>{`.creationExpansion{position:relative;z-index:20;background:#020705;color:#eef8f3;padding:24px 14px 72px;font-family:Inter,system-ui,-apple-system,sans-serif}.inner{max-width:1180px;margin:auto;border:1px solid #ffffff12;border-radius:30px;padding:28px;background:linear-gradient(145deg,#071812f2,#04100ceb);box-shadow:0 30px 100px #0009;overflow:hidden}.headline{display:flex;justify-content:space-between;gap:28px;align-items:flex-end}.headline small,.gameCallout small{color:#d8bf62;font-size:10px;font-weight:950;letter-spacing:.18em}.headline h2{font-size:clamp(30px,5vw,58px);line-height:1.02;margin:9px 0 13px;max-width:800px}.headline h2 b{color:#d8bf62}.headline p{max-width:780px;color:#8fa49a;line-height:1.55;font-size:13px}.platforms{display:flex;gap:7px;flex-wrap:wrap;justify-content:flex-end}.platforms span{border:1px solid #d8bf6233;background:#d8bf620d;color:#d8bf62;border-radius:999px;padding:8px 10px;font-size:9px;font-weight:900;white-space:nowrap}.creativeGrid{display:grid;grid-template-columns:repeat(4,1fr);gap:9px;margin-top:24px}.creativeGrid a{min-height:154px;border:1px solid #ffffff10;background:#0a2119;border-radius:18px;padding:16px;text-decoration:none;color:#fff;display:flex;flex-direction:column;transition:.2s transform,.2s border-color}.creativeGrid a:hover{transform:translateY(-2px);border-color:#d8bf6255}.creativeGrid small{font-size:8px;letter-spacing:.15em;color:#729588}.creativeGrid strong{font-size:17px;margin:7px 0}.creativeGrid span{font-size:10px;line-height:1.45;color:#849990;flex:1}.creativeGrid em{font-style:normal;color:#d8bf62;font-size:10px;font-weight:900;margin-top:12px}.gameCallout{margin-top:10px;padding:18px;border-radius:18px;border:1px solid #d8bf6226;background:radial-gradient(circle at 80% 20%,#d8bf6217,transparent 33%),#061711;display:flex;justify-content:space-between;gap:24px;align-items:center}.gameCallout>div{display:grid;gap:6px}.gameCallout strong{font-size:19px}.gameCallout span{color:#82998f;font-size:10px;line-height:1.45}.gameCallout a{white-space:nowrap;text-decoration:none;background:#d8bf62;color:#07110d;padding:11px 14px;border-radius:12px;font-size:11px;font-weight:950}@media(max-width:820px){.inner{padding:20px}.headline{display:grid}.platforms{justify-content:flex-start}.creativeGrid{grid-template-columns:1fr 1fr}.gameCallout{display:grid}.gameCallout a{width:max-content}}@media(max-width:460px){.creativeGrid{grid-template-columns:1fr}.headline h2{font-size:34px}}`}</style>
  </section>;
}
