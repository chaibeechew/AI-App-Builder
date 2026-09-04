"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo } from "react";

// Route-aware presentation only. These names never replace the underlying generation,
// project, workflow, database, quality or publish engines.
const SURFACES = [
  [/^\/$/, "creation"],
  [/^\/create\/?$/, "creation"],
  [/^\/preview\//, "preview"],
  [/^\/release\//, "launch"],
  [/^\/app-dashboard\//, "manage"],
  [/^\/my-apps\/?$/, "creations"],
  [/^\/templates\/?$/, "templates"],
  [/^\/templates\//, "template-detail"],
  [/^\/soolen-ai\/?$/, "assistant"],
  [/^\/workflows\//, "workflow"],
  [/^\/analytics\//, "analytics"],
  [/^\/studio\/?$/, "more"],
  [/^\/image-studio\/?$/, "media"],
  [/^\/video-studio\/?$/, "media"],
  [/^\/avatar-studio\/?$/, "media"],
  [/^\/brand-kit\/?$/, "brand"],
  [/^\/asset-library\/?$/, "assets"],
  [/^\/account\/device-compute\/?$/, "account"],
  [/^\/editor\//, "editor"],
  [/^\/database\//, "database"],
  [/^\/operations\//, "quality"],
  [/^\/publish\//, "publish"],
];

// Approved LIUI-2026.2 global information architecture.
// The five primary destinations stay stable while creation/project subflows adapt contextually.
const NAV = [
  { label: "Home", href: "/", icon: "⌂" },
  { label: "Projects", href: "/my-apps", icon: "▣" },
  { label: "Create", href: "/create", icon: "✦" },
  { label: "Templates", href: "/templates", icon: "▦" },
  { label: "More", href: "/studio", icon: "≡" },
];

function resolveSurface(pathname){
  for(const [pattern,name] of SURFACES) if(pattern.test(pathname || "")) return name;
  return "";
}

function selectedLabel(pathname){
  if(pathname === "/") return "Home";
  if(pathname === "/create" || pathname === "/create/") return "Create";
  if(pathname === "/templates" || pathname === "/templates/" || pathname?.startsWith("/templates/")) return "Templates";
  if(
    pathname === "/studio" || pathname === "/studio/" || pathname === "/soolen-ai" || pathname === "/soolen-ai/" ||
    pathname === "/image-studio" || pathname === "/image-studio/" || pathname === "/video-studio" || pathname === "/video-studio/" ||
    pathname === "/avatar-studio" || pathname === "/avatar-studio/" || pathname === "/brand-kit" || pathname === "/brand-kit/" ||
    pathname === "/asset-library" || pathname === "/asset-library/" || pathname === "/account/device-compute" || pathname === "/account/device-compute/"
  ) return "More";
  if(
    pathname === "/my-apps" || pathname === "/my-apps/" ||
    pathname?.startsWith("/app-dashboard/") || pathname?.startsWith("/preview/") ||
    pathname?.startsWith("/release/") || pathname?.startsWith("/workflows/") ||
    pathname?.startsWith("/analytics/") || pathname?.startsWith("/editor/") ||
    pathname?.startsWith("/database/") || pathname?.startsWith("/operations/") ||
    pathname?.startsWith("/publish/")
  ) return "Projects";
  return "";
}

export default function LIUIRealProductSurface(){
  const pathname=usePathname() || "";
  const surface=useMemo(()=>resolveSurface(pathname),[pathname]);
  const active=selectedLabel(pathname);

  useEffect(()=>{
    if(surface) document.body.dataset.liuiSurface=surface;
    else delete document.body.dataset.liuiSurface;
    document.documentElement.dataset.liuiRealProduct="2026";
    return()=>{ if(document.body.dataset.liuiSurface===surface) delete document.body.dataset.liuiSurface; };
  },[surface]);

  if(!surface) return null;

  return <nav className="liuiRealBottomNav" aria-label="LANERIQ AI primary navigation" data-liui-nav="canonical">
    {NAV.map(item=><Link key={item.label} href={item.href} className={active===item.label?"active":""} aria-current={active===item.label?"page":undefined}>
      <span aria-hidden="true">{item.icon}</span><small>{item.label}</small>
    </Link>)}
  </nav>;
}
