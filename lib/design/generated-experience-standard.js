export const GENERATED_EXPERIENCE_STANDARD_ID = "laneriq-premium-experience-v1";

export const GENERATED_APP_VISUAL_RULES = Object.freeze([
  "First output must already feel like a polished released product; never emit a generic wireframe or browser-default UI.",
  "Quality DNA is fixed but customer identity is not: hierarchy, craft, depth, interaction quality and consistency are mandatory while imagery, colors and atmosphere adapt to industry, brand and selected style.",
  "Every page in one project must use the same typography system, spacing rhythm, radii, card language, CTA hierarchy, icon family, navigation logic, motion language and background logic.",
  "Mobile-first is mandatory with responsive tablet and desktop adaptations; touch targets must be at least 44px where interactive.",
  "Links, buttons, fields, tables and controls must never fall back to unstyled browser defaults.",
  "Loading, empty, error, success, disabled, selected, focus and destructive states must be intentionally designed.",
  "A memorable hero or atmospheric first-screen moment should be used when appropriate, without reducing readability or task completion.",
  "One primary action must be visually obvious per major screen; secondary actions must not compete with it.",
  "LANERIQ AI branding is a quality signature, not customer-facing template copy. Generated products should primarily look like the customer's own product.",
  "Visual QA must reject inconsistent page styling, placeholder composition, inaccessible contrast and random template mixing."
]);

export const GENERATED_PAGE_STYLE_RULES = Object.freeze({
  shell:["BackgroundLayer","Header","HeroOrPageHeader","PrimaryContent","PrimaryActions","Navigation"],
  tokens:["background","surface","surfaceElevated","primary","secondary","accent","textPrimary","textSecondary","border","success","warning","danger","radius","shadow","spacing","typography"],
  minimums:{pageInlineMobile:16,cardRadius:18,controlRadius:12,tapTarget:44,bottomNavHeight:64},
  consistency:["typography","spacing","radii","cards","ctaHierarchy","navigation","formControls","icons","motion","backgroundLogic"],
  requiredStates:["loading","empty","error","success","disabled","selected","focus","destructive"],
  forbidden:["unstyled blue links","browser-default buttons","browser-default form controls","naked tables without mobile treatment","mixed unrelated design systems","placeholder-only sections"]
});

export const PROPERTY_CRM_GOLDEN_REFERENCE = Object.freeze({
  id:"property-crm-golden-reference-v1",
  industry:"property",
  hero:{
    eyebrow:"PROPERTY COMMAND CENTER",
    title:"Your Properties. Your Clients. One Intelligent Workspace.",
    description:"A premium real-estate operating system for listings, leads, viewings, follow-up and portfolio performance."
  },
  palette:{
    primaryColor:"#55c8ff",
    secondaryColor:"#163d62",
    accentColor:"#f1bd4b",
    backgroundColor:"#03101f",
    surfaceColor:"#0b2237",
    textColor:"#f8fbff"
  },
  design:{
    mood:"premium cinematic real-estate command center",
    visualDirection:"deep navy glass, moonlit city atmosphere, refined gold highlights and ice-blue data accents",
    backgroundDirection:"immersive future-city and water atmosphere with readable dark gradient protection",
    heroDirection:"cinematic real-estate command center hero with portfolio summary and decisive actions",
    layoutSignature:"mobile-first executive dashboard with glass KPI cards, action dock and bottom app navigation",
    fontDirection:"clean modern sans with restrained editorial display emphasis",
    iconStyle:"consistent thin-line icons with luminous active states",
    cardStyle:"layered navy glass cards with subtle blue borders and gold priority accents",
    imageStyle:"high-end property, skyline, map and architectural imagery with cinematic grading",
    motionDirection:"short calm transitions, no decorative motion that delays work",
    wallpaperPreset:"neon-skyline"
  },
  pages:[
    {id:"dashboard",name:"Dashboard",route:"/",description:"Property Command Center — portfolio value, hot leads, upcoming viewings and priority follow-up in one screen.",purpose:"See the state of the business and act on urgent property and client work.",components:["Portfolio Value","Property KPI","Lead KPI","Viewing KPI","Follow-up KPI","Hot Leads","Upcoming Viewings","AI Follow-Up Suggestions"]},
    {id:"properties",name:"Properties",route:"/properties",description:"Manage active, reserved, sold and off-market listings with premium visual cards and fast filters.",purpose:"Find, add and manage property inventory.",components:["Property Search","Status Filters","Property Cards","Add Property"]},
    {id:"clients",name:"Clients",route:"/clients",description:"Track buyers, sellers, tenants, landlords and lead temperature with next-action visibility.",purpose:"Manage client relationships and lead progression.",components:["Client Search","Lead Temperature","Client Timeline","New Lead"]},
    {id:"viewings",name:"Viewings",route:"/viewings",description:"Plan appointments, viewing routes, confirmations and follow-up tasks from a mobile-first schedule.",purpose:"Coordinate property viewings and next steps.",components:["Viewing Calendar","Today Route","Confirmation Status","Follow-Up Queue"]},
    {id:"reports",name:"Reports",route:"/reports",description:"Understand pipeline value, conversion, listing performance and follow-up health with clear visual summaries.",purpose:"Measure business performance and identify next actions.",components:["Pipeline Value","Lead Conversion","Listing Performance","Follow-Up Health"]}
  ],
  features:[
    {name:"Lead Management",description:"Prioritize and progress buyer, seller, tenant and landlord leads with visible next actions.",uiPattern:"priority lead cards with status, temperature and next-action chips"},
    {name:"Property Pipeline",description:"Track listing status and deal progression without losing inventory context.",uiPattern:"visual pipeline with property imagery and status progression"},
    {name:"Viewing Planner",description:"Coordinate appointments, confirmations, routes and follow-up from one mobile workflow.",uiPattern:"calendar plus compact itinerary cards"},
    {name:"AI Follow-Up Suggestions",description:"Surface sensible next actions from client and viewing context without pretending an external message was sent.",uiPattern:"explainable recommendation cards with explicit action buttons"}
  ]
});

