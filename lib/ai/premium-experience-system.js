const HEX_COLOR = /^#[0-9a-f]{6}$/i;

export const PREMIUM_EXPERIENCE_VERSION = "premium-experience-v1-2026-08-31";
export const PREMIUM_VISUAL_SCORE_REQUIRED = 100;

export const BUILD_JOURNEY_STAGES = Object.freeze([
  { id:"idea", label:"Idea", customerLabel:"Describe", progress:8, icon:"✦", wallpaperStage:"idea", detail:"Capture the goal, audience and references." },
  { id:"understand", label:"AI Understands", customerLabel:"Understand", progress:18, icon:"◎", wallpaperStage:"understand", detail:"Interpret the industry, users and success path." },
  { id:"planning", label:"Planning", customerLabel:"Plan", progress:30, icon:"◇", wallpaperStage:"plan", detail:"Plan pages, data, permissions and visual direction." },
  { id:"building", label:"Building", customerLabel:"Build", progress:48, icon:"▦", wallpaperStage:"build", detail:"Build the App and Website as one product." },
  { id:"data", label:"Data", customerLabel:"Data", progress:61, icon:"◫", wallpaperStage:"data", detail:"Prepare useful data models and private defaults." },
  { id:"automation", label:"Automation", customerLabel:"Automate", progress:72, icon:"↻", wallpaperStage:"automation", detail:"Connect the real-world actions the project needs." },
  { id:"testing", label:"Testing", customerLabel:"Test", progress:84, icon:"✓", wallpaperStage:"quality", detail:"Check behavior, safety, accessibility and every visual state." },
  { id:"preview", label:"Preview", customerLabel:"Preview", progress:94, icon:"◉", wallpaperStage:"preview", detail:"Prepare mobile and desktop previews for review." },
  { id:"publish", label:"Publish", customerLabel:"Publish", progress:100, icon:"↑", wallpaperStage:"publish", detail:"Keep Production held until explicit approval." },
]);

