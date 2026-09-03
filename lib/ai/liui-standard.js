const safeObject=value=>value&&typeof value==="object"&&!Array.isArray(value)?value:{};
const safeArray=value=>Array.isArray(value)?value:[];
const text=value=>String(value||"").trim();
const unique=values=>[...new Set(safeArray(values).map(value=>text(value)).filter(Boolean))];

export const LIUI_VERSION="2.0";
export const LIUI_STANDARD_NAME="LANERIQ AI Living Intelligence UI™";
export const LIUI_STANDARD_CN="LANERIQ AI 智能生命界面系统";
export const LIUI_SCORE_REQUIRED=95;

export const LIUI_SCORE_DIMENSIONS=Object.freeze([
  {id:"visualQuality",name:"Visual Quality",weight:15},
  {id:"uxClarity",name:"UX Clarity",weight:15},
  {id:"responsiveness",name:"Responsiveness",weight:10},
  {id:"accessibility",name:"Accessibility",weight:10},
  {id:"performance",name:"Performance",weight:10},
  {id:"interactionQuality",name:"Interaction Quality",weight:10},
  {id:"aiIntegration",name:"AI Integration",weight:10},
  {id:"errorStates",name:"Error / Empty / Loading States",weight:5},
  {id:"brandConsistency",name:"Brand Consistency",weight:5},
  {id:"industryFit",name:"Industry Fit",weight:5},
  {id:"trustPermission",name:"Trust / Permission UX",weight:5},
]);

export const LIUI_RISK_LEVELS=Object.freeze({
  0:{label:"Pure UI suggestion",execution:"automatic"},
  1:{label:"Reversible local action",execution:"automatic_with_undo"},
  2:{label:"Data modification",execution:"visible_notice"},
  3:{label:"External action",execution:"confirmation_required"},
  4:{label:"Financial / Legal / Security sensitive",execution:"strong_confirmation_required"},
});

export const LIUI_DESIGN_MODES=Object.freeze(["professional","premium","future","playful","immersive","minimal","data","commerce"]);
export const LIUI_MOTION_MODES=Object.freeze([0,1,2,3,4]);
export const LIUI_DENSITY_MODES=Object.freeze(["focus","comfortable","productive","expert"]);
export const LIUI_PERFORMANCE_MODES=Object.freeze(["ultra","high","balanced","eco","accessibility_reduced_motion"]);

export const LIUI_DESIGN_BRAIN_STEPS=Object.freeze([
  "Understand Request","Identify Industry","Identify User Type","Understand Goal","Generate Information Architecture","Choose Design Mode","Choose Component Grammar","Generate UI","Generate Responsive Variants","Generate States","Accessibility Test","Performance Test","Visual QA","Browser / Runtime QA","Self-Heal","Final Release"
]);

export const LIUI_ANTI_PATTERNS=Object.freeze([
  "whole_page_glass","animation_everywhere","all_buttons_3d","accent_color_overload","missing_visual_hierarchy","gradient_overload","meaningless_bento","chatbot_dominates_product","desktop_shrunk_into_mobile","mobile_enlarged_into_desktop","missing_loading","missing_empty_state","missing_error_recovery","beautiful_homepage_weak_inner_pages","unconfirmed_high_risk_execution"
]);

