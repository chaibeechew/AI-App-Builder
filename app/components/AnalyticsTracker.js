"use client";

import { useEffect } from "react";

function clearLegacyAnalyticsSession(){
  try{sessionStorage.removeItem("soolenAnalyticsSession")}catch{}
}

function isEmbeddedPinnedPreview(){
  try{
    if(window.parent===window)return false;
    const params=new URLSearchParams(window.location.search);
    const surface=params.get("surface");
    return params.has("previewVersion")&&(surface==="app"||surface==="website");
  }catch{return false}
}

export async function trackProjectEvent({appId,eventName,channel="app"}){
  if(!appId||!eventName)return;
  try{await fetch("/api/analytics/event",{method:"POST",headers:{"Content-Type":"application/json"},keepalive:true,body:JSON.stringify({appId,eventName,channel})})}catch{}
}

export default function AnalyticsTracker({appId,channel="app",eventName}){
  useEffect(()=>{
    clearLegacyAnalyticsSession();
    if(isEmbeddedPinnedPreview())return;
    trackProjectEvent({appId,channel,eventName:eventName||`${channel}_view`});
  },[appId,channel,eventName]);
  return null;
}
