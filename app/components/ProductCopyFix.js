"use client";
import {useEffect} from "react";

const REPLACEMENTS=[
  [/AI APP & WEB CREATOR/gi,"AI BUILD APP & WEB"],
  [/AI App & Web Creator/gi,"AI BUILD APP & WEB"],
  [/AI APP BUILDER/gi,"AI BUILD APP & WEB"],
  [/AI App Builder/gi,"AI BUILD APP & WEB"],
];
function rewrite(value){let next=String(value||"");for(const [pattern,replacement] of REPLACEMENTS)next=next.replace(pattern,replacement);return next;}

export default function ProductCopyFix(){
  useEffect(()=>{
    const fix=()=>{
      const walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);const nodes=[];while(walker.nextNode())nodes.push(walker.currentNode);
      for(const node of nodes){const tag=node.parentElement?.tagName;if(["SCRIPT","STYLE","TEXTAREA","INPUT"].includes(tag))continue;const next=rewrite(node.nodeValue);if(next!==node.nodeValue)node.nodeValue=next;}
      document.querySelectorAll("button,a").forEach(el=>{const t=(el.textContent||"").trim();if(/Generate My App|BUILD MY APP/i.test(t)||/^✨?\s*Build App\s*→?$/i.test(t))el.textContent="🚀 BUILD APP + WEBSITE →";});
      if(document.title!==rewrite(document.title))document.title=rewrite(document.title);
    };
    fix();const o=new MutationObserver(fix);o.observe(document.body,{childList:true,subtree:true,characterData:true});return()=>o.disconnect();
  },[]);return null;
}