export const LIUI_MASTER_STANDARD=Object.freeze({
  name:LIUI_STANDARD_NAME,
  chineseName:LIUI_STANDARD_CN,
  version:LIUI_VERSION,
  engine:"AI-Native Adaptive Generative Interface Engine",
  principle:"Don’t make users find the interface. Make the interface find the user.",
  productPrinciple:"Powerful underneath. Simple on the surface. Intelligent everywhere. Human in control.",
  formula:["USER","INTENT","CONTEXT","DEVICE","DATA","HISTORY","PRIORITY","AI"],
  outcome:"BEST INTERFACE FOR THIS MOMENT",
  intentFlow:["Intent","AI understands","UI adapts","Action appears"],
  contextSignals:["who","what","why","when","where","device","capability","history","priority"],
  stack:["Intent Intelligence","Generative UI","Context Adaptive UI","Adaptive Bento","Living Cards","Liquid Intelligence Glass","Semantic Motion","Tactile Interaction","Voice Native Interface","Universal AI Command Layer","Predictive Actions","Personal UI Memory","Dynamic Branding","Device Adaptive UX","Performance Adaptive UX","Network Adaptive UX","Accessibility Intelligence","Trust & Permission UX","Industry Intelligence","AI Design Brain","AI Self-Healing","LIUI Quality Gate"],
  deviceModels:{phone:["bottom_navigation","thumb_reach","one_hand_control","full_screen_task_flow","swipe_actions","voice_shortcuts"],tablet:["split_view","side_panel","drag_drop","multi_content_workspace"],desktop:["sidebar","multi_panel","command_palette","keyboard_shortcuts","parallel_workspace"],large_display:["command_center","multiple_live_panels","analytics","monitoring","collaboration"]},
  livingCardStates:["idle","live","listening","thinking","processing","needs_attention","warning","success"],
  voiceFlow:["speak","understand","preview","execute"],
  highRiskVoiceFlow:["speak","understand","confirm","execute"],
  progressiveIntelligence:["simple","guided","advanced","power_user","autonomous"],
  selfHealFlow:["generate","render","inspect","score","repair","retest","release"],
  releaseBands:{premium:{min:95,max:100,action:"production_eligible_with_separate_real_evidence"},optimize:{min:90,max:94,action:"automatic_optimization_required"},selfHeal:{min:80,max:89,action:"self_heal_required"},blocked:{min:0,max:79,action:"completion_blocked"}},
  evidenceStates:["design_spec","code","emulation","browser_verified","device_verified","provider_ready","live","production"],
});

const intentModel=Object.freeze({
  intentFirst:true,
  signals:["user","intent","context","device","data","history","priority","ai"],
  rule:"Decide the user's most likely current goal before deciding which page, cards, navigation, CTA or AI actions should appear."
});

function deriveEvidence(spec){
  const design=safeObject(spec.designSystem),quality=safeObject(spec.qualityPlan),liui=safeObject(spec.liui);
  const pages=safeArray(spec.pages),features=safeArray(spec.features),actions=safeArray(spec.actions),navigation=safeArray(spec.navigation);
  const industry=safeObject(spec.industry);
  const stability=unique(quality.stability),comfort=unique(quality.comfort),beauty=unique(quality.beauty),privacy=unique(quality.privacy),security=unique(quality.security),naturalness=unique(quality.naturalness);
  const designEvidence=[design.visualDirection,design.backgroundDirection,design.heroDirection,design.layoutSignature,design.fontDirection,design.iconStyle,design.cardStyle,design.imageStyle,design.paletteRationale].map(text).filter(Boolean);
  const pageEvidence=pages.flatMap(page=>[page?.layout,page?.visualTreatment,page?.backgroundTreatment,page?.purpose,page?.description]).map(text).filter(Boolean);
  return {
    visualQuality:unique([...safeArray(liui?.evidence?.visualQuality),...beauty,...designEvidence]),
    uxClarity:unique([...safeArray(liui?.evidence?.uxClarity),...comfort,...naturalness,...navigation.map(item=>`${item?.label||""} ${item?.route||""}`)]),
    responsiveness:unique([...safeArray(liui?.evidence?.responsiveness),...comfort,...pageEvidence.filter(value=>/(responsive|mobile|tablet|desktop|safe-area|adaptive|split|sidebar|bottom)/i.test(value)),"Phone, tablet and desktop use distinct interaction models instead of scaled copies."]),
    accessibility:unique([...safeArray(liui?.evidence?.accessibility),...comfort,...designEvidence.filter(value=>/(readable|contrast|accessible|type|font|motion)/i.test(value)),"Contrast, focus, keyboard, screen-reader labels, touch targets and reduced-motion preferences are generation-time requirements."]),
    performance:unique([...safeArray(liui?.evidence?.performance),text(design.motionDirection),"Performance mode defaults to BALANCED and reduces blur, animation, particles, 3D, refresh work and local AI load when runtime capability degrades.","Smoothness, battery, heat and frame stability take priority over visual effects."]),
    interactionQuality:unique([...safeArray(liui?.evidence?.interactionQuality),...actions.map(action=>typeof action==="string"?action:`${action?.name||""} ${action?.description||""}`),...features.map(feature=>typeof feature==="string"?feature:`${feature?.name||""} ${feature?.uiPattern||""}`),"Semantic motion communicates state; important create/build/publish/send/confirm actions may use restrained tactile feedback."]),
    aiIntegration:unique([...safeArray(liui?.evidence?.aiIntegration),"Universal AI Command Layer translates natural-language goals into search, filter, generated UI and suggested actions.","Predictive actions may Suggest or Prepare; external or high-impact Execute operations remain permission-bound.","Personal UI Memory can learn layout and workflow preferences while remaining viewable, editable, disableable and resettable."]),
    errorStates:unique([...safeArray(liui?.evidence?.errorStates),...stability,"Every loading, empty, error, offline, permission-denied, timeout, failed-AI, failed-payment, upload and deployment state provides what happened, why, recovery and AI Fix when safe."]),
    brandConsistency:unique([...safeArray(liui?.evidence?.brandConsistency),...designEvidence,"Adaptive branding may change color, motion, sound or day/night treatment while preserving a recognizable brand identity." ]),
    industryFit:unique([...safeArray(liui?.evidence?.industryFit),text(industry.name),text(industry.category),...features.map(feature=>typeof feature==="string"?feature:`${feature?.name||""} ${feature?.description||""}`),"Industry workflow determines functions, information architecture and workflow, not only color." ]),
    trustPermission:unique([...safeArray(liui?.evidence?.trustPermission),...privacy,...security,"Invisible intelligence, visible consequences: Level 3 external actions require confirmation and Level 4 financial/legal/security actions require strong confirmation." ]),
  };
}

