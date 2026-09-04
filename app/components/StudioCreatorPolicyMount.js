"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";

export default function StudioCreatorPolicyMount(){
  const pathname=usePathname()||"";
  if(pathname!=="/studio"&&pathname!=="/studio/")return null;
  return <section className="studioCreatorPolicy" aria-label="Creator support and ownership">
    <div className="policyTitle"><small>CREATOR SUPPORT · OWNERSHIP · PORTABILITY</small><h2>Finish your work. Keep control of it.</h2><p>LANERIQ AI supports individual Creators while keeping project ownership and post-publish choices clear.</p></div>
    <div className="policyGrid">
      <article className="encourage"><span>✨</span><h3>Encourage Creator</h3><p>After your first free access is used, an eligible individual Creator with an unfinished project can request an extra 3 months of all-feature Creator Support Access. The special button appears only when relevant.</p><b>Tap “Encourage Creator” when it appears.</b></article>
      <article><span>◫</span><h3>Stay on LANERIQ AI</h3><p>After publishing, keep editing, versioning, testing, Self-Heal, analytics and republishing on the same project.</p><Link href="/my-apps">Open My Projects →</Link></article>
      <article><span>↗</span><h3>Migrate outside</h3><p>You can move a published project to your own hosting or another development team. No technical platform lock-in and no migration fee.</p><b>Before full migration: sign the project’s 10% Revenue Share Agreement.</b></article>
    </div>
    <style jsx>{`.studioCreatorPolicy{width:min(1120px,calc(100% - 28px));margin:18px auto 118px;position:relative;z-index:2;border:1px solid rgba(230,199,105,.31);border-radius:28px;padding:clamp(20px,4vw,34px);background:linear-gradient(145deg,rgba(6,25,45,.84),rgba(23,18,58,.76));box-shadow:0 30px 90px #0006;backdrop-filter:blur(24px);color:#f8fbff}.policyTitle small{color:#f0cf72;font-size:10px;font-weight:950;letter-spacing:.15em}.policyTitle h2{font-size:clamp(28px,4vw,44px);margin:7px 0 8px}.policyTitle p{color:#afbec7;line-height:1.6}.policyGrid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-top:18px}.policyGrid article{border:1px solid #ffffff16;border-radius:19px;padding:18px;background:rgba(255,255,255,.055)}.policyGrid article.encourage{background:linear-gradient(145deg,rgba(71,48,132,.20),rgba(255,255,255,.045));border-color:rgba(240,207,114,.24)}.policyGrid span{font-size:26px;color:#f0cf72}.policyGrid h3{margin:10px 0 7px;font-size:19px}.policyGrid p{color:#aebdc7;font-size:12px;line-height:1.58}.policyGrid b,.policyGrid a{display:block;margin-top:13px;color:#f1d57c;font-size:12px;text-decoration:none}@media(max-width:760px){.policyGrid{grid-template-columns:1fr}}`}</style>
  </section>;
}