const PROFILE_DEFINITIONS = Object.freeze([
  {
    id:"real-estate", label:"Real Estate", keywords:["real estate","property","properties","listing","realtor","agent","房产","房地产","物业"],
    scene:"Architectural photography, lived-in neighborhoods, map context and confident property detail imagery.",
    typography:"Editorial display type paired with a highly legible modern sans serif.", cardStyle:"Image-led property cards with calm facts, price hierarchy and restrained glass depth.", imageStyle:"Wide architectural scenes, warm natural light, human-scale details and map-aware crops.",
    palette:{primary:"#174b3d",secondary:"#d9e4dc",accent:"#d8ad4e",background:"#071511",surface:"#f7f3e9",text:"#17241f"}, wallpaper:"golden-valley",
    layouts:["property-canvas","editorial-split","map-and-list","trust-dashboard"], navigation:"Search-first tabs with a reachable saved-items and enquiry action."
  },
  {
    id:"restaurant", label:"Restaurant & Food", keywords:["restaurant","cafe","food","menu","dining","recipe","餐厅","美食","菜单","咖啡"],
    scene:"Rich food photography, tactile materials, warm hospitality light and short paths to menu or booking.",
    typography:"Expressive hospitality display type with a clean, readable service sans serif.", cardStyle:"Tactile menu and reservation cards with appetizing image crops and clear dietary/status cues.", imageStyle:"Close food detail, warm table light, authentic staff and venue moments without stock-photo sameness.",
    palette:{primary:"#6f2f23",secondary:"#f1dfc8",accent:"#e0a646",background:"#170b08",surface:"#fff8ed",text:"#2b1711"}, wallpaper:"desert-glass",
    layouts:["menu-story","booking-split","chef-editorial","order-flow"], navigation:"Short menu, book and order paths with a persistent primary action."
  },
  {
    id:"travel", label:"Travel & Hospitality", keywords:["travel","trip","tour","hotel","destination","itinerary","adventure","旅游","酒店","行程","景点"],
    scene:"Destination-scale imagery, spatial storytelling, itinerary rhythm and emotionally clear booking moments.",
    typography:"Expansive editorial display type with a calm multilingual sans serif.", cardStyle:"Layered destination cards with maps, dates, availability and strong saved-trip affordances.", imageStyle:"Cinematic horizons, real local texture, people in context and immersive edge-to-edge crops.",
    palette:{primary:"#0f5360",secondary:"#d9eef0",accent:"#f0b75b",background:"#06161b",surface:"#f5fbfa",text:"#123038"}, wallpaper:"ocean-glow",
    layouts:["destination-hero","itinerary-timeline","map-story","booking-canvas"], navigation:"Explore, trips and saved places with thumb-reachable booking controls."
  },
  {
    id:"finance", label:"Finance", keywords:["finance","bank","investment","trading","budget","invoice","expense","payment","金融","投资","银行","理财"],
    scene:"Precise data surfaces, restrained depth, trustworthy summaries and controlled moments of color.",
    typography:"Numerically precise sans serif with compact labels and confident display figures.", cardStyle:"Dense but calm metric cards with visible hierarchy, comparison context and risk/status clarity.", imageStyle:"Abstract financial geometry, real business context and restrained illustration instead of decorative stock charts.",
    palette:{primary:"#143d59",secondary:"#dce8ef",accent:"#35b98b",background:"#07131d",surface:"#f6fafc",text:"#142733"}, wallpaper:"neon-skyline",
    layouts:["data-command","portfolio-grid","transaction-flow","insight-split"], navigation:"Overview, activity and goals with sensitive actions separated from routine browsing."
  },
  {
    id:"healthcare", label:"Healthcare", keywords:["health","medical","clinic","doctor","patient","wellness","therapy","医疗","诊所","医生","健康"],
    scene:"Calm human care, reassuring environmental imagery and high-clarity task paths without clinical coldness.",
    typography:"Warm, highly legible sans serif with generous line height and plain-language labels.", cardStyle:"Soft high-contrast care cards with clear status, privacy cues and accessible appointment controls.", imageStyle:"Authentic care moments, diverse people, calm natural light and privacy-respecting crops.",
    palette:{primary:"#176b64",secondary:"#dff1ed",accent:"#f0a867",background:"#081917",surface:"#f7fcfb",text:"#17312e"}, wallpaper:"aurora-lake",
    layouts:["care-welcome","appointment-flow","health-summary","guidance-editorial"], navigation:"Tasks grouped by care goal with large labels and urgent actions visually distinct."
  },
  {
    id:"education", label:"Education", keywords:["education","school","course","student","teacher","learning","tuition","quiz","教育","学校","课程","学生"],
    scene:"Progressive learning moments, friendly structure, purposeful illustration and visible achievement.",
    typography:"Friendly rounded display type with a highly readable study sans serif.", cardStyle:"Progress and lesson cards with clear next steps, approachable icons and calm achievement color.", imageStyle:"Original instructional illustration, real learning context and age-appropriate visual energy.",
    palette:{primary:"#3d4fa3",secondary:"#e5e9ff",accent:"#f0b84d",background:"#0d1230",surface:"#fafbff",text:"#202749"}, wallpaper:"cloud-kingdom",
    layouts:["learning-path","lesson-canvas","progress-dashboard","community-board"], navigation:"Learn, practice and progress with one obvious resume action."
  },
  {
    id:"commerce", label:"Commerce", keywords:["shop","store","commerce","ecommerce","product","catalog","cart","order","电商","商店","购物","产品"],
    scene:"Product-first visual hierarchy, useful comparison, confident detail and frictionless checkout progression.",
    typography:"Modern retail sans serif with editorial campaign moments and strong price hierarchy.", cardStyle:"Product and offer cards with clean variants, availability, proof and clear primary actions.", imageStyle:"Consistent product photography, contextual lifestyle crops and useful detail views.",
    palette:{primary:"#4c2d79",secondary:"#eee4f7",accent:"#e6a83f",background:"#130b1d",surface:"#fffaff",text:"#271832"}, wallpaper:"desert-glass",
    layouts:["commerce-hero","catalog-mosaic","product-focus","checkout-flow"], navigation:"Browse, search, saved and cart with purchase status always understandable."
  },
  {
    id:"social", label:"Social & Community", keywords:["social","community","creator","content","profile","feed","chat","社交","社区","创作者","聊天"],
    scene:"Human stories, media-rich identity, lively but controlled interaction and safe community cues.",
    typography:"Contemporary expressive sans serif with compact metadata and strong creator identity.", cardStyle:"Media-led community cards with clear authorship, actions, safety controls and varied rhythm.", imageStyle:"Authentic creator media, expressive portraiture, original illustration and inclusive community scenes.",
    palette:{primary:"#6a3fb3",secondary:"#ece5fb",accent:"#45d3a0",background:"#110b20",surface:"#fcfaff",text:"#241832"}, wallpaper:"neon-skyline",
    layouts:["community-stream","creator-spotlight","media-mosaic","conversation-focus"], navigation:"Home, create, community and profile with creation centered and moderation reachable."
  },
  {
    id:"adaptive", label:"Adaptive Product", keywords:[],
    scene:"Original industry-relevant imagery with one memorable visual moment and calm supporting product surfaces.",
    typography:"Confident display hierarchy paired with an accessible multilingual sans serif.", cardStyle:"Refined layered cards with clear grouping, meaningful icons and deliberate spacing.", imageStyle:"Original, specific and useful imagery with consistent lighting, crop and brand treatment.",
    palette:{primary:"#165244",secondary:"#dcebe5",accent:"#d8b458",background:"#061512",surface:"#f7faf8",text:"#162923"}, wallpaper:"moon-city",
    layouts:["immersive-hero","task-dashboard","editorial-split","service-flow"], navigation:"App-like navigation chosen around the primary user goal and one-handed mobile use."
  }
]);

