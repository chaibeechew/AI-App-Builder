"use client";

import Link from "next/link";
import {usePathname} from "next/navigation";
import {PRODUCT_BRAND} from "../../lib/product-brand.js";

const CREATIVE=[
  {href:"/image-studio?mode=create",title:"AI Art Generator"},
  {href:"/video-studio",title:"AI Video Generator"},
  {href:"/image-studio?mode=create",title:"AI Photo & Video Generator"},
  {href:"/avatar-studio",title:"AI Avatar Creator"}
];

export default function CreationCapabilityBanner(){
  const pathname=usePathname();
  if(pathname!=="/")return null;
  return <section className="creationExpansion" aria-label={`${PRODUCT_BRAND.name} creation capabilities`}>
    <div className="inner">
      <div className="headline"><h2>{PRODUCT_BRAND.productLine}</h2><div className="platforms"><span>APP</span><span>WEB</span><span>GAME · PRO</span></div></div>
      <div className="creativeGrid">{CREATIVE.map(item=><Link href={item.href} key={item.title}><strong>{item.title}</strong><em>Open ›</em></Link>)}</div>
      <div className="gameCallout"><strong>Pro Game Creator</strong><Link href="/game-builder">Become Pro ›</Link></div>
    </div>
    <style jsx>{`.creationExpansion{position:relative;z-index:20;background:#020705;color:#eef8f3;padding:16px 14px 72px;font-family:Inter,system-ui,-apple-system,sans-serif}.inner{max-width:1180px;margin:auto;border:1px solid #ffffff12;border-radius:26px;padding:22px;background:linear-gradient(145deg,#071812f2,#04100ceb);box-shadow:0 30px 100px #0009;overflow:hidden}.headline{display:flex;justify-content:space-between;gap:18px;align-items:center}.headline h2{font-size:clamp(26px,4vw,42px);line-height:1;margin:0}.platforms{display:flex;gap:7px;flex-wrap:wrap;justify-content:flex-end}.platforms span{border:1px solid #d8bf6233;background:#d8bf620d;color:#d8bf62;border-radius:999px;padding:7px 9px;font-size:9px;font-weight:900;white-space:nowrap}.creativeGrid{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-top:18px}.creativeGrid a{min-height:78px;border:1px solid #ffffff10;background:#0a2119;border-radius:15px;padding:13px;text-decoration:none;color:#fff;display:flex;align-items:center;justify-content:space-between;gap:10px}.creativeGrid strong{font-size:13px;line-height:1.2}.creativeGrid em{font-style:normal;color:#d8bf62;font-size:10px;font-weight:900;white-space:nowrap}.gameCallout{margin-top:9px;padding:14px;border-radius:15px;border:1px solid #d8bf6226;background:#061711;display:flex;justify-content:space-between;gap:16px;align-items:center}.gameCallout strong{font-size:16px}.gameCallout a{white-space:nowrap;text-decoration:none;background:#d8bf62;color:#07110d;padding:10px 12px;border-radius:11px;font-size:10px;font-weight:950}@media(max-width:820px){.headline{align-items:flex-start}.creativeGrid{grid-template-columns:1fr 1fr}}@media(max-width:460px){.inner{padding:16px}.headline{display:grid}.platforms{justify-content:flex-start}.headline h2{font-size:27px}.creativeGrid{grid-template-columns:1fr 1fr}.creativeGrid a{min-height:66px;padding:10px}.creativeGrid strong{font-size:11px}.gameCallout{padding:12px}.gameCallout strong{font-size:14px}}`}</style>
  </section>;
}