export function applyLivingIntelligenceStandard(specification={}){
  const spec=safeObject(specification),design=safeObject(spec.designSystem),existing=safeObject(spec.liui);
  const designMode=LIUI_DESIGN_MODES.includes(String(existing.designMode||"").toLowerCase())?String(existing.designMode).toLowerCase():"professional";
  const motionMode=LIUI_MOTION_MODES.includes(Number(existing.motionMode))?Number(existing.motionMode):2;
  const densityMode=LIUI_DENSITY_MODES.includes(String(existing.densityMode||"").toLowerCase())?String(existing.densityMode).toLowerCase():"comfortable";
  const performanceMode=LIUI_PERFORMANCE_MODES.includes(String(existing.performanceMode||"").toLowerCase())?String(existing.performanceMode).toLowerCase():"balanced";
  const base={
    ...spec,
    designSystem:{...design,designStandard:LIUI_STANDARD_NAME,designStandardVersion:LIUI_VERSION,intentFirst:true,adaptiveGenerativeInterface:true},
    liui:{
      ...existing,
      standard:LIUI_STANDARD_NAME,
      version:LIUI_VERSION,
      engine:"AI-Native Adaptive Generative Interface Engine",
      intentModel:{...intentModel,...safeObject(existing.intentModel)},
      generativeUi:{enabled:true,guardrail:"LANERIQ Design Grammar",allowedDecisions:["components","visibility","card_size","card_order","cta","shortcuts","information_hierarchy","suggested_actions","navigation_shortcuts","dashboard_structure"],...safeObject(existing.generativeUi)},
      adaptiveLayout:{enabled:true,rule:"Same product. Different interaction model.",phone:"thumb-first / bottom-navigation / one-hand task flow",tablet:"split view / side panel / drag-drop",desktop:"sidebar / multi-panel / command palette / keyboard",largeDisplay:"command center / live panels / collaboration",...safeObject(existing.adaptiveLayout)},
      adaptiveBento:{enabled:true,sizes:["xl_critical","large_high_priority","medium_frequent","small_secondary","collapsed_low_priority","hidden_irrelevant"],signals:["importance","urgency","usage","context","screen_size"],...safeObject(existing.adaptiveBento)},
      livingCards:{enabled:true,states:["idle","live","listening","thinking","processing","needs_attention","warning","success"],...safeObject(existing.livingCards)},
      liquidIntelligenceGlass:{enabled:true,contentFirst:true,preferredSurfaces:["navigation","command_bar","ai_interface","floating_controls","modal","media","search","preview","context_menu"],degradeOn:["low_contrast","performance_drop","accessibility_conflict"],...safeObject(existing.liquidIntelligenceGlass)},
      semanticMotion:{enabled:true,decorationOnlyOverload:false,defaultMax:3,motionMode,...safeObject(existing.semanticMotion)},
      tactileInteraction:{enabled:true,importantActions:["generate","create","build","publish","deploy","send","record","confirm"],ordinaryButtons3d:false,...safeObject(existing.tactileInteraction)},
      voiceNative:{enabled:true,layer:"second_interaction_layer",flow:["speak","understand","preview","execute"],highRiskFlow:["speak","understand","confirm","execute"],...safeObject(existing.voiceNative)},
      aiCommandLayer:{enabled:true,role:"application_control_system",...safeObject(existing.aiCommandLayer)},
      predictiveActions:{enabled:true,modes:["suggest","prepare","execute"],externalExecuteRequiresAuthorization:true,...safeObject(existing.predictiveActions)},
      progressiveIntelligence:{enabled:true,levels:["simple","guided","advanced","power_user","autonomous"],principle:"progressive_intelligence_not_progressive_complexity",...safeObject(existing.progressiveIntelligence)},
      personalUiMemory:{enabled:true,userControl:["view","modify","disable","reset"],...safeObject(existing.personalUiMemory)},
      dynamicBranding:{enabled:true,recognitionConstant:true,...safeObject(existing.dynamicBranding)},
      adaptiveColor:{enabled:true,signals:["industry","brand","audience","context","accessibility","device_display"],customerBrandWins:true,...safeObject(existing.adaptiveColor)},
      adaptiveTypography:{enabled:true,signals:["device","language","content_type","accessibility","information_density"],guardrail:"LANERIQ Type Scale",...safeObject(existing.adaptiveTypography)},
      aiPresence:{enabled:true,modes:["orb","minimal_glow","character","3d_avatar","none"],rule:"AI Presence does not require a character.",...safeObject(existing.aiPresence)},
      performanceAdaptive:{enabled:true,mode:performanceMode,modes:LIUI_PERFORMANCE_MODES,rule:"Smooth > Fancy",reduceWhen:["frame_drop","battery_pressure","device_heat","lag"],...safeObject(existing.performanceAdaptive)},
      networkAdaptive:{enabled:true,states:["fast","slow","offline"],offline:["local_first_workspace","queued_actions","clear_sync_status"],...safeObject(existing.networkAdaptive)},
      zeroDeadEnd:{enabled:true,states:["loading","empty","error","offline","permission_denied","no_data","timeout","failed_ai","failed_payment","failed_upload","failed_deployment"],recoveryFields:["what_happened","why","what_user_can_do","ai_fix_if_safe"],...safeObject(existing.zeroDeadEnd)},
      selfHealing:{enabled:true,flow:["generate","render","inspect","score","repair","retest","release"],checks:["broken_layout","overlap","overflow","low_contrast","missing_state","broken_navigation","mobile_issue","desktop_issue","accessibility_problem","slow_component","invalid_interaction"],...safeObject(existing.selfHealing)},
      accessibilityIntelligence:{enabled:true,requirements:["contrast","font_scale","touch_target","screen_reader_labels","keyboard_navigation","focus_states","reduced_motion","color_blindness","voice_control","captioning"],systemPreferenceAware:true,...safeObject(existing.accessibilityIntelligence)},
      trustPermission:{enabled:true,principle:"Invisible intelligence. Visible consequences.",riskLevels:LIUI_RISK_LEVELS,...safeObject(existing.trustPermission)},
      industryIntelligence:{enabled:true,workflowBeforeTemplate:true,...safeObject(existing.industryIntelligence)},
      designMode,
      motionMode,
      densityMode,
      designBrain:{steps:LIUI_DESIGN_BRAIN_STEPS,...safeObject(existing.designBrain)},
      antiPatterns:LIUI_ANTI_PATTERNS,
      homepageParity:{enabled:true,rule:"Authentication, dashboard, detail, search, settings, profile, billing, error, empty, loading, admin and mobile must share the same design quality floor.",...safeObject(existing.homepageParity)},
      releaseGate:{requiredScore:LIUI_SCORE_REQUIRED,bands:LIUI_MASTER_STANDARD.releaseBands,evidenceSemantics:LIUI_MASTER_STANDARD.evidenceStates,...safeObject(existing.releaseGate)},
    }
  };
  return {...base,liui:{...base.liui,evidence:deriveEvidence(base)}};
}

