import { buildIdeaPlan } from "../lib/ai/idea-planning-contract.js";
import { inferMobileGamePlan,isMobileGameIdea } from "../lib/ai/mobile-game-knowledge.js";

// Deterministic zero-cost provider for Soolen AI.
// It keeps the builder functional without calling any metered third-party model.
function clean(value, max = 4000) {
  return String(value || "").replace(/\s+/g, " ").trim().slice(0, max);
}

function detectLanguage(value) {
  const text = String(value || "");
  if (/[\u4e00-\u9fff]/.test(text)) return "zh-CN";
  if (/[\u3040-\u30ff]/.test(text)) return "ja";
  if (/[\uac00-\ud7af]/.test(text)) return "ko";
  if (/[\u0e00-\u0e7f]/.test(text)) return "th";
  if (/[\u0600-\u06ff]/.test(text)) return "ar";
  if (/\b(saya|mahu|buat|aplikasi|pelanggan)\b/i.test(text)) return "ms";
  if (/[ñ¿¡]/i.test(text)) return "es";
  if (/[éèêàçùâîôëïüœ]/i.test(text)) return "fr";
  return "en";
}

function slug(value, fallback = "page") {
  const result = clean(value, 60).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return result || fallback;
}

function titleCase(value) {
  return clean(value, 80).replace(/(^|\s)\S/g, (letter) => letter.toUpperCase());
}

function industryProfile(idea) {
  const text = idea.toLowerCase();
  if (/property|real estate|房产|房地产|房源|地产|rumah|hartanah/.test(text)) return {
    name:"Real Estate", appName:"PropertyFlow", entity:"Property", fields:["title","location","price","status","owner","next_follow_up"],
    pages:["Properties","Clients","Appointments"], features:["Property listings","Lead and client management","Viewing appointments","Follow-up reminders","Sales reports"],
  };
  if (/restaurant|food|cafe|餐厅|咖啡|makanan/.test(text)) return {
    name:"Food & Beverage", appName:"TableFlow", entity:"Order", fields:["customer","items","total","status","table","created_at"],
    pages:["Menu","Orders","Reservations"], features:["Digital menu","Order management","Table reservations","Customer records","Sales summary"],
  };
  if (/school|learn|education|course|学生|学校|学习|课程/.test(text)) return {
    name:"Education", appName:"LearnFlow", entity:"Lesson", fields:["title","subject","level","progress","teacher","due_date"],
    pages:["Courses","Lessons","Progress"], features:["Course library","Student profiles","Learning progress","Assignments","Reminders"],
  };
  if (/shop|store|commerce|product|购物|商城|商店|产品/.test(text)) return {
    name:"Commerce", appName:"ShopFlow", entity:"Product", fields:["name","sku","price","stock","category","status"],
    pages:["Products","Orders","Customers"], features:["Product catalog","Shopping flow","Order management","Customer records","Inventory tracking"],
  };
  if (/health|clinic|medical|patient|健康|诊所|医疗|病人/.test(text)) return {
    name:"Health Services", appName:"CareFlow", entity:"Appointment", fields:["patient","service","date","time","status","notes"],
    pages:["Appointments","Patients","Services"], features:["Appointment booking","Patient profiles","Service directory","Reminders","Activity reports"],
  };
  return {
    name:"Custom Business", appName:"Soolen Workspace", entity:"Record", fields:["name","details","status","owner","created_at"],
    pages:["Workspace","Records","Reports"], features:["User profiles","Dashboard","Record management","Search and filters","Reports"],
  };
}