export const INDUSTRY_VISUAL_PROFILES = Object.freeze(Object.fromEntries(PROFILE_DEFINITIONS.map(profile=>[profile.id,profile])));

const PAGE_CHECKLIST = Object.freeze([
  "A page-specific scene or background supports the page purpose.",
  "Title, supporting copy and primary action have a clear visual order.",
  "Cards, icons and imagery use the same coordinated visual system.",
  "Loading, empty, error and success states feel intentionally designed.",
  "The main action is reachable with a 44px minimum touch target.",
  "Safe areas, virtual keyboards and narrow iPhone widths are handled.",
  "Text contrast meets WCAG AA and focus remains visible.",
  "Motion is purposeful and respects reduced-motion preferences.",
  "The page composition differs from adjacent pages without losing brand continuity.",
  "No provider, API, hosting or infrastructure language appears in the customer journey."
]);

const STATE_DEFAULTS = Object.freeze({
  loading:"Use a branded skeleton that preserves the final layout and announces progress without blocking navigation.",
  empty:"Explain why the page is empty, show a useful first action and keep the industry visual identity visible.",
  error:"Use calm plain language, preserve entered work and offer one safe retry or recovery action.",
  success:"Confirm the completed action, explain what changed and show the most useful next step."
});

const QUALITY_PLAN_DEFAULTS = Object.freeze({
  stability:["Every route defines loading, empty, error and success behavior with a recoverable next action.","Navigation uses unique valid routes and keeps entered work when a retry is needed.","Primary actions expose progress, prevent accidental duplicate submission and confirm completion."],
  security:["Sensitive actions require authenticated owner or role permission and server-side validation.","Secrets, provider credentials and infrastructure settings never render in the customer interface.","Inputs are bounded, validated and rejected safely before sensitive work begins."],
  privacy:["Personal data is minimized, private by default and explained at the moment it is requested.","Permission choices use plain language and can be reviewed or revoked where relevant.","Export and deletion paths are visible for stored customer information where applicable."],
  comfort:["All pages are mobile-first with 44px touch targets, safe-area padding and keyboard-aware primary actions.","Typography stays readable at narrow iPhone widths without horizontal page scrolling.","Motion is calm, focus is visible and reduced-motion preferences are respected."],
  beauty:["Every page uses a page-specific scene, layout family and visual rhythm while preserving one coordinated brand system.","Hero, typography, cards, icons, imagery, states and CTA treatments meet the premium released-product quality floor.","The industry profile changes composition, imagery, density and palette behavior instead of reusing one universal template."],
  naturalness:["Labels and feedback use concise human language based on the user's real-world goal.","Workflows follow the order people naturally expect and keep the next action obvious.","Empty, error and success messages explain context without robotic or technical language."]
});

