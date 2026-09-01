"use client";
import {useLayoutEffect} from "react";
import {PRODUCT_BRAND} from "../../lib/product-brand.js";

// Canonical customer brand: LANERIQ AI. Rendering remains sourced from PRODUCT_BRAND.
// Legacy customer-facing brand aliases migrate to the canonical PRODUCT_BRAND name.
const REPLACEMENTS=[
  [/AI BUILD APP\s*&\s*WEB/gi,PRODUCT_BRAND.name],
  [/AI制作APP&WEB/gi,PRODUCT_BRAND.name],
  [/CREOVA AI/gi,PRODUCT_BRAND.name],
  [/AI APP\s*&\s*WEB CREATOR/gi,PRODUCT_BRAND.name],
  [/AI App\s*&\s*Web Creator/gi,PRODUCT_BRAND.name],
  [/AI APP BUILDER/gi,PRODUCT_BRAND.name],
  [/AI App Builder/gi,PRODUCT_BRAND.name],
  [/Build stunning Apps\s*&\s*Websites\. No code\. Just ideas\./gi,PRODUCT_BRAND.tagline],
];
function rewrite(value){let next=String(value||"");for(const [pattern,replacement] of REPLACEMENTS)next=next.replace(pattern,replacement);return next;}

export default function ProductCopyFix(){
  useLayoutEffect(()=>{
    const fix=()=>{
      const walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);const nodes=[];while(walker.nextNode())nodes.push(walker.currentNode);
      for(const node of nodes){const tag=node.parentElement?.tagName;if(["SCRIPT","STYLE","TEXTAREA","INPUT"].includes(tag))continue;const next=rewrite(node.nodeValue);if(next!==node.nodeValue)node.nodeValue=next;}

      const hero=document.querySelector(".heroCopy h1");
      if(hero&&hero.dataset.productBrand!=="1"){
        hero.innerHTML=`<span>${PRODUCT_BRAND.name}</span><strong>${PRODUCT_BRAND.capabilities}</strong>`;
        hero.dataset.productBrand="1";
      }
      const heroCopy=document.querySelector(".heroCopy > p");
      if(heroCopy&&heroCopy.dataset.productBrand!=="1"){
        heroCopy.innerHTML=`${PRODUCT_BRAND.descriptor}<br/>${PRODUCT_BRAND.tagline}`;
        heroCopy.dataset.productBrand="1";
      }
      const promptLabel=document.querySelector(".promptHead label");
      if(promptLabel&&/App\s*&\s*Website/i.test(promptLabel.textContent||""))promptLabel.textContent="Describe the App, Game or Website you want to create";
      const ideaBox=document.querySelector(".promptCard textarea");
      if(ideaBox&&/App and a customer Website|App.*Website/i.test(ideaBox.getAttribute("placeholder")||""))ideaBox.setAttribute("placeholder","Example: Create a property CRM app, a customer website, or a mobile game from one idea…");

      document.querySelectorAll("button,a").forEach(el=>{
        const t=(el.textContent||"").trim();
        if(/Generate My App|BUILD MY APP|BUILD APP \+ WEBSITE/i.test(t)||/^✨?\s*Build App\s*→?$/i.test(t))el.textContent="🚀 CREATE APP • GAME • WEB →";
        if(/^Ṫ?\s*Text to App$/i.test(t))el.textContent="Ṫ Text to Product";
      });
      const title=rewrite(document.title);
      if(document.title!==title)document.title=title;
      document.documentElement.dataset.productBrandReady="1";
    };
    fix();const o=new MutationObserver(fix);o.observe(document.body,{childList:true,subtree:true,characterData:true});return()=>o.disconnect();
  },[]);return null;
}