function designProfile(idea) {
  const text = idea.toLowerCase();
  if (/cinematic|电影|深绿|jade|gold|金色|premium|高级/.test(text)) return {
    mood:"Premium cinematic", primaryColor:"#073B2C", secondaryColor:"#102A22", accentColor:"#D8B55B",
    backgroundColor:"#04130E", surfaceColor:"#0B2119", textColor:"#F5FBF7", fontDirection:"Editorial serif headings with clear sans-serif body",
    radius:"18px", iconStyle:"Fine-line gold icons", visualDirection:"Deep jade glass surfaces, cinematic imagery and restrained gold highlights",
  };
  if (/playful|fun|children|孩子|儿童|游戏/.test(text)) return {
    mood:"Bright and playful", primaryColor:"#6757D9", secondaryColor:"#28A9A1", accentColor:"#FFCA57",
    backgroundColor:"#F5F3FF", surfaceColor:"#FFFFFF", textColor:"#241F3A", fontDirection:"Friendly rounded sans-serif",
    radius:"22px", iconStyle:"Rounded colorful icons", visualDirection:"Friendly cards, clear progress and cheerful original illustrations",
  };
  return {
    mood:"Modern and trustworthy", primaryColor:"#12664F", secondaryColor:"#234E42", accentColor:"#D9AD45",
    backgroundColor:"#EEF5F1", surfaceColor:"#FFFFFF", textColor:"#102C23", fontDirection:"Clean modern sans-serif",
    radius:"16px", iconStyle:"Simple line icons", visualDirection:"Calm responsive layout with strong hierarchy and accessible contrast",
  };
}

function appSpec(idea) {
  const profile = industryProfile(idea);
  const designSystem = designProfile(idea);
  const language = detectLanguage(idea);
  const extraFeatures = [];
  const tests = [
    [/chat|message|聊天|讯息/i,"Messaging"],
    [/payment|invoice|付款|支付|账单/i,"Payments and invoices"],
    [/map|location|地图|位置/i,"Map and location"],
    [/calendar|日历|行事历/i,"Calendar"],
    [/video|影片|视频/i,"Video content"],
    [/photo|image|照片|图片/i,"Photo library"],
  ];
  for (const [pattern, name] of tests) if (pattern.test(idea)) extraFeatures.push(name);
  const features = [...new Set([...profile.features, ...extraFeatures])].slice(0, 9);
  const pageNames = ["Home", ...profile.pages, "Settings"];
  const pages = pageNames.map((name, index) => ({
    id: slug(name, `page-${index + 1}`),
    name,
    route: index === 0 ? "/" : `/${slug(name)}`,
    description: index === 0 ? `${profile.appName} overview and fastest actions` : `${name} workspace`,
    components: index === 0 ? ["hero","quick actions","recent activity","customer website call-to-action"] : ["search","filter","data cards","primary action"],
    layout: index === 0 ? "responsive dashboard hero" : "mobile-first cards and desktop table",
    visualTreatment: designSystem.visualDirection,
  }));
  const featureObjects = features.map((name) => ({ name, description:`${name} ready for the main user flow`, uiPattern:"responsive card and action flow" }));
  return {
    name: profile.appName,
    description: clean(idea, 240) || `A practical ${profile.name} app and customer website.`,
    industry:{ name:profile.name, category:profile.name, confidence:.72 },
    language:{ default:language, name:language, switchable:true },
    designSystem,
    visualAssets:[
      { type:"app_icon", description:`Original ${profile.appName} icon using the primary and accent colors` },
      { type:"hero", description:`Original responsive hero artwork for the App and Customer Website` },
    ],
    templateStrategy:{ matchedPatterns:[profile.name], innovation:"Zero-cost Soolen rules adapt the workflow, layout and visual system to the user's stated requirements." },
    pages,
    features:featureObjects,
    data:{ [profile.entity]:{ fields:profile.fields } },
    actions:[
      { name:`Add ${profile.entity}`, description:`Create a new ${profile.entity.toLowerCase()} record` },
      { name:"Search", description:"Search and filter saved information" },
      { name:"Share", description:"Share the customer-facing experience" },
    ],
    navigation:pages.map(({name,route})=>({label:name,route})),
    demoVideo:{ enabled:/video|demo|影片|视频/i.test(idea), durationSeconds:30, storyboard:["Opening","Main workflow","Result","Call to action"] },
  };
}

