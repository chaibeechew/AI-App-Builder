const ROLE_KEYWORDS = {
  logo:["logo","brand mark","wordmark","icon"],
  person:["person","people","portrait","agent","team","customer","testimonial"],
  property:["property","house","home","apartment","condo","room","interior","building","real estate"],
  product:["product","item","packaging","merchandise","catalog"],
  food:["food","dish","meal","drink","menu"],
  hero:["hero","banner","landscape","wide","cover","background"],
  screenshot:["screenshot","interface","ui","screen","wireframe","sketch"],
  video:["video","motion","clip"]
};

function text(value){return String(value||"").toLowerCase();}
function wordsFor(asset){
  const intel=asset?.intelligence&&typeof asset.intelligence==="object"?asset.intelligence:{};
  return [asset?.file_name,asset?.category,asset?.mime_type,intel?.label,intel?.subject,intel?.role,intel?.description,...(Array.isArray(intel?.tags)?intel.tags:[])].filter(Boolean).join(" ").toLowerCase();
}
function detectRole(asset){
  const intel=asset?.intelligence&&typeof asset.intelligence==="object"?asset.intelligence:{};
  if(["logo","person","property","product","food","hero","screenshot","video"].includes(intel?.role))return intel.role;
  const hay=wordsFor(asset);
  for(const [role,keys] of Object.entries(ROLE_KEYWORDS))if(keys.some(k=>hay.includes(k)))return role;
  if(text(asset?.mime_type).startsWith("video/"))return "video";
  return "content";
}
function pageText(page){return `${page?.name||""} ${page?.purpose||page?.description||""}`.toLowerCase();}

export function chooseMediaPlacement(asset,pages=[]){
  const candidates=(Array.isArray(pages)?pages:[]).map((page,index)=>({page,index,text:pageText(page)}));
  const match=(words)=>candidates.find(item=>words.some(word=>item.text.includes(word)));
  const role=detectRole(asset);
  const intel=asset?.intelligence&&typeof asset.intelligence==="object"?asset.intelligence:{};
  let target=null,suggestedRole="content",reason="Placed on the most relevant generated page.";
  if(role==="logo"){target=match(["home","landing","about","profile"]);suggestedRole="brand";reason="Visual intelligence identifies this as brand/logo media.";}
  else if(role==="property"){target=match(["property","listing","home","gallery","portfolio"]);suggestedRole="gallery";reason="Visual intelligence identifies property/interior content.";}
  else if(role==="product"||role==="food"){target=match(["product","shop","store","menu","catalog","home"]);suggestedRole="gallery";reason=`Visual intelligence identifies ${role} content.`;}
  else if(role==="person"){target=match(["about","team","profile","testimonial","home"]);suggestedRole="portrait";reason="Visual intelligence identifies people/portrait content.";}
  else if(role==="hero"){target=match(["home","landing","hero"]);suggestedRole="hero";reason="Visual intelligence identifies strong hero/cover media.";}
  else if(role==="screenshot"){target=match(["features","how","about","gallery","home"]);suggestedRole="reference";reason="Visual intelligence identifies interface/sketch reference content.";}
  else if(role==="video"){target=match(["home","about","story","gallery","media"]);suggestedRole="video";reason="Video placed where motion/story content is most useful.";}
  target=target||match([...(Array.isArray(intel?.suggestedSections)?intel.suggestedSections.map(text):[]),"home","gallery","about","portfolio","product","listing"])||candidates[0]||null;
  return {suggested_page:target?.page?.name||"Main",suggested_role:suggestedRole,placement_reason:reason,detected_role:role};
}
