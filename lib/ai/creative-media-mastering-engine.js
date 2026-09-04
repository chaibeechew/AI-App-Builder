import { getCreativeDeliveryPreset } from './creative-media-delivery-presets.js';

const freeze=value=>Object.freeze(value);
const OPAQUE_ID=/^[A-Za-z0-9._:-]{1,180}$/;
const VIDEO_CONTAINERS=['mp4','mov','webm'];
const VIDEO_CODECS=['h264','hevc','av1','prores','vp9'];
const AUDIO_CODECS=['aac','opus','pcm','flac'];
const IMAGE_FORMATS=['png','jpeg','webp','avif'];
const AUDIO_FORMATS=['wav','m4a','opus','flac'];
const COLOR_SPACES=['srgb','display-p3','rec709','rec2020'];
const TRANSFERS=['srgb','gamma2.4','pq','hlg'];
const HDR_MODES=['sdr','hdr10','hlg'];
const RESOLUTIONS=['720p','1080p','1440p','2160p'];
const FPS=[24,25,30,48,50,60,120];

function clean(v,max=1000){return String(v||'').replace(/[\u0000-\u001f\u007f]/g,' ').replace(/\s+/g,' ').trim().slice(0,max);}
function id(v){const raw=typeof v==='string'?v:v?.assetId;const out=clean(raw,180);return OPAQUE_ID.test(out)?out:null;}
function num(v,min,max,fallback=null){const n=Number(v);return Number.isFinite(n)?Math.max(min,Math.min(max,n)):fallback;}
function one(v,allowed,fallback){const out=clean(v,40).toLowerCase();return allowed.includes(out)?out:fallback;}

export const CREATIVE_MASTERING_POLICY=freeze({maxVideoBitrateMbps:200,maxAudioBitrateKbps:1536,maxImageDimension:8192,maxAudioSampleRate:192000,maxChannels:8,rawSourceUrlsAllowed:false,providerConnected:false,productionVerified:false});

function buildVideo({sourceAssetId,preset,output={}}){
  const container=one(output.container,VIDEO_CONTAINERS,preset?.container||'mp4');
  const videoCodec=one(output.videoCodec,VIDEO_CODECS,preset?.videoCodec||'h264');
  const audioCodec=one(output.audioCodec,AUDIO_CODECS,preset?.audioCodec||'aac');
  const hdrMode=one(output.hdrMode,HDR_MODES,'sdr');
  const colorSpace=one(output.colorSpace,COLOR_SPACES,hdrMode==='sdr'?'rec709':'rec2020');
  const transfer=one(output.transfer,TRANSFERS,hdrMode==='hdr10'?'pq':hdrMode==='hlg'?'hlg':'gamma2.4');
  const bitDepth=Math.round(num(output.bitDepth,8,12,hdrMode==='sdr'?8:10));
  if(hdrMode!=='sdr'&&bitDepth<10)return freeze({ok:false,code:'CREATIVE_MASTER_HDR_REQUIRES_10BIT'});
  if(hdrMode==='hdr10'&&!['hevc','av1','prores'].includes(videoCodec))return freeze({ok:false,code:'CREATIVE_MASTER_HDR_CODEC_UNSUPPORTED'});
  const alpha=output.alpha===true;
  if(alpha&&!((container==='mov'&&videoCodec==='prores')||(container==='webm'&&['vp9','av1'].includes(videoCodec))))return freeze({ok:false,code:'CREATIVE_MASTER_ALPHA_COMBINATION_UNSUPPORTED'});
  const resolution=one(output.resolution,RESOLUTIONS,preset?.resolution||'1080p');
  const fps=FPS.includes(Number(output.fps))?Number(output.fps):(preset?.fps||30);
  return freeze({ok:true,sourceAssetId,modality:'video',output:freeze({container,videoCodec,audioCodec,resolution,fps,bitDepth,hdrMode,colorSpace,transfer,alpha,videoBitrateMbps:num(output.videoBitrateMbps,1,200,resolution==='2160p'?35:12),audioBitrateKbps:num(output.audioBitrateKbps,64,1536,256),audioSampleRate:Math.round(num(output.audioSampleRate,8000,192000,48000)),channels:Math.round(num(output.channels,1,8,2)),fastStart:output.fastStart!==false}),quality:freeze({preserveFrameCadence:true,preserveAudioSync:true,avoidUnnecessaryReencode:true})});
}
function buildImage({sourceAssetId,preset,output={}}){
  const format=one(output.format,IMAGE_FORMATS,preset?.format||'webp');const alpha=output.alpha===true;
  if(alpha&&!['png','webp','avif'].includes(format))return freeze({ok:false,code:'CREATIVE_MASTER_IMAGE_ALPHA_UNSUPPORTED'});
  return freeze({ok:true,sourceAssetId,modality:'image',output:freeze({format,width:Math.round(num(output.width,64,8192,preset?.maxWidth||2048)),height:Math.round(num(output.height,64,8192,preset?.maxHeight||2048)),quality:Math.round(num(output.quality,1,100,90)),alpha,colorSpace:one(output.colorSpace,COLOR_SPACES,'srgb'),embedColorProfile:output.embedColorProfile!==false,stripPrivateMetadata:output.stripPrivateMetadata!==false})});
}
function buildAudio({sourceAssetId,output={}}){
  return freeze({ok:true,sourceAssetId,modality:'audio',output:freeze({format:one(output.format,AUDIO_FORMATS,'m4a'),codec:one(output.codec,AUDIO_CODECS,'aac'),sampleRate:Math.round(num(output.sampleRate,8000,192000,48000)),channels:Math.round(num(output.channels,1,8,2)),bitrateKbps:num(output.bitrateKbps,64,1536,256),targetLufs:num(output.targetLufs,-24,-8,-14),truePeakDbfs:num(output.truePeakDbfs,-6,-0.1,-1),normalizeLoudness:output.normalizeLoudness!==false})});
}

export function buildCreativeMediaMasteringPlan({sourceAsset,modality='video',presetId='',output={}}={}){
  const sourceAssetId=id(sourceAsset);if(!sourceAssetId)return freeze({ok:false,code:'CREATIVE_MASTER_SOURCE_REQUIRED'});
  const kind=clean(modality,20).toLowerCase();if(!['image','video','audio'].includes(kind))return freeze({ok:false,code:'CREATIVE_MASTER_MODALITY_UNSUPPORTED'});
  const preset=presetId?getCreativeDeliveryPreset(presetId):null;if(presetId&&!preset)return freeze({ok:false,code:'CREATIVE_MASTER_PRESET_UNSUPPORTED'});
  if(preset&&preset.modality!==kind)return freeze({ok:false,code:'CREATIVE_MASTER_PRESET_MODALITY_MISMATCH'});
  const plan=kind==='video'?buildVideo({sourceAssetId,preset,output}):kind==='image'?buildImage({sourceAssetId,preset,output}):buildAudio({sourceAssetId,output});
  if(!plan.ok)return plan;
  return freeze({...plan,schemaVersion:1,presetId:preset?.id||null,durableCaptureRequired:true,sourceOwnershipValidationRequired:true,provenancePreservationRequired:true,contentHashRequired:true,truth:freeze({codeReady:true,externalRequirementVerified:false,productionVerified:false,realOutputQualityVerified:false,evidenceRequired:true})});
}
