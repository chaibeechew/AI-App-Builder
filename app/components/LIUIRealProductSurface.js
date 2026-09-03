"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo } from "react";

const SURFACES = [
  [/^\/$/, "creation"],
  [/^\/editor\//, "editor"],
  [/^\/operations\//, "quality"],
  [/^\/publish\//, "publish"],
  [/^\/release\//, "launch"],
  [/^\/preview\//, "preview"],
];

const NAV = [
  { label: "Home", href: "/", icon: "⌂" },
  { label: "Create", href: "/create", icon: "✦" },
  { label: "Creations", href: "/my-apps", icon: "▣" },
  { label: "Templates", href: "/templates", icon: "▦" },
  { label: "More", href: "/studio", icon: "≡" },
];

function resolveSurface(pathname){
  for(const [pattern,name] of SURFACES) if(pattern.test(pathname || "")) return name;
  return "";
}

function selectedLabel(pathname){
  if(pathname === "/") return "Home";
  if(pathname === "/create") return "Create";
  if(pathname?.startsWith("/my-apps") || pathname?.startsWith("/editor/") || pathname?.startsWith("/operations/") || pathname?.startsWith("/publish/") || pathname?.startsWith("/release/") || pathname?.startsWith("/preview/")) return "Creations";
  if(pathname?.startsWith("/templates")) return "Templates";
  if(pathname?.startsWith("/studio")) return "More";
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

  return <nav className="liuiRealBottomNav" aria-label="LANERIQ AI primary navigation">
    {NAV.map(item=><Link key={item.label} href={item.href} className={active===item.label?"active":""} aria-current={active===item.label?"page":undefined}>
      <span aria-hidden="true">{item.icon}</span><small>{item.label}</small>
    </Link>)}
  </nav>;
}
