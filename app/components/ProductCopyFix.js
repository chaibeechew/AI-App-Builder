"use client";
import {useLayoutEffect} from "react";
import {PRODUCT_BRAND} from "../../lib/product-brand.js";

const REPLACEMENTS=[
  [/Powered by\s+SoolenAI/gi,`Powered by ${PRODUCT_BRAND.name}`],
  [/SoolenAI/gi,PRODUCT_BRAND.name],
  [/Soolen AI/gi,PRODUCT_BRAND.name],
  [/AI BUILD APP\s*&\s*WEB/gi,PRODUCT_BRAND.name],
  [/AI制作APP&WEB/gi,PRODUCT_BRAND.name],
  [/CREOVA AI/gi,PRODUCT_BRAND.name],
  [/AI APP\s*&\s*WEB CREATOR/gi,PRODUCT_BRAND.name],
  [/AI App\s*&\s*Web Creator/gi,PRODUCT_BRAND.name],
  [/AI APP BUILDER/gi,PRODUCT_BRAND.name],
  [/AI App Builder/gi,PRODUCT_BRAND.name],
];
function rewrite(value){let next=String(value||"");for(const [pattern,replacement] of REPLACEMENTS)next=next.replace(pattern,replacement);return next;}

export default function ProductCopyFix(){
  useLayoutEffect(()=>{
    const fix=()=>{
      const walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);const nodes=[];while(walker.nextNode())nodes.push(walker.currentNode);
      for(const node of nodes){const tag=node.parentElement?.tagName;if(["SCRIPT","STYLE","TEXTAREA","INPUT"].includes(tag))continue;const next=rewrite(node.nodeValue);if(next!==node.nodeValue)node.nodeValue=next;}

      const hero=document.querySelector(".heroCopy h1");
      if(hero&&hero.dataset.productBrand!=="2"){
        hero.innerHTML=`<span>${PRODUCT_BRAND.name}</span><strong>${PRODUCT_BRAND.productLine}</strong>`;
        hero.dataset.productBrand="2";
      }
      const heroCopy=document.querySelector(".heroCopy > p");
      if(heroCopy&&heroCopy.dataset.productBrand!=="2"){
        heroCopy.innerHTML=`${PRODUCT_BRAND.descriptor}<br/>${PRODUCT_BRAND.tagline}`;
        heroCopy.dataset.productBrand="2";
      }

      const promptLabel=document.querySelector(".promptHead label");
      if(promptLabel)promptLabel.textContent="Describe the App & Website you want to build";
      const ideaBox=document.querySelector(".promptCard textarea");
      if(ideaBox)ideaBox.setAttribute("placeholder","Example: Build a property CRM app and customer website for my business…");

      document.querySelectorAll("button,a").forEach(el=>{
        const t=(el.textContent||"").trim();
        if(/Generate My App|BUILD MY APP|BUILD APP \+ WEBSITE|CREATE APP\s*[•·]\s*GAME\s*[•·]\s*WEB/i.test(t)||/^✨?\s*Build App\s*→?$/i.test(t))el.textContent="BUILD APP + WEBSITE →";
        if(/^Ṫ?\s*Text to (?:App|Product)$/i.test(t))el.textContent="Ṫ Text to App";
      });

      const featureCards=document.querySelector(".featureCards");
      const templateCard=document.querySelector(".templateCard");
      if(featureCards&&templateCard){
        featureCards.classList.add("compactCreativeEntry");
        if(templateCard.nextElementSibling!==featureCards)templateCard.insertAdjacentElement("afterend",featureCards);
      }

      const title=rewrite(document.title);
      if(document.title!==title)document.title=title;
      document.documentElement.dataset.productBrandReady="1";
    };
    fix();const o=new MutationObserver(fix);o.observe(document.body,{childList:true,subtree:true,characterData:true});return()=>o.disconnect();
  },[]);

  return <style jsx global>{`
    body[data-premium-page="home"] .heroCopy h1 span{font-size:clamp(44px,10vw,72px)!important;line-height:.96!important}
    body[data-premium-page="home"] .heroCopy h1 strong{font-size:clamp(21px,4.8vw,34px)!important;line-height:1.05!important;letter-spacing:-.025em!important;margin-top:8px!important;color:#f2d276!important}
    body[data-premium-page="home"] .heroCopy>p{font-size:clamp(13px,2.4vw,17px)!important;line-height:1.45!important;margin:15px 0 10px!important}
    body[data-premium-page="home"] .featureCards.compactCreativeEntry{margin:10px 0 14px!important;gap:8px!important}
    body[data-premium-page="home"] .featureCards.compactCreativeEntry .feature{min-height:66px!important;padding:9px 11px!important;border-radius:16px!important;grid-template-columns:36px 1fr!important;gap:9px!important}
    body[data-premium-page="home"] .featureCards.compactCreativeEntry .feature>i{width:34px!important;height:34px!important;font-size:17px!important}
    body[data-premium-page="home"] .featureCards.compactCreativeEntry .feature b{font-size:12px!important;color:#f2d276!important}
    body[data-premium-page="home"] .featureCards.compactCreativeEntry .feature span,
    body[data-premium-page="home"] .featureCards.compactCreativeEntry .feature em{display:none!important}
    @media(max-width:420px){
      body[data-premium-page="home"] .heroCopy h1 span{font-size:46px!important}
      body[data-premium-page="home"] .heroCopy h1 strong{font-size:22px!important}
      body[data-premium-page="home"] .featureCards.compactCreativeEntry{grid-template-columns:1fr 1fr!important}
    }
  `}</style>;
}
