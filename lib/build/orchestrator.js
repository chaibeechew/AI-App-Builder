const MODULE_ORDER=["app","website","game","media","database","workflows","integrations","payments","video","analytics","quality","publish"];

function has(text,terms){return terms.some(term=>text.includes(term));}
function unique(values){return [...new Set(values)];}

export function buildAutonomousPlan(input={}){
  const idea=String(input.idea||"").trim();
  const text=idea.toLowerCase();
  const isGame=has(text,[" game","game ","mobile game","gaming","rpg","platformer","tower defense","match-3","match 3","racing game","puzzle game","游戏","手游","遊戲"]);
  const hasMedia=Number(input.assetCount||0)>0||has(text,["photo","image","video","logo","sketch","upload","gallery","art","avatar","character","environment"]);
  const commerce=has(text,["shop","store","ecommerce","e-commerce","product","order","checkout","payment","subscription","membership","billing","in-app purchase","iap","battle pass"]);
  const crm=has(text,["crm","lead","customer","client","enquiry","inquiry","contact","agent"]);
  const booking=has(text,["appointment","booking","reservation","schedule","calendar"]);
  const messaging=has(text,["whatsapp","email","message","notification","follow up","follow-up"]);
  const wantsVideo=Boolean(input.createVideo)||has(text,["promo video","promotional video","create video","advertising video","marketing video","cartoon video","realistic video","game trailer","cutscene","真人","卡通","宣传视频","遊戲預告","游戏预告"]);
  const videoStyle=has(text,["cartoon","animation","animated","卡通","动漫"])?"cartoon":has(text,["mixed","mix","混合"])?"mixed":"realistic";
  const multiplayer=isGame&&has(text,["multiplayer","pvp","co-op","coop","多人","联机","聯機"]);

  const modules={app:true,website:true,game:isGame,media:hasMedia||isGame,database:crm||booking||commerce||multiplayer||has(text,["database","data","record","inventory","listing","property","save game","leaderboard"]),workflows:crm||booking||commerce||messaging,integrations:messaging||booking||commerce||multiplayer,payments:commerce,video:wantsVideo,analytics:true,quality:true,publish:true};
  const workflows=[];
  if(crm||messaging)workflows.push({name:"Lead follow-up",triggerType:"form_submitted",actions:[{type:"save_crm",label:"Save customer to CRM"},{type:"send_email",label:"Send confirmation email"},{type:"notify_team",label:"Notify team"}]});
  if(booking)workflows.push({name:"Appointment confirmation",triggerType:"appointment_created",actions:[{type:"send_email",label:"Send appointment confirmation"},{type:"send_whatsapp",label:"Send WhatsApp reminder"},{type:"calendar",label:"Add to calendar"}]});
  if(commerce&&!isGame)workflows.push({name:"Order update",triggerType:"order_created",actions:[{type:"save_order",label:"Save order"},{type:"send_email",label:"Send receipt / confirmation"},{type:"notify_team",label:"Notify operations"}]});
  if(has(text,["whatsapp"]))workflows.push({name:"WhatsApp lead follow-up",triggerType:"form_submitted",actions:[{type:"save_crm",label:"Save lead"},{type:"send_whatsapp",label:"Send WhatsApp follow-up"},{type:"notify_team",label:"Notify team"}]});

  const selected=MODULE_ORDER.filter(name=>modules[name]);
  return {
    version:"autonomous-build-orchestrator-v2",
    selectedModules:selected,
    modules,
    workflows,
    game:isGame?{targetPlatforms:["ios","android","web-preview"],touchFirst:true,multiplayer,verticalSliceFirst:true,storeReadiness:true}:null,
    video:modules.video?{style:videoStyle,autoConnect:true,serverRender:true}:null,
    principles:["Customer-facing infrastructure stays hidden","Generated projects call LANERIQ backend contracts instead of provider APIs","Private assets remain project-scoped","Use server-side processing for heavy video work","Mobile games target both iOS and Android with a web preview path","Quality gate is specification-level and does not replace runtime/device testing"],
    summary:`Build ${selected.join(" + ")}.`
  };
}

export function orchestrationBrief(plan){
  if(!plan)return "";
  return [
    "SOOLENAI AUTONOMOUS BUILD PLAN",
    `Modules: ${unique(plan.selectedModules||[]).join(", ")}`,
    plan.game?`Mobile game target: iOS + Android + web preview; touch-first; ${plan.game.multiplayer?"multiplayer integration-ready":"single-player/local-first unless requested otherwise"}.`:"",
    plan.workflows?.length?`Starter workflows: ${plan.workflows.map(w=>w.name).join(", ")}`:"",
    plan.video?`Video project: ${plan.video.style}, auto-connect, server render.`:"",
    "Generate one coherent product specification that anticipates these modules instead of treating them as unrelated add-ons."
  ].filter(Boolean).join("\n");
}