function gameSpec(idea){
  const plan=inferMobileGamePlan(idea),designSystem=designProfile(idea),language=detectLanguage(idea);
  const allowed=new Set(["arcade","racing","shooter","platformer","puzzle","tower_defense","rpg","moba","air_combat","action","strategy","simulation","card","sports","rhythm","survival","educational","idle","party","custom"]);
  const inferred=String(plan?.genreId||plan?.archetype||"custom").toLowerCase();const archetype=allowed.has(inferred)?inferred:"custom";
  const labels={moba:"MOBA / 5v5 Hero Battler",air_combat:"Air Combat / Flight",racing:"Racing",rpg:"RPG / Adventure",action:"Action",shooter:"Shooter",platformer:"Platformer / Runner",puzzle:"Puzzle",tower_defense:"Tower Defense",strategy:"Strategy",card:"Card",simulation:"Simulation",sports:"Sports",rhythm:"Rhythm",survival:"Survival",educational:"Educational",idle:"Idle",party:"Party",arcade:"Arcade",custom:"Original Mobile Game"};
  const genre=labels[archetype]||labels.custom;const multiplayer=Boolean(plan?.multiplayer||archetype==="moba"||/multiplayer|pvp|co.?op|多人|联机|聯機|5\s?v\s?5/i.test(idea));
  const pageNames=["Home","Play","Progression","Collection","Community","Settings"];
  const pages=pageNames.map((name,index)=>({id:slug(name,`game-page-${index+1}`),name,route:index===0?"/":`/${slug(name)}`,description:index===0?`${genre} launch lobby and companion Website entry`:`${name} game screen`,purpose:index===1?"Playable touch-first gameplay surface":"Game progression and player workflow",components:index===1?["game canvas","touch controls","HUD","pause","win lose results"]:["header","game cards","primary action","status"],layout:"mobile-first game shell with responsive companion web layout",visualTreatment:designSystem.visualDirection}));
  const systems=Array.isArray(plan?.systems)&&plan.systems.length?plan.systems.slice(0,30):["touch-first controls","deterministic gameplay state","collision and world bounds","win and lose flow","progression and restart","versioned save and load","user-controlled audio and haptics","60fps-oriented bounded simulation","mobile lifecycle recovery","accessibility and reduced motion"];
  const screens=Array.isArray(plan?.screens)&&plan.screens.length?plan.screens.slice(0,20):["Boot / loading","Home / lobby","Gameplay","Pause","Results / rewards","Settings / accessibility"];
  const coreLoop=archetype==="racing"?["start race","steer and manage speed","pass checkpoints","finish","reward","replay"]:archetype==="puzzle"?["load puzzle","inspect state","make move","validate","reward","next level"]:archetype==="moba"?["select hero","lane and farm","fight and take objectives","destroy core or lose","reward","requeue"]:["start","move and act","avoid or fight","collect progress","win or lose","reward and replay"];
  return{
    name:`Soolen ${genre}`.slice(0,100),description:clean(idea,300)||`Original ${genre} mobile game.`,productType:"mobile_game",platforms:["ios","android","web"],industry:{name:"Gaming",category:genre,confidence:.9},language:{default:language,name:language,switchable:true},
    designSystem:{...designSystem,backgroundDirection:"Original game world atmosphere with readable safe-area HUD",heroDirection:"Original key art without copied characters or commercial-game branding",layoutSignature:"touch-first play surface plus responsive companion Website",cardStyle:"high-contrast game panels",imageStyle:"original game art direction",motionDirection:"responsive motion with reduced-motion fallback"},
    visualAssets:[{type:"app_icon",description:"Original mobile game icon"},{type:"game_character",description:"Original player character direction"},{type:"game_environment",description:"Original gameplay environment direction"},{type:"game_vfx",description:"Readable original gameplay effects"},{type:"store_artwork",description:"Original store and companion Website artwork"}],
    templateStrategy:{matchedPatterns:[genre],innovation:"Zero-cost Soolen Game planning converts the customer's idea into a real playable vertical-slice contract rather than a normal business App."},
    qualityPlan:{stability:["bounded frame delta and deterministic state transitions","pause/recovery on page visibility and interruption","validated save/load with restart fallback"],security:["no client-authoritative commerce or competitive server truth","validated bounded inputs and project ownership for server actions","external game providers remain fail-closed until connected"],privacy:["no sensitive permission requested unless gameplay needs it","data minimization for telemetry and player identity","camera/location/chat remain opt-in with denial fallback"],comfort:["44px+ touch targets and safe-area HUD","user-controlled audio/haptics with non-audio feedback","reduced motion and readable contrast"],beauty:["coordinated original game palette","clear gameplay focal hierarchy","responsive companion Website/store presentation"],naturalness:["complete start-play-result-replay loop","human-readable progression and rewards","loading empty error pause and reconnect states are explicit"]},
    game:{enabled:true,genre,archetype,dimensions:/3d|air combat|flight/i.test(`${idea} ${genre}`)?"3d":"adaptive",coreLoop,screens,controls:["touch-first movement/action controls","pointer-cancel and interruption recovery","keyboard preview without making keyboard mandatory"],systems,progression:["onboarding","level or run progression","checkpoint/reward","final victory and replay"],saveStrategy:"versioned local save with validation, autosave and cloud-ready boundary",performanceTargets:["target responsive 60fps where practical","bounded frame delta","entity and memory budgets","thermal/battery-aware mobile degradation"],audio:["user-controlled SFX","no forced autoplay","interruption recovery","visible non-audio feedback"],assets:["original character/environment/UI/VFX/icon directions only"],multiplayer:{enabled:multiplayer,notes:multiplayer?"Authoritative multiplayer integration point is prepared; live real-player matchmaking is never claimed until provider/relay/device evidence passes.":"Local/bot gameplay is authoritative for the current preview; no live multiplayer is claimed."},monetization:{ads:false,inAppPurchases:false,notes:"No ad network or purchase provider is claimed connected."},platformNotes:{ios:["safe-area HUD","background/foreground and audio interruption recovery"],android:["back navigation","lifecycle recreation and low-memory recovery"]}},
    pages,features:[{name:"Playable Runtime",description:"Touch-first deterministic playable preview",uiPattern:"game runtime"},{name:"Progression",description:"Win/lose/reward/replay progression",uiPattern:"results and progression"},{name:"Save & Resume",description:"Validated local save and recovery",uiPattern:"automatic save"},{name:"Accessibility",description:"Reduced motion, readable controls and non-audio feedback",uiPattern:"settings"},{name:"Companion Website",description:"Responsive marketing/store/community surface linked to the same game project",uiPattern:"responsive website"}],data:{PlayerProfile:{fields:["display_name","level","progress","best_score","settings","updated_at"]}},actions:[{name:"Play",description:"Start or resume the playable game"},{name:"Restart",description:"Restart after win or loss"},{name:"Save",description:"Persist validated local progress"}],navigation:pages.map(({name,route})=>({label:name,route})),demoVideo:{enabled:false,durationSeconds:30,storyboard:["Game identity","Core loop","Progression","Companion Website"]}
  };
}

