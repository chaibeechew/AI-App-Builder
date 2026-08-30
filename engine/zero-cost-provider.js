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
  const language = detectLanguage(message);
  const profile = industryProfile(message);
  const ready = message.length >= 18;
  const reply = language === "zh-CN"
    ? (ready ? `我已经整理好方向：${profile.name}。你可以继续补充版面、颜色或功能，然后开始生成 App + Website。` : "我明白了。这个 App 最主要给谁使用？")
    : (ready ? `I have organized this as a ${profile.name} project. Add any layout, color or feature details, then generate the App + Website.` : "I understand. Who is the main user of this app?");
  return {
    reply, language, intent:"build an app and customer website", audience:"user-defined", appType:profile.name,
    features:profile.features, entities:[profile.entity], constraints:["zero-cost execution"], questions:ready?[]:[reply],
    normalizedIdea:message, confidence:ready?.72:.45, readyToBuild:ready, corrections:[],
  };
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
    const match = text.match(/USER IDEA:\s*\n"([\s\S]*?)"\s*\n\nVOICE INPUT:/i);
    return JSON.stringify(appSpec(clean(match?.[1] || text, 6000)));
  }
  return localChat(text);
}