function object(value){return value&&typeof value==="object"&&!Array.isArray(value)?value:{}}
function array(value){return Array.isArray(value)?value:[]}
function string(value,fallback=""){return typeof value==="string"&&value.trim()?value.trim():fallback}
function color(value,fallback){const candidate=string(value);return HEX_COLOR.test(candidate)?candidate:fallback}
function unique(items){return [...new Set(items.map(item=>string(item)).filter(Boolean))]}
function clone(value){try{return JSON.parse(JSON.stringify(value||{}))}catch{return {}}}
function searchable(input={}){const specification=object(input.specification||input);const pages=array(specification.pages);const features=array(specification.features);return [input.idea,specification.name,specification.description,specification.industry?.name,specification.industry?.category,...pages.flatMap(page=>[page?.name,page?.purpose,page?.description]),...features.flatMap(feature=>[typeof feature==="string"?feature:feature?.name,typeof feature==="object"?feature?.description:""])].filter(Boolean).join(" ").toLowerCase()}

export function inferIndustryVisualProfile(input={}){
  const text=searchable(input);let best=PROFILE_DEFINITIONS[PROFILE_DEFINITIONS.length-1],bestScore=0;
  for(const profile of PROFILE_DEFINITIONS.slice(0,-1)){const score=profile.keywords.reduce((total,keyword)=>total+(text.includes(keyword.toLowerCase())?Math.max(1,keyword.split(" ").length):0),0);if(score>bestScore){best=profile;bestScore=score}}
  return {...best,confidence:bestScore?Math.min(.98,.62+bestScore*.07):.45};
}

function pageRole(page,index){const value=`${page?.name||""} ${page?.purpose||page?.description||""}`.toLowerCase();if(index===0||/home|welcome|landing|overview|首页|主页/.test(value))return"entry";if(/search|browse|catalog|listing|discover|menu|探索|列表|菜单/.test(value))return"discover";if(/detail|profile|property|product|course|service|详情|资料/.test(value))return"detail";if(/data|report|analytics|dashboard|record|数据|报告/.test(value))return"insight";if(/book|order|checkout|payment|apply|contact|预约|订单|付款/.test(value))return"conversion";if(/setting|account|privacy|admin|设置|账户|隐私/.test(value))return"control";return index%2?"workflow":"content"}
function primaryActionFor(role){return({entry:"Start the main customer journey",discover:"Open the best matching result",detail:"Continue with this item",insight:"Review the most important change",conversion:"Complete the next safe step",control:"Save preferences",workflow:"Continue the workflow",content:"Explore the next section"})[role]}
function mergePlan(current,id){return unique([...array(current?.[id]),...QUALITY_PLAN_DEFAULTS[id]]).slice(0,6)}