function extractObjectAfter(text, marker) {
  const markerIndex = text.indexOf(marker);
  if (markerIndex < 0) return null;
  const start = text.indexOf("{", markerIndex + marker.length);
  if (start < 0) return null;
  let depth = 0, quoted = false, escaped = false;
  for (let index = start; index < text.length; index += 1) {
    const character = text[index];
    if (quoted) {
      if (escaped) escaped = false;
      else if (character === "\\") escaped = true;
      else if (character === '"') quoted = false;
      continue;
    }
    if (character === '"') quoted = true;
    else if (character === "{") depth++;
    else if (character === "}" && --depth === 0) {
      try { return JSON.parse(text.slice(start, index + 1)); } catch { return null; }
    }
  }
  return null;
}

function modifySpec(prompt) {
  const current = extractObjectAfter(prompt, "Current specification:") || appSpec(prompt);
  const match = prompt.match(/instruction:\s*\n?"([\s\S]*?)"\s*\nCurrent specification:/i);
  const instruction = clean(match?.[1] || "User requested a design and feature update.", 1000);
  const featureName = titleCase(instruction.slice(0, 72)) || "Requested Update";
  const features = Array.isArray(current.features) ? [...current.features] : [];
  if (!features.some((item) => clean(item?.name || item).toLowerCase() === featureName.toLowerCase())) {
    features.push({ name:featureName, description:instruction, uiPattern:"responsive guided workflow" });
  }
  const pages = Array.isArray(current.pages) ? [...current.pages] : [];
  if (/page|screen|页面|頁面|画面/i.test(instruction)) {
    const name = featureName.replace(/\b(add|create|make|please)\b/gi, "").trim().slice(0, 45) || "New Page";
    const route = `/${slug(name,"new-page")}`;
    if (!pages.some((page) => page.route === route)) pages.push({ id:slug(name), name, route, description:instruction, components:["header","main content","primary action"], layout:"responsive", visualTreatment:current.designSystem?.visualDirection || "Follow the current design system" });
  }
  return { ...current, description:clean(current.description || instruction, 300), pages, features };
}