const DIMENSION_TERMS=Object.freeze({
  visualQuality:["visual","hero","typography","card","image","palette","brand","layout","glass","hierarchy"],
  uxClarity:["clear","intent","goal","navigation","cta","workflow","priority","simple","context","action"],
  responsiveness:["mobile","responsive","phone","tablet","desktop","safe-area","adaptive","split","sidebar","bottom"],
  accessibility:["accessible","accessibility","contrast","readable","tap","keyboard","screen-reader","focus","reduced-motion","caption"],
  performance:["performance","balanced","smooth","frame","battery","heat","blur","animation","refresh","eco"],
  interactionQuality:["interaction","action","semantic","motion","tactile","haptic","state","feedback","confirm","undo"],
  aiIntegration:["ai","intent","command","predictive","memory","suggest","prepare","voice","generative","adaptive"],
  errorStates:["loading","empty","error","offline","retry","timeout","permission","failed","recovery","sync"],
  brandConsistency:["brand","identity","palette","typography","recognition","color","motion","style","visual","consistent"],
  industryFit:["industry","workflow","customer","data","feature","role","domain","service","business","context"],
  trustPermission:["trust","permission","confirm","risk","privacy","security","authorization","undo","external","visible"]
});

function scoreDimension(dimension,evidence,spec){
  const entries=unique(evidence?.[dimension.id]);
  const corpus=[...entries,JSON.stringify(spec?.liui||{}),JSON.stringify(spec?.designSystem||{}),JSON.stringify(spec?.industry||{})].join(" ").toLowerCase();
  const hits=unique(DIMENSION_TERMS[dimension.id].filter(term=>corpus.includes(term))).length;
  const evidenceScore=Math.min(70,entries.length*18);
  const termScore=Math.min(30,hits*4);
  let raw=Math.min(100,evidenceScore+termScore);
  if(dimension.id==="visualQuality"){
    const design=safeObject(spec.designSystem),required=["visualDirection","layoutSignature","fontDirection","cardStyle","imageStyle"];
    if(required.some(key=>!text(design[key])))raw=Math.min(raw,94);
  }
  if(dimension.id==="industryFit"){
    const industry=safeObject(spec.industry);if(!text(industry.name)&&!text(industry.category))raw=Math.min(raw,94);
  }
  if(dimension.id==="interactionQuality"&&safeArray(spec.actions).length===0)raw=Math.min(raw,94);
  if(dimension.id==="errorStates"&&safeArray(spec?.qualityPlan?.stability).length<3)raw=Math.min(raw,94);
  return raw;
}

