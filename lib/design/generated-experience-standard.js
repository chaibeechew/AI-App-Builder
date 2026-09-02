export const GENERATED_EXPERIENCE_STANDARD_ID = "laneriq-premium-experience-v1";

export const GENERATED_APP_VISUAL_RULES = Object.freeze([
  "First output must already feel like a polished released product; never emit a generic wireframe or browser-default UI.",
  "Quality DNA is fixed but customer identity is not: hierarchy, craft, depth, interaction quality and consistency are mandatory while imagery, colors and atmosphere adapt to industry, brand and selected style.",
  "Every page in one project must use the same typography system, spacing rhythm, radii, card language, CTA hierarchy, icon family, navigation logic, motion language and background logic.",
  "Mobile-first is mandatory with responsive tablet and desktop adaptations; touch targets must be at least 44px where interactive.",
  "Links, buttons, fields, tables and controls must never fall back to unstyled browser defaults.",
  "Loading, empty, error, success, disabled, selected, focus and destructive states must be intentionally designed.",
  "A memorable hero or atmospheric first-screen moment should be used when appropriate, without reducing readability or task completion.",
  "When meaningful imagery is appropriate, the first screen must visibly communicate the industry through relevant people, places, products or service actions instead of relying on text alone.",
  "Display typography must not hide the industry's visual subject or consume most of the mobile viewport; default mobile hero titles should normally remain about 28-40px and section headings about 22-30px unless the customer explicitly requests otherwise.",
  "Major generated images must be visually distinct: do not repeat the same hero composition across unrelated projects or reuse one scene across multiple major sections without a reason.",
  "One primary action must be visually obvious per major screen; secondary actions must not compete with it.",
  "LANERIQ AI branding is a quality signature, not customer-facing template copy. Generated products should primarily look like the customer's own product.",
  "Visual QA must reject inconsistent page styling, placeholder composition, inaccessible contrast, industry-irrelevant hero imagery, text-only first screens where media is appropriate, and random template mixing."
]);

export const GENERATED_PAGE_STYLE_RULES = Object.freeze({
  shell:["BackgroundLayer","Header","HeroOrPageHeader","PrimaryContent","PrimaryActions","Navigation"],
  tokens:["background","surface","surfaceElevated","primary","secondary","accent","textPrimary","textSecondary","border","success","warning","danger","radius","shadow","spacing","typography"],
  minimums:{pageInlineMobile:16,cardRadius:18,controlRadius:12,tapTarget:44,bottomNavHeight:64},
  typography:{mobileHeroMin:28,mobileHeroMax:40,mobileSectionMax:30},
  visualComposition:{industryMediaRequiredWhenUseful:true,avoidTextOnlyHero:true,avoidRepeatedMajorImage:true},
  consistency:["typography","spacing","radii","cards","ctaHierarchy","navigation","formControls","icons","motion","backgroundLogic"],
  requiredStates:["loading","empty","error","success","disabled","selected","focus","destructive"],
  forbidden:["unstyled blue links","browser-default buttons","browser-default form controls","naked tables without mobile treatment","mixed unrelated design systems","placeholder-only sections","industry-irrelevant hero imagery","text-only first screen when meaningful media is appropriate"]
});

export const GENERATED_DISTRIBUTION_STANDARD = Object.freeze({
  share:{enabled:true,methods:["shareable-link","private-or-authenticated-link","qr-ready"]},
  install:{pwa:true,ios:"Add to Home Screen / installable web app",android:"Install App / add to home screen"},
  stores:{ios:["TestFlight preparation","App Store Connect preparation"],android:["Internal or closed testing preparation","Google Play production preparation"],humanApprovalRequired:true,evidenceRequiredBeforeClaimingPublished:true}
});

