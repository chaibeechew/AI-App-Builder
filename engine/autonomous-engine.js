import { generateWithFallback } from "./ai-provider.js";
import { createClient } from "../lib/supabase/server.js";
import { buildSoolenGenerationContext } from "../lib/ai/language-terminology.js";
import { buildMediaInstruction } from "../lib/ai/media-capabilities.js";
import { GENERATION_QUALITY_RULES } from "../lib/buildStandards.js";

function extractJson(text) {
  if (!text) throw new Error("AI provider returned an empty response");
  const cleaned = String(text).replace(/```json/gi, "").replace(/```/g, "").trim();
  const firstBrace = cleaned.indexOf("{"); const lastBrace = cleaned.lastIndexOf("}");
  if (firstBrace === -1 || lastBrace === -1) throw new Error("AI provider did not return valid JSON");
  try { return JSON.parse(cleaned.slice(firstBrace, lastBrace + 1)); } catch { throw new Error("AI provider returned invalid JSON"); }
}
function tokens(idea) { return [...new Set(idea.toLowerCase().replace(/[^a-z0-9\u4e00-\u9fff]+/g," ").split(/\s+/).filter(x=>x.length>=3).slice(0,12))]; }
async function loadIndustryPatterns(idea) {
  try {
    const supabase=await createClient(); const words=tokens(idea);
    let query=supabase.from("industry_patterns").select("name,category,description,app_types,pages,features,workflows,data_model,ui_pattern,design_pattern,special_requirements,keywords").eq("is_active",true).limit(12);
    if(words.length) query=query.or(words.flatMap(w=>[`name.ilike.%${w}%`,`category.ilike.%${w}%`,`description.ilike.%${w}%`]).join(","));
    const {data}=await query; if(data?.length) return data;
    const fallback=await supabase.from("industry_patterns").select("name,category,description,app_types,pages,features,workflows,data_model,ui_pattern,design_pattern,special_requirements,keywords").eq("is_active",true).limit(8);
    return fallback.data||[];
  } catch(error) { console.warn("Soolen AI pattern lookup unavailable:",error?.message); return []; }
}
function buildPrompt(userIdea,patterns,{voiceTranscript="",referenceImages=[],language="en",industry="technology",terminology=[],createDemoVideo=false}={}) {
  const languageContext=buildSoolenGenerationContext({language,industry,terminology});
  const patternContext=patterns.length?JSON.stringify(patterns):"No matching industry pattern was found; design a new pattern autonomously.";
  const mediaContext=buildMediaInstruction({hasReferenceImages:referenceImages.length>0,createDemoVideo});
  return `You are Soolen AI, the autonomous intelligence inside AI App Builder.\n\nUSER IDEA:\n"${userIdea}"\n\nVOICE INPUT:\n"${voiceTranscript||"None"}"\n\nREFERENCE IMAGE REFERENCES:\n${referenceImages.length?referenceImages.join("\n"):"None"}\n\nLANGUAGE CONTEXT:\n${JSON.stringify(languageContext)}\n\nINDUSTRY PATTERNS:\n${patternContext}\n\nMEDIA INSTRUCTION:\n${mediaContext||"No media task requested."}\n\nGLOBAL PRODUCT QUALITY STANDARD:\n${GENERATION_QUALITY_RULES}\n\nBuild a real mobile-first app, not a text-only wireframe. Use industry patterns as guidance, innovate where necessary, and never copy proprietary branding/assets. Generate a specific visual identity with colors, typography direction, spacing, radii, icon style, imagery direction, premium background treatment and component treatments. The composition should feel tailored to this specific product, not like the same template with different text. Preserve professional industry terminology where appropriate. The requested app language must be the initial UI language, and the architecture must support switching language without regenerating the app.\n\nQUALITY PLAN REQUIREMENT:\nFor each of stability, security, privacy, comfort, beauty and naturalness, include at least 3 concrete implementation decisions in qualityPlan. These must describe what the generated product actually contains or will render, not vague claims such as 'secure' or 'high quality'. Include loading/error/empty handling, auth/permission/validation where relevant, privacy controls, mobile/responsive/accessibility decisions, premium original visual direction, and human-readable real-world workflows.\n\nReturn ONLY valid JSON with this structure:\n{"name":"App name","description":"Short description","industry":{"name":"Industry/use case","category":"Category","confidence":0.0},"language":{"default":"${languageContext.language.code}","name":"${languageContext.language.name}","switchable":true},"designSystem":{"mood":"","primaryColor":"","secondaryColor":"","accentColor":"","backgroundColor":"","surfaceColor":"","textColor":"","fontDirection":"","radius":"","iconStyle":"","visualDirection":"","backgroundDirection":"","heroDirection":"","layoutSignature":""},"visualAssets":[{"type":"app_icon|illustration|hero|background|icon_set","description":"Original visual asset direction"}],"templateStrategy":{"matchedPatterns":["pattern"],"innovation":"How Soolen AI adapts or creates the pattern"},"qualityPlan":{"stability":["implementation decision","implementation decision","implementation decision"],"security":["implementation decision","implementation decision","implementation decision"],"privacy":["implementation decision","implementation decision","implementation decision"],"comfort":["implementation decision","implementation decision","implementation decision"],"beauty":["implementation decision","implementation decision","implementation decision"],"naturalness":["implementation decision","implementation decision","implementation decision"]},"pages":[{"id":"home","name":"Home","route":"/","description":"","purpose":"","components":["header","main content"],"layout":"","visualTreatment":"","backgroundTreatment":""}],"features":[{"name":"Feature name","description":"","uiPattern":""}],"data":{"EntityName":{"fields":["field1","field2"]}},"actions":[{"name":"Action name","description":""}],"navigation":[{"label":"Home","route":"/"}],"demoVideo":{"enabled":${createDemoVideo},"durationSeconds":30,"storyboard":[]}}`;
}
export async function runAutonomousEngine(userIdea,options={}) {
  if(!userIdea||!userIdea.trim()) throw new Error("Please describe the app you want to build.");
  const idea=userIdea.trim(); const voiceTranscript=typeof options.voiceTranscript==="string"?options.voiceTranscript.trim():"";
  const referenceImages=Array.isArray(options.referenceImages)?options.referenceImages.filter(Boolean).slice(0,10):[];
  const language=typeof options.language==="string"?options.language:"en";
  const industry=typeof options.industry==="string"?options.industry:"technology";
  const terminology=Array.isArray(options.terminology)?options.terminology:[];
  const createDemoVideo=Boolean(options.createDemoVideo);
  const combinedIdea=[idea,voiceTranscript].filter(Boolean).join("\n\n");
  const patterns=await loadIndustryPatterns(combinedIdea);
  const {provider,result}=await generateWithFallback(buildPrompt(combinedIdea,patterns,{voiceTranscript,referenceImages,language,industry,terminology,createDemoVideo}));
  const specification=extractJson(result); const model=process.env[`${provider.toUpperCase()}_MODEL`]||undefined;
  return {status:"preview_ready",idea:combinedIdea,specification,aiProvider:provider,...(model?{aiModel:model}:{}),intelligence:{engine:"Soolen AI",industryPatternsMatched:patterns.length,patternLibrary:"industry_patterns",voiceInput:Boolean(voiceTranscript),referenceImages:referenceImages.length,language:buildSoolenGenerationContext({language,industry,terminology}).language.name,terminologyCount:buildSoolenGenerationContext({language,industry,terminology}).terminology.length,media:"local-first",demoVideo:createDemoVideo},nextStep:"preview",test:{status:"pending"},security:{status:"pending"},publish:{allowed:false,requiresHumanApproval:true}};
}
