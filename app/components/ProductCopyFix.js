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

function upgradeApprovedHomeCreativeEntries(home){
  const designLink=home.querySelector('.featureCards a[href="/image-studio?mode=design"],.featureCards a[href="/design-studio"]');
  if(!designLink)return;
  designLink.setAttribute("href","/design-studio");
  designLink.setAttribute("aria-label","Design App and Website UI concepts");
  const title=designLink.querySelector("b");
  const description=designLink.querySelector("span");
  if(title)title.textContent="Design UI";
  if(description)description.textContent="Explore App & Website interface directions";
  designLink.dataset.laneriqDesignUiEntry="1";
}

export default function ProductCopyFix(){
  useLayoutEffect(()=>{
    const fix=()=>{
      const home=document.querySelector(".premiumHome");
      const approvedHome=Boolean(home);

      /* The homepage now has a dedicated final CSS authority. Do not broadly rewrite its
         React-owned DOM or re-enable the retired laneriqHomeV3 layer. We only normalize
         the Design UI creative entry here so its accessible text and direct route match
         the LIUI product behavior instead of relying on a visual pseudo-element override. */
      if(approvedHome){
        home.classList.remove("laneriqHomeV3");
        upgradeApprovedHomeCreativeEntries(home);
        document.documentElement.dataset.productBrandReady="1";
        return;
      }

      const walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);const nodes=[];while(walker.nextNode())nodes.push(walker.currentNode);
      for(const node of nodes){
        const parent=node.parentElement;
        const tag=parent?.tagName;
        if(["SCRIPT","STYLE","TEXTAREA","INPUT"].includes(tag))continue;
        const next=rewrite(node.nodeValue);if(next!==node.nodeValue)node.nodeValue=next;
      }

      const hero=document.querySelector(".heroCopy h1");
      if(hero&&hero.dataset.productBrand!=="3"){
        hero.innerHTML=`<span>${PRODUCT_BRAND.name}</span><strong>${PRODUCT_BRAND.productLine}</strong>`;
        hero.dataset.productBrand="3";
      }
      const heroCopy=document.querySelector(".heroCopy > p");
      if(heroCopy&&heroCopy.dataset.productBrand!=="3"){
        heroCopy.innerHTML=`${PRODUCT_BRAND.descriptor}<br/>${PRODUCT_BRAND.tagline}`;
        heroCopy.dataset.productBrand="3";
      }
      const powered=document.querySelector(".powered");
      if(powered&&powered.dataset.productBrand!=="3"){
        powered.innerHTML=`⌘ Powered by <b>${PRODUCT_BRAND.poweredBy}</b>`;
        powered.dataset.productBrand="3";
      }

      // The main one-click builder currently creates App + Website together.
      // Game remains a separate Pro creation path, so do not mislabel this CTA as a Game build action.
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

    fix();

    /* The approved homepage is static enough that a whole-body observer is both
       unnecessary and expensive on embedded iPhone browsers. Other routes retain
       the migration observer because their legacy copy can still mount later. */
    if(document.querySelector(".premiumHome")) return undefined;

    const o=new MutationObserver(fix);
    o.observe(document.body,{childList:true,subtree:true,characterData:true});
    return()=>o.disconnect();
  },[]);

  return null;
}
