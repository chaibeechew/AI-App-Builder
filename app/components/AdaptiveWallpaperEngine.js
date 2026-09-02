"use client";

import { useEffect,useMemo,useState } from "react";
import { WALLPAPER_PRESETS,pickWallpaperForStage,wallpaperStyle } from "../../lib/design/wallpaper-presets.js";

const STORAGE_KEY="ai-build-wallpaper";const SEED_KEY="ai-build-wallpaper-seed";const COOKIE_KEY="ai_build_wallpaper";const HOME_SIGNATURE_PRESET="moon-city";
function textOf(selector){if(typeof document==="undefined")return"";return String(document.querySelector(selector)?.textContent||"").toLowerCase();}
function detectStage(){
  if(typeof window==="undefined")return"idea";
  const path=window.location.pathname.toLowerCase();
  if(path==="/"||path===""){
    const progress=[textOf(".progress"),textOf(".buildProgress")].join(" ");
    if(progress.includes("understanding your idea"))return"understand";
    if(progress.includes("planning app + website"))return"plan";
    if(progress.includes("building both experiences"))return"build";
    if(progress.includes("testing and correcting"))return"test";
    if(progress.includes("preparing preview"))return"preview";
    if(textOf(".journeyPanel,.workspace").includes("live preview"))return"preview";
    if(textOf(".journeyPanel,.workspace").includes("ai plan"))return"plan";
    return"idea";
  }
  if(path.includes("/create")){
    const dynamic=[textOf(".message"),textOf(".build"),textOf(".plan"),textOf(".row button")].join(" ");
    if(dynamic.includes("organizing data")||dynamic.includes("connecting"))return"connect";
    if(dynamic.includes("building"))return"build";
    if(dynamic.includes("planning"))return"plan";
    if(dynamic.includes("checking"))return"understand";
    return"idea";
  }
  if(path.includes("/release")||path.includes("/publish"))return"publish";
  if(path.includes("/editor"))return"edit";
  if(path.includes("/video"))return"video";
  if(path.includes("/image-studio"))return"media";
  if(path.includes("/database"))return"data";
  if(path.includes("/workflows"))return"automation";
  if(path.includes("/integrations"))return"connect";
  if(path.includes("/monetization"))return"payments";
  if(path.includes("/analytics"))return"analytics";
  if(path.includes("/operations"))return"operations";
  if(path.includes("/pro/"))return"pro";
  if(path.includes("/app-dashboard")||path.includes("/my-apps"))return"preview";
  const body=(document.body?.innerText||"").toLowerCase().slice(0,10000);
  const signals=[["quality check","quality"],["testing and correcting","test"],["preparing preview","preview"],["publishing","publish"],["release","release"]];
  return signals.find(([value])=>body.includes(value))?.[1]||"idea";
}
function homeSignatureSurface(){if(typeof window==="undefined")return false;const path=window.location.pathname.toLowerCase();return path==="/"||path==="";}
function customerSurface(){if(typeof window==="undefined")return false;return /^\/a\//.test(window.location.pathname)||/^\/website\//.test(window.location.pathname);}
function persistChoice(id){try{localStorage.setItem(STORAGE_KEY,id);sessionStorage.setItem("aiBuildWallpaperPreset",id);document.cookie=`${COOKIE_KEY}=${encodeURIComponent(id)}; Path=/; Max-Age=31536000; SameSite=Lax`;}catch{}}
export default function AdaptiveWallpaperEngine(){
  const[choice,setChoice]=useState("random");const[seed,setSeed]=useState("session");const[stage,setStage]=useState("idea");const[open,setOpen]=useState(false);const[hidden,setHidden]=useState(false);
  useEffect(()=>{setHidden(customerSurface());try{const saved=localStorage.getItem(STORAGE_KEY);if(!homeSignatureSurface()&&saved&&(saved==="random"||WALLPAPER_PRESETS.some(x=>x.id===saved))){setChoice(saved);persistChoice(saved);}let s=sessionStorage.getItem(SEED_KEY);if(!s){s=crypto.randomUUID?.()||`${Date.now()}-${Math.random()}`;sessionStorage.setItem(SEED_KEY,s)}setSeed(s)}catch{}const update=()=>setStage(detectStage());update();const observer=new MutationObserver(()=>requestAnimationFrame(update));observer.observe(document.body,{childList:true,subtree:true,characterData:true,attributes:true});const wallpaperChange=e=>{const id=e?.detail?.id;if(id==="random"||WALLPAPER_PRESETS.some(x=>x.id===id)){setChoice(id);persistChoice(id);}};const stageChange=e=>{const next=String(e?.detail?.stage||"").trim().toLowerCase();if(next)setStage(next)};window.addEventListener("ai-build-wallpaper-change",wallpaperChange);window.addEventListener("ai-build-stage-change",stageChange);return()=>{observer.disconnect();window.removeEventListener("ai-build-wallpaper-change",wallpaperChange);window.removeEventListener("ai-build-stage-change",stageChange)}},[]);
  const active=useMemo(()=>choice==="random"&&["idea","understand"].includes(stage)?HOME_SIGNATURE_PRESET:choice==="random"?pickWallpaperForStage(stage,seed):choice,[choice,stage,seed]);
  useEffect(()=>{if(hidden)return;const style=wallpaperStyle(active);const apply=()=>document.querySelectorAll(".bg,.backdrop,.studioBackdrop,.authPage,main.page,main.studio").forEach(el=>{el.style.setProperty("background-image",style.backgroundImage,"important");el.style.setProperty("background-size",style.backgroundSize,"important");el.style.setProperty("background-position",style.backgroundPosition,"important");el.style.setProperty("background-repeat",style.backgroundRepeat,"important");el.dataset.aiWallpaper=active;el.dataset.aiStage=stage});apply();const timer=setTimeout(apply,120);return()=>clearTimeout(timer)},[active,hidden,stage]);
  function choose(id){setChoice(id);persistChoice(id);window.dispatchEvent(new CustomEvent("ai-build-wallpaper-change",{detail:{id}}))}
  if(hidden)return null;
  return <div className="wallpaperControl"><button className="wallpaperFab" onClick={()=>setOpen(v=>!v)} aria-label="Choose wallpaper">🎨 <span>Wallpaper</span></button>{open&&<div className="wallpaperPanel"><div className="panelHead"><div><small>AI-DESIGNED WALLPAPERS</small><b>{choice==="random"?`Signature home · AI scenes by step · ${stage}`:"Your selection"}</b></div><button onClick={()=>setOpen(false)}>×</button></div><div className="wallpaperGrid"><button className={choice==="random"?"picked":""} onClick={()=>choose("random")}><i style={wallpaperStyle(stage==="idea"||stage==="understand"?HOME_SIGNATURE_PRESET:pickWallpaperForStage(stage,seed))}/><span>AI Random · LANERIQ Signature</span><small>Big Moon Valley at home, changing scenes as the build progresses</small></button>{WALLPAPER_PRESETS.map(item=><button className={choice===item.id?"picked":""} key={item.id} onClick={()=>choose(item.id)}><i style={wallpaperStyle(item.id)}/><span>{item.name}</span><small>{item.description}</small></button>)}</div><p>These are original SoolenAI visual directions. Generated customer projects keep their own saved design and can choose a different wallpaper in the Visual Editor.</p></div>}<style jsx>{`.wallpaperControl{position:fixed;left:14px;bottom:16px;z-index:10000;font-family:Inter,system-ui,-apple-system,sans-serif}.wallpaperFab{border:1px solid #e1c66b66;background:#061a14e8;color:#f6dc84;border-radius:999px;padding:10px 13px;font-weight:900;box-shadow:0 12px 36px #0007;backdrop-filter:blur(14px)}.wallpaperPanel{position:absolute;left:0;bottom:52px;width:min(720px,calc(100vw - 28px));max-height:min(680px,72vh);overflow:auto;padding:15px;border:1px solid #d8bf6245;border-radius:22px;background:#03120ff5;color:#fff;box-shadow:0 28px 80px #000a;backdrop-filter:blur(24px)}.panelHead{display:flex;justify-content:space-between;gap:14px;align-items:flex-start}.panelHead small,.panelHead b{display:block}.panelHead small{color:#d8bf62;font-size:9px;letter-spacing:.16em;font-weight:900}.panelHead b{margin-top:4px;text-transform:capitalize}.panelHead>button{border:0;background:#ffffff12;color:#fff;width:32px;height:32px;border-radius:50%;font-size:20px}.wallpaperGrid{display:grid;grid-template-columns:repeat(3,1fr);gap:9px;margin-top:13px}.wallpaperGrid button{padding:7px;border:1px solid #ffffff13;background:#071d17;color:#fff;border-radius:15px;text-align:left}.wallpaperGrid button.picked{border-color:#e0c465;box-shadow:inset 0 0 0 1px #e0c46555}.wallpaperGrid i{display:block;height:92px;border-radius:11px;background-color:#07130f}.wallpaperGrid span,.wallpaperGrid small{display:block}.wallpaperGrid span{font-weight:900;margin:7px 3px 2px}.wallpaperGrid small{color:#8fa69c;font-size:9px;line-height:1.3;margin:0 3px 4px}.wallpaperPanel p{color:#8fa69c;font-size:10px;line-height:1.45;margin:12px 2px 0}@media(max-width:560px){.wallpaperFab span{display:none}.wallpaperGrid{grid-template-columns:1fr 1fr}.wallpaperGrid i{height:82px}.wallpaperPanel{max-height:66vh}}`}</style></div>;
}