function conversationResult(prompt) {
  const message = clean(prompt.split("LATEST USER MESSAGE:").pop()?.split("Use the actual message")[0], 3000);
  const profile = industryProfile(message);
  const plan=buildIdeaPlan(message,{modelPlan:{appType:profile.name,entities:[profile.entity],constraints:["zero-cost execution"]}});
  const firstQuestion=plan.questions?.[0]||"";
  const reply = plan.language === "zh-CN"
    ? (plan.readyToBuild ? `我已经把需求整理成可以开始制作的方向：${plan.appType}。核心功能：${plan.features.join("、")||"按你的明确需求生成"}。` : `我已经理解目前的方向，但还差一个关键资料：${firstQuestion}`)
    : plan.language === "ms"
      ? (plan.readyToBuild ? `Keperluan sudah cukup jelas untuk mula membina ${plan.appType}.` : `Saya faham arah projek ini, tetapi perlukan satu maklumat lagi: ${firstQuestion}`)
      : (plan.readyToBuild ? `The requirements are specific enough to start building ${plan.appType}.` : `I understand the direction, but one key detail is still missing: ${firstQuestion}`);
  return {...plan,reply};
}

function localChat(prompt) {
  const message = clean(prompt.split("USER:").pop()?.split("SOOLEN:")[0], 3000);
  const language = detectLanguage(message);
  if (language === "zh-CN") {
    return `我会使用 0 成本能力处理这项工作。当前可直接使用：需求整理、多语言文字、App + Website 结构、基础代码与修复建议、照片/手绘版面分析、程序化图片、浏览器语音和设备端 Demo。你的要求是：“${message}”。如果要开始制作，请补充主要用户、最重要功能和喜欢的风格。`;
  }
  return `I will handle this with Soolen's zero-cost capabilities. I can organize requirements, plan an App + Customer Website, propose code, analyze visual references, create programmatic visuals and use device voice. Your request is: "${message}". Add the main users, must-have features and preferred style to start building.`;
}

export function generateWithZeroCostRules(prompt) {
  const text = String(prompt || "");
  if (/Current specification:/i.test(text) && /modification engine/i.test(text)) return JSON.stringify(modifySpec(text));
  if (/LATEST USER MESSAGE:/i.test(text) && /readyToBuild/i.test(text)) return JSON.stringify(conversationResult(text));
  if (/Build a real mobile-first app/i.test(text) || /REFERENCE IMAGE REFERENCES:/i.test(text)) {
    const match = text.match(/USER IDEA:\s*\n"([\s\S]*?)"\s*\n\nVOICE INPUT:/i);const idea=clean(match?.[1] || text, 6000);
    return JSON.stringify(isMobileGameIdea(idea)?gameSpec(idea):appSpec(idea));
  }
  return localChat(text);
}
