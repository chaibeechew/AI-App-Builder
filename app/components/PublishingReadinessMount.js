"use client";

import { usePathname } from "next/navigation";
import PublishingReadinessPanel from "../publish/[id]/PublishingReadinessPanel";

export default function PublishingReadinessMount(){
  const pathname=usePathname();
  const match=String(pathname||"").match(/^\/publish\/([^/]+)(?:\/|$)/);
  if(!match)return null;
  let appId=match[1];
  try{appId=decodeURIComponent(appId)}catch{}
  return <PublishingReadinessPanel appId={appId}/>;
}
