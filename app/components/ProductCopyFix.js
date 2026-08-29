"use client";
import {useEffect} from "react";
export default function ProductCopyFix(){useEffect(()=>{const fix=()=>{document.querySelectorAll("button,a").forEach(el=>{const t=(el.textContent||"").trim();if(/Generate My App/i.test(t))el.innerHTML="🚀 BUILD MY APP <b>→</b>";if(/^✨?\s*Build App\s*→?$/i.test(t))el.textContent="🚀 BUILD MY APP →"})};fix();const o=new MutationObserver(fix);o.observe(document.body,{childList:true,subtree:true});return()=>o.disconnect()},[]);return null}
