"use client";
import {useLayoutEffect} from "react";
import {PRODUCT_BRAND} from "../../lib/product-brand.js";

// Canonical customer brand: LANERIQ AI.
// SoolenAI remains the intentional powered-by / assistant identity where explicitly shown.
// Historical migration alias only: AI BUILD APP & WEB.
const REPLACEMENTS=[
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
      const approvedHome=Boolean(document.querySelector(".premiumHome"));
      const walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);const nodes=[];while(walker.nextNode())nodes.push(walker.currentNode);
      for(const node of nodes){
        const parent=node.parentElement;
        const tag=parent?.tagName;
        if(["SCRIPT","STYLE","TEXTAREA","INPUT"].includes(tag))continue;
        // The approved home hero and powered-by badge are intentional copy, not legacy text.
        if(approvedHome&&parent?.closest(".premiumHome .heroCopy"))continue;
        const next=rewrite(node.nodeValue);if(next!==node.nodeValue)node.nodeValue=next;
      }

      // Legacy pages may still need a canonical-brand migration. The approved homepage
      // renders its exact visual hierarchy directly and must never be rewritten here.
      if(!approvedHome){
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

      // Do not move creative cards on the approved homepage. Its DOM order is intentional.
      if(!approvedHome){
        const featureCards=document.querySelector(".featureCards");
        const templateCard=document.querySelector(".templateCard");
        if(featureCards&&templateCard){
          featureCards.classList.add("compactCreativeEntry");
          if(templateCard.nextElementSibling!==featureCards)templateCard.insertAdjacentElement("afterend",featureCards);
        }
      }

      const title=rewrite(document.title);
      if(document.title!==title)document.title=title;
      document.documentElement.dataset.productBrandReady="1";
    };
    fix();const o=new MutationObserver(fix);o.observe(document.body,{childList:true,subtree:true,characterData:true});return()=>o.disconnect();
  },[]);

  return null;
}
