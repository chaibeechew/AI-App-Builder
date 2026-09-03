"use client";

import { useEffect } from "react";

function sessionId(){
  try{
    let id=sessionStorage.getItem("soolenAnalyticsSession");
    if(!id){id=crypto.randomUUID();sessionStorage.setItem("soolenAnalyticsSession",id)}
    return id;
  }catch{return ""}
}

function isEmbeddedPinnedPreview(){
  try{
    if(window.parent===window)return false;
    const params=new URLSearchParams(window.location.search);
    const surface=params.get("surface");
    return params.has("previewVersion")&&(surface==="app"||surface==="website");
  }catch{return false}
}

export async function trackProjectEvent({appId,eventName,channel="app",metadata={}}){
  if(!appId||!eventName)return;
  try{await fetch("/api/analytics/event",{method:"POST",headers:{"Content-Type":"application/json"},keepalive:true,body:JSON.stringify({appId,eventName,channel,sessionId:sessionId(),metadata})})}catch{}
}

export default function AnalyticsTracker({appId,channel="app",eventName}){
  useEffect(()=>{
    if(isEmbeddedPinnedPreview())return;
    trackProjectEvent({appId,channel,eventName:eventName||`${channel}_view`,metadata:{path:window.location.pathname}});
  },[appId,channel,eventName]);
  return null;
}