function normalizedText(value){return String(value||"").toLowerCase();}
function textOfSpec(specification={},app={}){
  return [app?.name,app?.description,specification?.name,specification?.description,JSON.stringify(specification?.industry||{}),JSON.stringify(specification?.pages||[]),JSON.stringify(specification?.features||[])].filter(Boolean).join(" ").toLowerCase();
}
function detectIndustry(specification={},app={}){
  const value=textOfSpec(specification,app);
  if(/property|real estate|realtor|listing|buyer|seller|tenant|landlord|viewing/.test(value))return "property";
  if(/restaurant|food|menu|dining|cafe/.test(value))return "hospitality";
  if(/school|education|student|course|learning/.test(value))return "education";
  if(/health|clinic|medical|patient|doctor/.test(value))return "health";
  if(/shop|commerce|product|cart|order|retail/.test(value))return "commerce";
  return "general";
}
function keyOf(item,index){return normalizedText(item?.route||item?.id||item?.name||`item-${index}`).replace(/[^a-z0-9]+/g,"-");}
function mergeNamed(primary=[],secondary=[]){
  const seen=new Set();const out=[];
  [...primary,...secondary].forEach((item,index)=>{const key=keyOf(item,index);if(seen.has(key))return;seen.add(key);out.push(item)});
  return out;
}
function mergeGoldenPages(existing=[]){
  const byKey=new Map(existing.map((page,index)=>[keyOf(page,index),page]));
  const golden=PROPERTY_CRM_GOLDEN_REFERENCE.pages.map((page,index)=>{
    const current=byKey.get(keyOf(page,index))||byKey.get(normalizedText(page.name).replace(/[^a-z0-9]+/g,"-"))||{};
    return {...current,...page,components:mergeNamed(page.components.map(name=>({name})),Array.isArray(current.components)?current.components:[]).map(item=>typeof item==="string"?item:(item?.name||item))};
  });
  const goldenKeys=new Set(golden.map(keyOf));
  return [...golden,...existing.filter((page,index)=>!goldenKeys.has(keyOf(page,index)))];
}
function customerHasCustomPalette(design={}){
  return design?.themeMode==="custom"||Boolean(design?.customerSelectedColors)||Boolean(design?.brandKitApplied);
}

