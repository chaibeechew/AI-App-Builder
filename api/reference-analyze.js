const MAX_PARTS = 12;
const MAX_BASE64_CHARS = 18_000_000;
const TIMEOUT_MS = 45000;

function configured(value){return typeof value==="string"&&value.trim().length>0;}
async function fetchTimeout(url,options){const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),TIMEOUT_MS);try{return await fetch(url,{...options,signal:controller.signal});}finally{clearTimeout(timer);}}
function safeReference(item){
  if(!item||typeof item!=="object")return null;
  const mimeType=String(item.mimeType||"").trim().toLowerCase();
  const data=String(item.data||"").replace(/^data:[^;]+;base64,/,"").trim();
  const kind=String(item.kind||"reference").slice(0,40);
  const name=String(item.name||"reference").slice(0,160);
  const sourceName=String(item.sourceName||item.name||"reference").slice(0,180);
  if(!mimeType.startsWith("image/")||!data||data.length>MAX_BASE64_CHARS)return null;
  return {mimeType,data,kind,name,sourceName};
}
function extractJson(raw){const text=String(raw||"").replace(/```json|```/gi,"").trim();const start=text.indexOf("{");const end=text.lastIndexOf("}");if(start<0||end<=start)throw new Error("Invalid visual intelligence JSON.");return JSON.parse(text.slice(start,end+1));}
function normalizeAsset(item){
  const allowed=["logo","person","property","product","food","hero","screenshot","video","content"];
  const role=allowed.includes(item?.role)?item.role:"content";
  return {sourceName:String(item?.sourceName||"").slice(0,180),role,label:String(item?.label||role).slice(0,120),subject:String(item?.subject||"").slice(0,240),description:String(item?.description||"").slice(0,600),tags:Array.isArray(item?.tags)?item.tags.map(v=>String(v).slice(0,60)).slice(0,12):[],suggestedSections:Array.isArray(item?.suggestedSections)?item.suggestedSections.map(v=>String(v).slice(0,80)).slice(0,8):[],confidence:Math.max(0,Math.min(1,Number(item?.confidence)||0))};
}

export default async function handler(req,res){
  if(req.method!=="POST")return res.status(405).json({error:"Method not allowed."});
  const key=String(process.env.GEMINI_API_KEY||"").trim();
  if(!configured(key))return res.status(503).json({error:"Visual AI is not configured yet."});
  const references=(Array.isArray(req.body?.references)?req.body.references:[]).map(safeReference).filter(Boolean).slice(0,MAX_PARTS);
  if(!references.length)return res.status(400).json({error:"Please upload at least one supported photo, screenshot, sketch or video frame."});
  const model=String(process.env.GEMINI_VISION_MODEL||process.env.GEMINI_MODEL||"gemini-2.5-flash").trim();
  const prompt=`You are SoolenAI's visual media intelligence engine. Analyze customer-owned references for an ORIGINAL App + Website. Return ONLY valid JSON, no markdown, in this shape:\n{"brief":"concise design/requirements brief under 500 words","assets":[{"sourceName":"exact source file name","role":"logo|person|property|product|food|hero|screenshot|video|content","label":"short label","subject":"what is visibly shown","description":"placement-relevant description","tags":["..."],"suggestedSections":["Home","About"],"confidence":0.0}]}\n\nGroup multiple sampled video frames under their shared sourceName. Use only visible evidence. Do not identify real people. Do not copy third-party brands, text, source code or distinctive layouts; extract generic patterns and requirements only. Prefer role=hero only when the visual is genuinely suitable as a prominent cover. Every unique sourceName must appear once in assets.`;
  const parts=[{text:prompt}];
  for(const reference of references){parts.push({text:`Reference sourceName: ${reference.sourceName}; sample: ${reference.name} (${reference.kind})`});parts.push({inlineData:{mimeType:reference.mimeType,data:reference.data}});}
  try{
    const url=`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(key)}`;
    const response=await fetchTimeout(url,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({contents:[{role:"user",parts}],generationConfig:{temperature:0.15,maxOutputTokens:1800,responseMimeType:"application/json"}})});
    const raw=await response.text();
    if(!response.ok){console.error("Reference analysis provider error:",response.status,raw.slice(0,1200));return res.status(response.status===429?429:502).json({error:"Visual AI could not analyze these references right now."});}
    let data;try{data=JSON.parse(raw);}catch{return res.status(502).json({error:"Visual AI returned an invalid response."});}
    const providerText=data?.candidates?.[0]?.content?.parts?.map(part=>part?.text||"").join("\n").trim();
    if(!providerText)return res.status(502).json({error:"Visual AI returned an empty analysis."});
    let parsed;try{parsed=extractJson(providerText);}catch(error){console.error("Reference intelligence parse error:",error);return res.status(502).json({error:"Visual AI returned invalid structured analysis."});}
    const assets=(Array.isArray(parsed?.assets)?parsed.assets:[]).map(normalizeAsset).filter(item=>item.sourceName);
    const brief=String(parsed?.brief||"").trim().slice(0,7000);
    if(!brief)return res.status(502).json({error:"Visual AI returned an empty design brief."});
    return res.status(200).json({analysis:brief,assets,provider:"Gemini Vision",referencesAnalyzed:references.length,originalityRule:"reference-not-copy"});
  }catch(error){console.error("Reference analysis error:",error);return res.status(500).json({error:"Unable to analyze references right now."});}
}
