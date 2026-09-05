"use client";

import {useEffect,useRef,useState} from "react";
import {createDeviceEvidenceSessionV7,recordDeviceEnvironmentV7,recordDeviceFrameSampleV7,sanitizeDeviceEvidenceForExportV7} from "../../lib/game/game-world-device-evidence-v7.js";
import styles from "../game-world-v6/runtime-v6.module.css";

function viewportClass(){const w=Math.min(innerWidth,innerHeight);return w<500?"compact":w<900?"medium":"large";}
function memoryClass(){const m=Number(navigator.deviceMemory||0);return !m?"unknown":m<=4?"low":m<=8?"balanced":"high";}
function cpuClass(){const c=Number(navigator.hardwareConcurrency||0);return !c?"unknown":c<=4?"low":c<=8?"balanced":"high";}

export default function DeviceEvidenceV7Panel({route="/game-world-v7"}){
  const [claim,setClaim]=useState("unknown"),[consent,setConsent]=useState(false),[exported,setExported]=useState(null),[copied,setCopied]=useState(false);
  const sessionRef=useRef(null),lastSample=useRef(0);
  useEffect(()=>{
    const publish=s=>{const out=sanitizeDeviceEvidenceForExportV7(s);window.__LANERIQ_V7_DEVICE_EVIDENCE__=out;setExported(out);};
    if(!consent){sessionRef.current=null;delete window.__LANERIQ_V7_DEVICE_EVIDENCE__;setExported(null);return;}
    let s=createDeviceEvidenceSessionV7({consent:true,deviceClaim:claim,route,source:"foreground-browser"});
    const v6=window.__LANERIQ_V6_EVIDENCE__;
    s=recordDeviceEnvironmentV7(s,{touch:matchMedia?.("(pointer: coarse)")?.matches===true||navigator.maxTouchPoints>0,foreground:document.visibilityState==="visible",webdriver:navigator.webdriver===true,graphicsApi:v6?.browser?.api||"unknown",rendererClass:v6?.browser?.rendererClass||"unknown",viewportClass:viewportClass(),memoryClass:memoryClass(),cpuClass:cpuClass()});
    sessionRef.current=s;publish(s);
    const tick=()=>{
      if(!sessionRef.current)return;
      const e=window.__LANERIQ_V6_EVIDENCE__,sample=e?.samples?.at?.(-1)||null,summary=e?.summary;
      const time=performance.now();
      if(document.visibilityState==="visible"&&time-lastSample.current>=700&&(sample||summary?.medianFps>0)){
        const fps=Number(sample?.fps||summary?.medianFps||0),frameMs=Number(sample?.frameMs||summary?.medianFrameMs||(fps?1000/fps:0));
        sessionRef.current=recordDeviceFrameSampleV7(sessionRef.current,{fps,frameMs,longFrameRatio:Number(sample?.longFrameRatio||summary?.avgLongFrameRatio||0),residentChunks:Number(sample?.residentChunks||summary?.maxResidentChunks||0),renderScale:Number(sample?.renderScale||1),foreground:true,elapsedMs:time});
        lastSample.current=time;publish(sessionRef.current);
      }
    };
    const id=setInterval(tick,800);return()=>clearInterval(id);
  },[consent,claim,route]);
  const copy=async()=>{if(!exported)return;try{await navigator.clipboard.writeText(JSON.stringify(exported,null,2));setCopied(true);setTimeout(()=>setCopied(false),1200);}catch{setCopied(false);}};
  return <article className={styles.panel} data-testid="device-evidence-v7">
    <small>REAL DEVICE EVIDENCE · LOCAL FIRST</small>
    <h2>Measure a foreground phone session without turning it into a fingerprint.</h2>
    <div className={styles.list}>
      <label><span>Device claim</span><select aria-label="Device claim" value={claim} onChange={e=>setClaim(e.target.value)}><option value="unknown">Unknown</option><option value="iphone">iPhone</option><option value="android">Android</option><option value="tablet">Tablet</option><option value="desktop">Desktop</option></select></label>
      <label><span>Consent</span><input aria-label="Consent to local device evidence" type="checkbox" checked={consent} onChange={e=>setConsent(e.target.checked)}/></label>
      <div><span>Foreground browser measured</span><b data-testid="foreground-measured">{String(exported?.truth?.foregroundBrowserMeasured===true)}</b></div>
      <div><span>Native device attested</span><b data-testid="native-attested">{String(exported?.truth?.nativeDeviceAttested===true)}</b></div>
      <div><span>Median FPS</span><b data-testid="device-median-fps">{Math.round(exported?.summary?.medianFps||0)}</b></div>
      <div><span>Thermal pressure proxy</span><b>{exported?.thermalProxy?.level||"insufficient"}</b></div>
      <div><span>Measured temperature</span><b>false</b></div>
    </div>
    <p>Consent enables only coarse local evidence. Raw user-agent, IP, location, exact screen size and cross-session identifiers are not stored. A browser session cannot self-promote to native iOS/Android attestation.</p>
    <button type="button" onClick={copy} disabled={!exported}>{copied?"Evidence copied":"Copy sanitized evidence"}</button>
  </article>;
}