export function enforcePremiumExperience(input={},context={}){
  const specification=clone(input);const profile=inferIndustryVisualProfile({idea:context.idea||"",specification});const existingDesign=object(specification.designSystem);const palette=profile.palette;const wallpaper=string(existingDesign.wallpaperPreset,profile.wallpaper);const pages=array(specification.pages);
  const designSystem={...existingDesign,
    mood:string(existingDesign.mood,`${profile.label} premium, human and confident`),
    themeMode:string(existingDesign.themeMode,context.themeMode||"auto"),
    colorPreference:string(existingDesign.colorPreference,context.colorPreference||`${profile.label} coordinated palette`),
    paletteRationale:string(existingDesign.paletteRationale,`The ${profile.label} profile balances industry trust, emotional tone, mobile readability and one clear action hierarchy.`),
    primaryColor:color(existingDesign.primaryColor||context.primaryColor,palette.primary),secondaryColor:color(existingDesign.secondaryColor,palette.secondary),accentColor:color(existingDesign.accentColor||context.accentColor,palette.accent),backgroundColor:color(existingDesign.backgroundColor||context.backgroundColor,palette.background),surfaceColor:color(existingDesign.surfaceColor,palette.surface),textColor:color(existingDesign.textColor,palette.text),
    fontDirection:string(existingDesign.fontDirection,profile.typography),iconStyle:string(existingDesign.iconStyle,`Purposeful ${profile.id} line icons with filled emphasis only for primary actions`),visualDirection:string(existingDesign.visualDirection,profile.scene),backgroundDirection:string(existingDesign.backgroundDirection,`${profile.scene} Use depth and atmosphere while preserving readable content zones.`),heroDirection:string(existingDesign.heroDirection,`A page-specific ${profile.id} visual moment tied to the user's immediate goal.`),layoutSignature:string(existingDesign.layoutSignature,profile.layouts.join(" · ")),cardStyle:string(existingDesign.cardStyle,profile.cardStyle),imageStyle:string(existingDesign.imageStyle,profile.imageStyle),motionDirection:string(existingDesign.motionDirection,"Short depth and continuity transitions; no decorative motion; reduced-motion safe."),wallpaperMode:string(existingDesign.wallpaperMode,context.wallpaperMode||"random"),wallpaperPreset:wallpaper,
    industryProfile:profile.id,experienceVersion:PREMIUM_EXPERIENCE_VERSION,typographyScale:"Responsive 1.2 modular scale with 16px minimum body copy",spacingScale:"8px base rhythm with generous 24–40px section separation",navigationModel:profile.navigation,touchTargetMinPx:44,safeAreaAware:true,keyboardAware:true,reducedMotionSafe:true,contrastTarget:"WCAG AA minimum"
  };
  const enrichedPages=(pages.length?pages:[{id:"home",name:"Home",route:"/",purpose:specification.description||"Main product experience",components:[]}]).map((page,index)=>{
    const current=object(page),experience=object(current.experience),role=pageRole(current,index),layoutFamily=string(experience.layoutFamily,profile.layouts[index%profile.layouts.length]);
    return {...current,
      layout:string(current.layout,`${layoutFamily}: responsive composition tailored to the ${role} goal`),
      visualTreatment:string(current.visualTreatment,`${profile.cardStyle} ${index===0?"Use the strongest visual moment here.":"Use a distinct supporting rhythm from the previous page."}`),
      backgroundTreatment:string(current.backgroundTreatment,`${profile.scene} Page ${index+1} uses an original crop, light direction or depth layer while keeping the same palette.`),
      experience:{...experience,qualityFloor:"premium-released-product",industryProfile:profile.id,pageRole:role,layoutFamily,sceneDirection:string(experience.sceneDirection,`${profile.scene} Compose specifically for ${current.name||`Page ${index+1}`}.`),imageDirection:string(experience.imageDirection,profile.imageStyle),navigationPattern:string(experience.navigationPattern,profile.navigation),primaryAction:string(experience.primaryAction,primaryActionFor(role)),hero:{...object(experience.hero),enabled:experience?.hero?.enabled!==false,treatment:string(experience?.hero?.treatment,index===0?"immersive":"compact-contextual"),headlineMaxWords:Number(experience?.hero?.headlineMaxWords)||9,imagePriority:string(experience?.hero?.imagePriority,index===0?"high":"contextual")},typography:{...object(experience.typography),direction:string(experience?.typography?.direction,profile.typography),bodyMinimumPx:Math.max(16,Number(experience?.typography?.bodyMinimumPx)||16),headlineScale:string(experience?.typography?.headlineScale,"responsive-premium")},cards:{...object(experience.cards),treatment:string(experience?.cards?.treatment,profile.cardStyle),depth:string(experience?.cards?.depth,"layered"),radius:string(experience?.cards?.radius,"responsive 18–28px")},states:{...STATE_DEFAULTS,...object(experience.states)},mobile:{minTouchTargetPx:44,safeAreaAware:true,keyboardAware:true,oneHandedPrimaryAction:true,horizontalPageScroll:false,...object(experience.mobile)},accessibility:{contrast:"WCAG AA minimum",focusVisible:true,reducedMotion:true,semanticLandmarks:true,...object(experience.accessibility)},qualityChecklist:unique([...array(experience.qualityChecklist),...PAGE_CHECKLIST])}
    };
  });
  const qualityPlan=Object.fromEntries(Object.keys(QUALITY_PLAN_DEFAULTS).map(id=>[id,mergePlan(specification.qualityPlan,id)]));
  const visualAssets=unique(array(specification.visualAssets).map(item=>typeof item==="string"?item:item?.description));if(!visualAssets.length)visualAssets.push(`${profile.label} hero direction: ${profile.imageStyle}`,`${profile.label} background direction: ${profile.scene}`,`${profile.label} icon set: purposeful, accessible and original`);
  return {...specification,industry:{...object(specification.industry),name:string(specification.industry?.name,profile.label),category:string(specification.industry?.category,profile.id),visualProfile:profile.id,visualConfidence:profile.confidence},designSystem,pages:enrichedPages,qualityPlan,visualAssets:visualAssets.map((description,index)=>({type:index===0?"hero":index===1?"background":"icon_set",description})),experienceSystem:{version:PREMIUM_EXPERIENCE_VERSION,qualityScoreRequired:PREMIUM_VISUAL_SCORE_REQUIRED,industryProfile:profile.id,industryLabel:profile.label,pageCount:enrichedPages.length,pageSpecificLayouts:true,pageSpecificScenes:true,mobileFirst:true,stateCoverage:["loading","empty","error","success"],autoRedesignBeforePreview:true}};
}