export const PROPERTY_CRM_GOLDEN_REFERENCE = Object.freeze({
  id:"property-crm-golden-reference-v1",
  industry:"property",
  hero:{
    eyebrow:"PROPERTY COMMAND CENTER",
    title:"Your Properties. Your Clients. One Intelligent Workspace.",
    description:"A premium real-estate operating system for listings, leads, viewings, follow-up and portfolio performance.",
    visualSubjects:["high-rise buildings","apartments","houses","property interiors","agents","clients","phones","tablets","laptops"],
    serviceActions:["showing listings on a phone","reviewing property details on a tablet","client consultation","viewing planning","map and location review"],
    imageTextBalance:"Keep the property scene clearly visible; use concise supporting copy rather than oversized display text."
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
    visualDirection:"deep navy glass, premium high-rise and residential property imagery, real service people, refined gold highlights and ice-blue data accents",
    backgroundDirection:"recognizable real-estate environment with buildings, apartments or homes plus agents/clients using devices; cinematic future treatment may enhance the scene but cannot replace property meaning",
    heroDirection:"image-led real-estate command center with visible property environment, people/service context, concise portfolio summary and decisive actions",
    layoutSignature:"mobile-first executive dashboard with visible hero media, compact title hierarchy, glass KPI cards, action dock and bottom app navigation",
    fontDirection:"clean modern sans with compact mobile display hierarchy; hero title normally 28-40px and section titles 22-30px",
    iconStyle:"consistent thin-line icons with luminous active states and property-relevant symbols",
    cardStyle:"layered navy glass cards with subtle blue borders and gold priority accents; keep enough transparency for the scene to remain visible",
    imageStyle:"high-end property, skyline, apartment, house, interior, map and human service imagery with cinematic grading; major scenes should not repeat",
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
    visualComposition:"Industry-relevant media remains clearly visible; display type must not overpower the visual subject; major imagery should not repeat without purpose.",
    designTokens:{...GENERATED_PAGE_STYLE_RULES.minimums,...(existingDesign.designTokens||{})},
    typographyGuard:{...GENERATED_PAGE_STYLE_RULES.typography,...(existingDesign.typographyGuard||{})}
  };
  const pages=isProperty?mergeGoldenPages(Array.isArray(spec.pages)?spec.pages:[]):Array.isArray(spec.pages)?spec.pages:[];
  const features=isProperty?mergeNamed(PROPERTY_CRM_GOLDEN_REFERENCE.features,Array.isArray(spec.features)?spec.features:[]):Array.isArray(spec.features)?spec.features:[];
  const navigation=(Array.isArray(spec.navigation)&&spec.navigation.length?spec.navigation:pages.map(page=>({label:page.name,route:page.route}))).map(item=>({...item}));
  const qualityPlan={...(spec.qualityPlan||{})};
  const beauty=Array.isArray(qualityPlan.beauty)?qualityPlan.beauty:[];
  qualityPlan.beauty=mergeNamed([
    "First output renders as a premium released product rather than a generic template or wireframe.",
    "Every page inherits one coherent design-token system and complete interaction-state language.",
    "Industry imagery, palette and atmosphere adapt to the customer while LANERIQ quality, hierarchy and craft remain consistent.",
    "The first screen uses meaningful industry media when appropriate, with display typography sized so the visual subject stays clearly visible.",
    "Major generated imagery is intentionally varied instead of repeating the same scene across pages or projects."
  ].map(name=>({name})),beauty.map(name=>({name}))).map(item=>item.name);
  const comfort=Array.isArray(qualityPlan.comfort)?qualityPlan.comfort:[];
  qualityPlan.comfort=mergeNamed([
    "Mobile-first layout uses comfortable spacing and at least 44px interactive targets.",
    "Navigation and primary actions remain obvious on iPhone, tablet and desktop.",
    "Forms and data views have readable responsive treatments instead of browser-default controls."
  ].map(name=>({name})),comfort.map(name=>({name}))).map(item=>item.name);
  const distributionPlan={
    share:{...GENERATED_DISTRIBUTION_STANDARD.share,...(spec.distributionPlan?.share||{})},
    install:{...GENERATED_DISTRIBUTION_STANDARD.install,...(spec.distributionPlan?.install||{})},
    stores:{...GENERATED_DISTRIBUTION_STANDARD.stores,...(spec.distributionPlan?.stores||{})}
  };
  return {
    industry,
    standardId:GENERATED_EXPERIENCE_STANDARD_ID,
    specification:{...spec,designSystem,pages,features,navigation,qualityPlan,distributionPlan}
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
Every page must inherit the same design tokens and component language. Record designSystem.visualStandard as "${GENERATED_EXPERIENCE_STANDARD_ID}", designSystem.pageConsistency, designSystem.stateSystem, designSystem.visualComposition, designSystem.designTokens and designSystem.typographyGuard. Use a mobile-first shell with background, header, hero/page header, primary content, primary actions and navigation. Do not use browser-default links, controls or tables.

INDUSTRY IMAGE / TYPOGRAPHY CONTRACT
When meaningful media is appropriate, the first screen cannot be text-only. Show recognizable industry content and keep it visible. Do not use giant display text to hide the visual subject. Major visual assets must be distinct rather than repeating the same scene throughout the project.

PROPERTY CRM GOLDEN REFERENCE
For property / real-estate products, use the Property CRM reference as the quality benchmark: a premium command center with visible buildings/houses/apartments, agents or clients using devices where suitable, portfolio KPIs, Hot Leads, Upcoming Viewings, Property Pipeline and AI Follow-Up Suggestions. Use premium real-estate imagery and an executive mobile dashboard. Treat this as a quality and information-architecture reference, not customer-facing LANERIQ branding and not a pixel-for-pixel template.

DISTRIBUTION CONTRACT
Every generated App must be prepared for a shareable/private web link, installable PWA path and native-store preparation path. External App Store or Google Play publication must never be claimed complete without real submission and approval evidence.
`;
