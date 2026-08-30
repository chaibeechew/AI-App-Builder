"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function StudioLauncher(){
  const pathname = usePathname();
  if (pathname === "/studio") return null;
  return <Link href="/studio" className="studioLauncher" aria-label="Open all-in-one studio">✦ <span>Studio</span><style jsx>{`
    .studioLauncher{position:fixed;left:14px;bottom:18px;z-index:82;display:flex;align-items:center;gap:8px;text-decoration:none;border:1px solid #e0bd61aa;border-radius:999px;background:#071713e8;color:#f2cf72;padding:11px 14px;font:900 12px/1 Inter,system-ui,sans-serif;box-shadow:0 14px 45px #0008;backdrop-filter:blur(14px)}
    .studioLauncher span{color:#fff}@media(max-width:640px){.studioLauncher{left:10px;bottom:14px;padding:10px 12px}.studioLauncher span{display:none}}
  `}</style></Link>;
}