const AUDIT_CHECKS=Object.freeze([
  {id:"industry",weight:8,test:spec=>Boolean(spec?.designSystem?.industryProfile&&spec?.experienceSystem?.industryProfile),message:"Industry-specific visual profile is missing."},
  {id:"palette",weight:10,test:spec=>["primaryColor","secondaryColor","accentColor","backgroundColor","surfaceColor","textColor","paletteRationale"].every(key=>string(spec?.designSystem?.[key])),message:"The coordinated palette is incomplete."},
  {id:"system",weight:12,test:spec=>["fontDirection","iconStyle","backgroundDirection","heroDirection","layoutSignature","cardStyle","imageStyle","wallpaperPreset"].every(key=>string(spec?.designSystem?.[key])),message:"The global premium design system is incomplete."},
  {id:"page-contracts",weight:22,test:spec=>array(spec?.pages).length>0&&array(spec?.pages).every(page=>[page?.layout,page?.visualTreatment,page?.backgroundTreatment,page?.experience?.layoutFamily,page?.experience?.sceneDirection,page?.experience?.primaryAction].every(string)),message:"One or more pages are missing a page-specific visual contract."},
  {id:"states",weight:14,test:spec=>array(spec?.pages).every(page=>["loading","empty","error","success"].every(key=>string(page?.experience?.states?.[key]))),message:"Every page must define loading, empty, error and success states."},
  {id:"mobile",weight:14,test:spec=>array(spec?.pages).every(page=>Number(page?.experience?.mobile?.minTouchTargetPx)>=44&&page?.experience?.mobile?.safeAreaAware===true&&page?.experience?.mobile?.keyboardAware===true&&page?.experience?.mobile?.horizontalPageScroll===false),message:"Every page must pass the iPhone mobile contract."},
  {id:"accessibility",weight:10,test:spec=>array(spec?.pages).every(page=>page?.experience?.accessibility?.focusVisible===true&&page?.experience?.accessibility?.reducedMotion===true&&string(page?.experience?.accessibility?.contrast)),message:"Accessibility treatment is incomplete on one or more pages."},
  {id:"originality",weight:5,test:spec=>{const layouts=array(spec?.pages).map(page=>string(page?.experience?.layoutFamily)).filter(Boolean);return layouts.length<3||new Set(layouts).size>=Math.min(3,layouts.length)},message:"Three or more pages repeat the same layout family."},
  {id:"quality-evidence",weight:5,test:spec=>["stability","security","privacy","comfort","beauty","naturalness"].every(id=>array(spec?.qualityPlan?.[id]).length>=3),message:"Concrete quality implementation evidence is incomplete."}
]);

