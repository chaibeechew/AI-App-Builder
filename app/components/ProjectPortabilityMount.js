"use client";

import { usePathname } from "next/navigation";
import ProjectPortabilityPanel from "./ProjectPortabilityPanel.js";

export default function ProjectPortabilityMount(){
  const pathname=usePathname()||"";
  const match=pathname.match(/^\/(?:publish|release)\/([0-9a-f-]{36})\/?$/i);
  if(!match)return null;
  return <div className="liuiPortabilityMount"><ProjectPortabilityPanel appId={match[1]}/><style jsx>{`.liuiPortabilityMount{width:min(1080px,calc(100% - 28px));margin:0 auto 120px;position:relative;z-index:8}`}</style></div>;
}