export function applyGeneratedExperienceStandard({specification={},app={}}={}){
  const spec=specification&&typeof specification==="object"?specification:{};
  const industry=detectIndustry(spec,app);
  const existingDesign=spec.designSystem&&typeof spec.designSystem==="object"?spec.designSystem:{};
  const isProperty=industry==="property";
  const palette=isProperty&&!customerHasCustomPalette(existingDesign)?PROPERTY_CRM_GOLDEN_REFERENCE.palette:{};
  const goldenDesign=isProperty?PROPERTY_CRM_GOLDEN_REFERENCE.design:{};
  const designSystem={
    ...existingDesign,
    ...palette,
    ...goldenDesign,
    visualStandard:GENERATED_EXPERIENCE_STANDARD_ID,
    pageConsistency:"One shared typography, spacing, card, CTA, navigation, form-control, icon, motion and background system across every page.",
    stateSystem:"Designed loading, empty, error, success, disabled, selected, focus and destructive states.",
    designTokens:{...GENERATED_PAGE_STYLE_RULES.minimums,...(existingDesign.designTokens||{})}
  };
  const pages=isProperty?mergeGoldenPages(Array.isArray(spec.pages)?spec.pages:[]):Array.isArray(spec.pages)?spec.pages:[];
  const features=isProperty?mergeNamed(PROPERTY_CRM_GOLDEN_REFERENCE.features,Array.isArray(spec.features)?spec.features:[]):Array.isArray(spec.features)?spec.features:[];
  const navigation=(Array.isArray(spec.navigation)&&spec.navigation.length?spec.navigation:pages.map(page=>({label:page.name,route:page.route}))).map(item=>({...item}));
  const qualityPlan={...(spec.qualityPlan||{})};
  const beauty=Array.isArray(qualityPlan.beauty)?qualityPlan.beauty:[];
  qualityPlan.beauty=mergeNamed([
    "First output renders as a premium released product rather than a generic template or wireframe.",
    "Every page inherits one coherent design-token system and complete interaction-state language.",
    "Industry imagery, palette and atmosphere adapt to the customer while LANERIQ quality, hierarchy and craft remain consistent."
  ].map(name=>({name})),beauty.map(name=>({name}))).map(item=>item.name);
  const comfort=Array.isArray(qualityPlan.comfort)?qualityPlan.comfort:[];
  qualityPlan.comfort=mergeNamed([
    "Mobile-first layout uses comfortable spacing and at least 44px interactive targets.",
    "Navigation and primary actions remain obvious on iPhone, tablet and desktop.",
    "Forms and data views have readable responsive treatments instead of browser-default controls."
  ].map(name=>({name})),comfort.map(name=>({name}))).map(item=>item.name);
  return {
    industry,
    standardId:GENERATED_EXPERIENCE_STANDARD_ID,
    specification:{...spec,designSystem,pages,features,navigation,qualityPlan}
  };
}

export const GENERATED_EXPERIENCE_AI_INSTRUCTION = `
LANERIQ AI GENERATED EXPERIENCE STANDARD
LANERIQ AI does not generate drafts. It generates premium first versions. Every App, Game and Website must feel intentionally designed, production-ready and visually coherent from the first generation.

QUALITY DNA VS CUSTOMER IDENTITY
Keep LANERIQ quality consistent, but keep each customer's visual identity unique. Do not force every customer into one water/city composition or one palette. Adapt colors, imagery, atmosphere and visual language to the industry, brand kit and selected style while preserving premium hierarchy, spacing, depth, interaction quality and consistency.

HARD VISUAL RULES
${GENERATED_APP_VISUAL_RULES.map((rule,index)=>`${index+1}. ${rule}`).join("\n")}

PAGE / STYLE IMPLEMENTATION CONTRACT
Every page must inherit the same design tokens and component language. Record designSystem.visualStandard as "${GENERATED_EXPERIENCE_STANDARD_ID}", designSystem.pageConsistency, designSystem.stateSystem and designSystem.designTokens. Use a mobile-first shell with background, header, hero/page header, primary content, primary actions and navigation. Do not use browser-default links, controls or tables.

PROPERTY CRM GOLDEN REFERENCE
For property / real-estate products, use the Property CRM reference as the quality benchmark: a premium command center with portfolio KPIs, Hot Leads, Upcoming Viewings, Property Pipeline and AI Follow-Up Suggestions. Use premium real-estate imagery and an executive mobile dashboard. Treat this as a quality and information-architecture reference, not customer-facing LANERIQ branding and not a pixel-for-pixel template.
`;