export function auditPremiumExperience(input={}){
  const checks=AUDIT_CHECKS.map(check=>{let passed=false;try{passed=Boolean(check.test(input))}catch{}return{id:check.id,weight:check.weight,passed,message:check.message}});const score=checks.reduce((total,check)=>total+(check.passed?check.weight:0),0);const errors=checks.filter(check=>!check.passed).map(check=>`${check.id.toUpperCase()}: ${check.message}`);return{version:PREMIUM_EXPERIENCE_VERSION,score,required:PREMIUM_VISUAL_SCORE_REQUIRED,passed:score===PREMIUM_VISUAL_SCORE_REQUIRED,checks,errors,pagesAudited:array(input?.pages).length,methodology:"deterministic-premium-page-audit-v1"};
}

export function redesignAndAuditPremiumExperience(input={},context={}){
  const before=auditPremiumExperience(input),specification=enforcePremiumExperience(input,context),after=auditPremiumExperience(specification);return{specification,before,after,redesigned:!before.passed&&after.passed,passed:after.passed,repairInstruction:after.passed?"":after.errors.map(error=>`- ${error}`).join("\n")};
}

export const PREMIUM_EXPERIENCE_AI_INSTRUCTION = `
SYSTEM-LEVEL PREMIUM EXPERIENCE CONTRACT
Every generated App and Website page—not only the landing page—must meet a 100-point visual quality contract before Preview. For every page, return a page.experience object containing: industryProfile, pageRole, layoutFamily, sceneDirection, imageDirection, navigationPattern, primaryAction, hero, typography, cards, states, mobile, accessibility and qualityChecklist.

INDUSTRY ADAPTATION
Detect the real industry and change the composition, imagery, information density, typography personality, navigation model, card behavior and color rationale. Real estate, restaurant, travel, finance, healthcare, education, commerce and social/community products must not look like recolored versions of one template. Preserve one premium quality floor while creating an original visual identity for the customer's product.

PAGE VARIETY
Adjacent pages must use purpose-specific layout families and scene directions. Keep shared tokens and brand continuity, but do not repeat the same hero-card grid on every page. A page-specific background or visual field must support the page's job rather than act as decoration.

STATE QUALITY
Every page must explicitly design loading, empty, error and success states. These states preserve the brand system, use calm human language, protect entered work and show one useful next action.

IPHONE-FIRST CONTRACT
Every page must use at least 44px touch targets, safe-area padding, keyboard-aware actions, no horizontal page scrolling, readable 16px body copy, visible focus, WCAG AA contrast and reduced-motion support. Bottom navigation, sheets and dialogs must remain reachable on narrow iPhones and in portrait or landscape.

AUTOMATIC REDESIGN
The deterministic visual auditor runs before Preview. A page below 100 is enriched or redesigned and checked again. Preview is accepted only when the final page contracts, state coverage, mobile rules, accessibility and layout variety all pass.
`;
