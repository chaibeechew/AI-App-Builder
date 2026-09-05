const freeze=value=>Object.freeze(value);

const PRESETS={
  'web.hero-video':{modality:'video',aspectRatio:'16:9',resolution:'1080p',fps:30,maxDurationSeconds:30,maxFileBytes:25000000,container:'mp4',videoCodec:'h264',audioCodec:'aac',safeAreaPercent:5},
  'web.hero-image':{modality:'image',aspectRatio:'16:9',maxWidth:2560,maxHeight:1440,maxFileBytes:5000000,format:'webp',safeAreaPercent:4},
  'app-store.preview':{modality:'video',aspectRatio:'9:16',resolution:'1080p',fps:30,maxDurationSeconds:30,maxFileBytes:100000000,container:'mp4',videoCodec:'h264',audioCodec:'aac',safeAreaPercent:6},
  'app-store.screenshot':{modality:'image',aspectRatio:'9:16',maxWidth:2048,maxHeight:2732,maxFileBytes:10000000,format:'png',safeAreaPercent:5},
  'google-play.preview':{modality:'video',aspectRatio:'16:9',resolution:'1080p',fps:30,maxDurationSeconds:30,maxFileBytes:100000000,container:'mp4',videoCodec:'h264',audioCodec:'aac',safeAreaPercent:6},
  'google-play.screenshot':{modality:'image',aspectRatio:'9:16',maxWidth:2160,maxHeight:3840,maxFileBytes:10000000,format:'png',safeAreaPercent:5},
  'social.vertical':{modality:'video',aspectRatio:'9:16',resolution:'1080p',fps:30,maxDurationSeconds:60,maxFileBytes:100000000,container:'mp4',videoCodec:'h264',audioCodec:'aac',safeAreaPercent:10},
  'social.square':{modality:'video',aspectRatio:'1:1',resolution:'1080p',fps:30,maxDurationSeconds:60,maxFileBytes:100000000,container:'mp4',videoCodec:'h264',audioCodec:'aac',safeAreaPercent:8},
  'social.landscape':{modality:'video',aspectRatio:'16:9',resolution:'1080p',fps:30,maxDurationSeconds:60,maxFileBytes:100000000,container:'mp4',videoCodec:'h264',audioCodec:'aac',safeAreaPercent:7},
  'ad.vertical':{modality:'video',aspectRatio:'9:16',resolution:'1080p',fps:30,maxDurationSeconds:30,maxFileBytes:80000000,container:'mp4',videoCodec:'h264',audioCodec:'aac',safeAreaPercent:10},
  'game.cinematic':{modality:'video',aspectRatio:'16:9',resolution:'2160p',fps:60,maxDurationSeconds:120,maxFileBytes:1000000000,container:'mp4',videoCodec:'hevc',audioCodec:'aac',safeAreaPercent:5},
  'presentation.media':{modality:'video',aspectRatio:'16:9',resolution:'1080p',fps:30,maxDurationSeconds:120,maxFileBytes:250000000,container:'mp4',videoCodec:'h264',audioCodec:'aac',safeAreaPercent:5},
};

export const CREATIVE_DELIVERY_PRESETS=freeze(Object.fromEntries(Object.entries(PRESETS).map(([key,value])=>[key,freeze({...value,id:key,externalRequirementVerified:false})])));

export function listCreativeDeliveryPresets({modality}={}){
  const wanted=String(modality||'').trim().toLowerCase();
  return Object.values(CREATIVE_DELIVERY_PRESETS).filter(row=>!wanted||row.modality===wanted);
}

export function getCreativeDeliveryPreset(id){
  return CREATIVE_DELIVERY_PRESETS[String(id||'').trim().toLowerCase()]||null;
}

export function resolveCreativeDeliveryPreset({id,overrides={}}={}){
  const base=getCreativeDeliveryPreset(id);if(!base)return freeze({ok:false,code:'CREATIVE_DELIVERY_PRESET_UNSUPPORTED'});
  const allowed=['aspectRatio','resolution','fps','maxDurationSeconds','maxFileBytes','safeAreaPercent'];
  const merged={...base};
  for(const key of allowed){if(overrides?.[key]!==undefined&&overrides?.[key]!==null)merged[key]=overrides[key];}
  return freeze({ok:true,preset:freeze(merged),truth:freeze({codeReady:true,externalRequirementVerified:false,platformCertification:false,evidenceRequired:true}),rule:'Delivery presets are LANERIQ internal mastering baselines. Current platform requirements must be independently re-verified before certification or store submission claims.'});
}
