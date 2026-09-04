const MODALITIES = new Set(['image','video','audio','campaign']);
const MAX_PROMPT = 8000;
const MAX_NEGATIVE = 3000;
const MAX_REFS = 16;

function cleanText(value, max){
  return String(value ?? '').replace(/\s+/g,' ').trim().slice(0,max);
}

function validOpaqueId(value){
  const id=String(value ?? '').trim();
  if(!id || /^https?:\/\//i.test(id) || /^data:/i.test(id)) return false;
  return /^[A-Za-z0-9][A-Za-z0-9._:-]{2,127}$/.test(id);
}

function normalizeReferences(value){
  const source=Array.isArray(value)?value:[];
  if(source.length>MAX_REFS) return {ok:false,code:'CREATIVE_PROMPT_TOO_MANY_REFERENCES',references:[]};
  const references=[];
  for(const item of source){
    const ref=typeof item==='string'?{assetId:item}:item;
    if(!ref || typeof ref!=='object' || !validOpaqueId(ref.assetId)){
      return {ok:false,code:'CREATIVE_PROMPT_REFERENCE_MUST_BE_OPAQUE_ASSET_ID',references:[]};
    }
    const weight=Number(ref.weight ?? 1);
    references.push({
      assetId:String(ref.assetId).trim(),
      role:cleanText(ref.role || 'reference',80),
      weight:Number.isFinite(weight)?Math.min(2,Math.max(0,weight)):1,
    });
  }
  return {ok:true,references};
}

export function compileCreativeMediaPrompt(input={}){
  const modality=cleanText(input.modality || 'image',20).toLowerCase();
  if(!MODALITIES.has(modality)) return {ok:false,code:'CREATIVE_PROMPT_MODALITY_UNSUPPORTED'};
  const prompt=cleanText(input.prompt,MAX_PROMPT);
  if(!prompt) return {ok:false,code:'CREATIVE_PROMPT_REQUIRED'};
  const references=normalizeReferences(input.references);
  if(!references.ok) return references;

  const negativePrompt=cleanText(input.negativePrompt,MAX_NEGATIVE);
  const sections=[
    ['goal',cleanText(input.goal,800)],
    ['audience',cleanText(input.audience,500)],
    ['subject',cleanText(input.subject,1200)],
    ['style',cleanText(input.style,1000)],
    ['composition',cleanText(input.composition,1000)],
    ['lighting',cleanText(input.lighting,800)],
    ['camera',cleanText(input.camera,800)],
    ['motion',cleanText(input.motion,800)],
    ['audio',cleanText(input.audio,800)],
    ['locale',cleanText(input.locale,80)],
    ['constraints',cleanText(input.constraints,1500)],
  ].filter(([,value])=>Boolean(value));

  const compiledPrompt=[prompt,...sections.map(([key,value])=>`${key}: ${value}`)].join('\n');
  return {
    ok:true,
    schemaVersion:'creative-media-prompt.v1',
    modality,
    prompt,
    negativePrompt,
    compiledPrompt,
    references:references.references,
    referenceAssetIds:references.references.map(item=>item.assetId),
    controls:{
      aspectRatio:cleanText(input.aspectRatio,20)||null,
      resolution:cleanText(input.resolution,30)||null,
      durationSeconds:Number.isFinite(Number(input.durationSeconds))?Math.max(0,Number(input.durationSeconds)):null,
      seed:Number.isInteger(Number(input.seed))?Number(input.seed):null,
    },
    providerNeutral:true,
    containsProviderClaim:false,
    truth:'CODE_READY',
  };
}

export function isCreativeMediaOpaqueAssetId(value){return validOpaqueId(value);}
