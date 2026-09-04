const MAX_VARIANTS=64;
function list(value,fallback){const src=Array.isArray(value)?value.filter(v=>v!==undefined&&v!==null):[];return src.length?src:fallback;}
function clean(value,max=500){return String(value ?? '').replace(/\s+/g,' ').trim().slice(0,max);}
function hash(input){let h=2166136261;for(let i=0;i<input.length;i+=1){h^=input.charCodeAt(i);h=Math.imul(h,16777619);}return (h>>>0).toString(16).padStart(8,'0');}

export function buildCreativeVariantMatrix(input={}){
  const basePrompt=clean(input.basePrompt,4000);
  if(!basePrompt) return {ok:false,code:'CREATIVE_VARIANT_PROMPT_REQUIRED'};
  const maxVariants=Math.min(MAX_VARIANTS,Math.max(1,Number(input.maxVariants)||24));
  const seeds=list(input.seeds,[null]).slice(0,8);
  const styles=list(input.styles,[null]).slice(0,8);
  const aspects=list(input.aspectRatios,[null]).slice(0,8);
  const locales=list(input.locales,[null]).slice(0,12);
  const channels=list(input.channels,[null]).slice(0,12);
  const costMode=['zero','free','balanced','paid'].includes(String(input.costMode))?String(input.costMode):'zero';
  const premiumAllowed=costMode==='paid'&&input.premiumAllowed===true;
  const variants=[];
  const seen=new Set();
  outer: for(const seed of seeds)for(const style of styles)for(const aspectRatio of aspects)for(const locale of locales)for(const channel of channels){
    const normalized={seed:seed===null?null:Number(seed),style:clean(style,300)||null,aspectRatio:clean(aspectRatio,20)||null,locale:clean(locale,40)||null,channel:clean(channel,80)||null};
    const signature=JSON.stringify(normalized);
    if(seen.has(signature)) continue;
    seen.add(signature);
    variants.push({
      variantId:`variant-${String(variants.length+1).padStart(3,'0')}-${hash(signature)}`,
      basePrompt,
      ...normalized,
      costMode,
      premiumAllowed,
      qualityGateRequired:true,
      durableAssetRequired:true,
    });
    if(variants.length>=maxVariants) break outer;
  }
  const totalPossible=seeds.length*styles.length*aspects.length*locales.length*channels.length;
  return {
    ok:true,
    schemaVersion:'creative-variant-matrix.v1',
    variantCount:variants.length,
    totalPossible,
    truncated:variants.length<totalPossible,
    variants,
    bounded:true,
    providerNeutral:true,
    truth:'CODE_READY',
  };
}