export function assessLiuiQuality(specification={}){
  const spec=applyLivingIntelligenceStandard(specification),evidence=spec.liui.evidence;
  const dimensions=LIUI_SCORE_DIMENSIONS.map(dimension=>({...dimension,score:scoreDimension(dimension,evidence,spec)}));
  const weighted=dimensions.reduce((sum,dimension)=>sum+(dimension.score*dimension.weight),0)/100;
  const score=Math.round(weighted);
  const releaseBand=score>=95?"LANERIQ_PREMIUM":score>=90?"AUTO_OPTIMIZE":score>=80?"SELF_HEAL_REQUIRED":"BLOCKED";
  return {
    score,
    requiredScore:LIUI_SCORE_REQUIRED,
    passed:score>=LIUI_SCORE_REQUIRED,
    releaseBand,
    action:LIUI_MASTER_STANDARD.releaseBands[score>=95?"premium":score>=90?"optimize":score>=80?"selfHeal":"blocked"].action,
    dimensions,
    standard:LIUI_STANDARD_NAME,
    version:LIUI_VERSION,
    evidenceLevel:"design_spec",
    productionProof:false,
    evidence,
  };
}

export const LIUI_AI_INSTRUCTION=`
LANERIQ AI LIVING INTELLIGENCE UI™ v2.0 — MASTER DESIGN STANDARD
Use LIUI by default for every generated App, Website, Desktop App, iOS App and Android App. LIUI is not a theme, template, fixed UI kit, Liquid Glass skin, Bento skin or chatbot layout. It is an AI-native adaptive generative interface engine.

CORE PHILOSOPHY
Software adapts to human. Start from USER + INTENT + CONTEXT + DEVICE + DATA + HISTORY + PRIORITY + AI, then create the best interface for this moment. Use Intent → AI understands → UI adapts → Action appears. Do not make users hunt through menus when the next useful action can be brought to them.

GENERATIVE UI WITH GRAMMAR
AI may choose component visibility, card size/order, CTA, shortcuts, information hierarchy, suggested actions, navigation shortcuts and dashboard structure, but only inside LANERIQ design grammar for typography, spacing, accessibility, components, motion, brand, interaction and security.

DEVICE / CONTEXT ADAPTATION
Do not merely scale one layout. Phone is thumb-first, one-hand, bottom-navigation/full-screen-task oriented. Tablet may use split view, side panels and drag/drop. Desktop may use sidebar, multi-panel, command palette and keyboard shortcuts. Large displays may use command-center live panels. Same product; different interaction model.

ADAPTIVE BENTO + LIVING CARDS
Use Bento only when it improves information hierarchy. Cards may be XL critical, large high-priority, medium frequent, small secondary, collapsed low-priority or hidden when irrelevant. Living Cards may express idle, live, listening, thinking, processing, needs-attention, warning and success states through restrained motion/light/depth.

LIQUID INTELLIGENCE GLASS
Use glass selectively for navigation, command bars, AI surfaces, floating controls, modals, media, search, preview and context menus. Content first, glass second. Reduce blur/refraction/effects immediately when readability, contrast, accessibility, battery or performance suffers.

SEMANTIC MOTION + TACTILE INTERACTION
Motion must explain meaning, not decorate everything. Use controlled motion for listening, thinking, upload/download, refresh/sync, warning and completion. Important generate/create/build/publish/deploy/send/record/confirm actions may have restrained compression/depth/haptic/rebound. Do not make every button 3D.

VOICE NATIVE + UNIVERSAL AI COMMAND LAYER
Voice is a second interaction layer, not a microphone button. Support live transcription, intent detection, thinking, preview, confirmation and result cards. Normal flow: Speak → Understand → Preview → Execute. High-risk flow: Speak → Understand → Confirm → Execute. AI is an application control system that can translate goals into search/filter/workflows/generated UI, not a chatbot that occupies the whole product.

PREDICTIVE ACTIONS + PROGRESSIVE INTELLIGENCE + UI MEMORY
Learn repeat sequences and surface Suggested Next Action. Suggest may appear automatically. Prepare may precompute low-risk work. Execute with external consequences requires authorization. Complexity unfolds from SIMPLE → GUIDED → ADVANCED → POWER USER → AUTONOMOUS. Personal UI Memory may learn layout/navigation/motion/work habits but must be viewable, editable, disableable and resettable.

BRAND / COLOR / TYPE / AI PRESENCE
Preserve customer brand recognition while allowing adaptive color, motion, sound, day/night or seasonal variation. Color decisions combine industry + brand + audience + context + accessibility + display; customer brand wins over mechanical industry palettes. Typography adapts to device/language/content/density but stays inside LANERIQ Type Scale. AI presence may be an orb, glow, character, 3D avatar or no avatar.

PERFORMANCE + NETWORK ADAPTATION
Default to BALANCED. Smooth > Fancy. Reduce animation, blur, particles, 3D, background effects, refresh rate and local AI workload when frame rate, battery, heat or lag degrades. Fast network can use high-resolution/live data; slow network uses compression/skeleton/lazy loading/cache; offline uses local-first workspace, queued actions and clear sync state. Poor network must not look like a broken app.

ZERO-DEAD-END + SELF-HEAL + ACCESSIBILITY
Cover loading, empty, error, offline, permission denied, no data, timeout, failed AI, failed payment, failed upload and failed deployment. Every dead end states what happened, why, what the user can do and an AI Fix when safe. Generate → Render → Inspect → Score → Repair → Retest → Release. Detect broken layout, overlap, overflow, contrast, missing states, broken navigation, mobile/desktop problems, accessibility, slow components and invalid interactions. Accessibility begins at generation: contrast, font scale, touch target, screen reader labels, keyboard, focus, reduced motion, color blindness, voice control and captions.

TRUST / PERMISSION / RISK
Invisible intelligence. Visible consequences. Level 0 UI suggestion may be automatic. Level 1 reversible local action may be automatic with Undo. Level 2 data modification needs obvious notice. Level 3 external action requires confirmation. Level 4 financial/legal/security sensitive action requires strong confirmation. Never silently execute high-impact actions.

INDUSTRY INTELLIGENCE
Understand industry workflow, entities, roles, data, maps, documents, payments, compliance or domain-specific actions before choosing layout. Industry knowledge changes workflow and information architecture, not just color.

DESIGN MODES / MOTION / DENSITY
Choose a suitable design mode: PROFESSIONAL, PREMIUM, FUTURE, PLAYFUL, IMMERSIVE, MINIMAL, DATA or COMMERCE. Motion defaults to level 2–3; level 4 is mainly for gaming/entertainment/immersive experiences. Density may be FOCUS, COMFORTABLE, PRODUCTIVE or EXPERT based on device, experience and task.

AI DESIGN BRAIN
Execute: Understand Request → Identify Industry → Identify User Type → Understand Goal → Generate Information Architecture → Choose Design Mode → Choose Component Grammar → Generate UI → Generate Responsive Variants → Generate States → Accessibility Test → Performance Test → Visual QA → Browser/Runtime QA → Self-Heal → Final Release.

LIUI SCORE / 100
Visual Quality 15, UX Clarity 15, Responsiveness 10, Accessibility 10, Performance 10, Interaction Quality 10, AI Integration 10, Error/Empty/Loading States 5, Brand Consistency 5, Industry Fit 5, Trust/Permission UX 5. 95–100 = LANERIQ PREMIUM; 90–94 = auto-optimize; 80–89 = Self-Heal; below 80 = completion blocked. LIUI score is design-spec evidence only until browser/device/provider/Production evidence exists.

EVIDENCE SEMANTICS
Always distinguish DESIGN SPEC, CODE, EMULATION, BROWSER VERIFIED, DEVICE VERIFIED, PROVIDER READY, LIVE and PRODUCTION. Never call provider-ready Live, browser emulation real-device verified, or code existence Production.

ANTI-PATTERNS
No whole-page glass, animation everywhere, every button 3D, excessive accent colors/gradients, meaningless Bento, chatbot-dominated product, desktop simply shrunk to mobile, mobile simply enlarged to desktop, missing loading/empty/error recovery, beautiful homepage with weak inner pages, or unconfirmed high-risk execution.

HOMEPAGE ≠ PRODUCT QUALITY
Authentication, dashboard, detail, search, settings, profile, billing, error, empty, loading, admin and mobile experiences must share the same design-quality floor. The goal is intelligent simplicity: more capability underneath, less visible complexity on the surface, with final control always belonging to the user.
`;
