const freeze=value=>Object.freeze(value);

export const CREATIVE_CAMPAIGN_PLATFORM_SPECS=freeze({
  'web-hero':freeze({kind:'image',task:'image.generate',aspectRatio:'16:9',width:1920,height:1080,safeInsetPct:6,delivery:'web'}),
  'app-hero':freeze({kind:'image',task:'image.generate',aspectRatio:'16:9',width:1600,height:900,safeInsetPct:7,delivery:'app'}),
  'social-square':freeze({kind:'image',task:'image.generate',aspectRatio:'1:1',width:1080,height:1080,safeInsetPct:8,delivery:'social'}),
  'social-portrait':freeze({kind:'image',task:'image.generate',aspectRatio:'4:5',width:1080,height:1350,safeInsetPct:8,delivery:'social'}),
  'social-vertical-video':freeze({kind:'video',task:'video.scene-generate',aspectRatio:'9:16',width:1080,height:1920,durationSeconds:15,safeInsetPct:10,delivery:'social'}),
  'social-horizontal-video':freeze({kind:'video',task:'video.scene-generate',aspectRatio:'16:9',width:1920,height:1080,durationSeconds:15,safeInsetPct:7,delivery:'social'}),
  'web-promo-video':freeze({kind:'video',task:'video.scene-generate',aspectRatio:'16:9',width:1920,height:1080,durationSeconds:20,safeInsetPct:7,delivery:'web'}),
  'app-demo-video':freeze({kind:'video',task:'video.scene-generate',aspectRatio:'9:16',width:1080,height:1920,durationSeconds:20,safeInsetPct:10,delivery:'app'}),
  'game-promo-image':freeze({kind:'image',task:'image.generate',aspectRatio:'16:9',width:1920,height:1080,safeInsetPct:6,delivery:'game'}),
  'game-trailer':freeze({kind:'video',task:'video.scene-generate',aspectRatio:'16:9',width:1920,height:1080,durationSeconds:30,safeInsetPct:6,delivery:'game'}),
});

export function getCreativeCampaignPlatformSpec(id){
  return CREATIVE_CAMPAIGN_PLATFORM_SPECS[String(id||'').trim().toLowerCase()]||null;
}

export function listCreativeCampaignPlatformSpecs(){
  return Object.entries(CREATIVE_CAMPAIGN_PLATFORM_SPECS).map(([id,spec])=>({id,...spec}));
}
