import { CREATIVE_MEDIA_TASKS, CREATIVE_MEDIA_CONTROL_SURFACES, summarizeCreativeMediaReadiness } from './creative-media-control-plane.js';

// Provider-neutral media plan used by LANERIQ AI. Legacy SOOLEN_* export names are retained for compatibility.
// Heavy generation/rendering is server-first; customer devices handle lightweight preview/edit work.
// Capabilities are product foundations, not claims that a paid external model/provider is connected.
const IMAGE_ADVANCED_TASKS=Object.freeze(Object.keys(CREATIVE_MEDIA_TASKS).filter(id=>id.startsWith('image.')));
const VIDEO_ADVANCED_TASKS=Object.freeze(Object.keys(CREATIVE_MEDIA_TASKS).filter(id=>id.startsWith('video.')));

export const SOOLEN_MEDIA_CAPABILITIES = {
  creativeControlPlane: {
    enabled:true,
    label:'LANERIQ Creative Intelligence Control Plane',
    mode:'provider-neutral-evidence-gated',
    taskCount:Object.keys(CREATIVE_MEDIA_TASKS).length,
    imageTasks:IMAGE_ADVANCED_TASKS,
    videoTasks:VIDEO_ADVANCED_TASKS,
    controlSurfaces:CREATIVE_MEDIA_CONTROL_SURFACES,
    truthRule:'CODE READY, PROVIDER READY and PRODUCTION LIVE VERIFIED are separate evidence states.'
  },
  uploadRecognition: { enabled:true, mode:'adaptive', outputs:['ui-structure','colors','text','layout','industry-signals','design-style'] },
  artGeneration: {
    enabled:true,
    label:'AI Art Generator',
    mode:'server-first-with-local-fallback',
    outputs:['concept-art','illustration','character-concept','environment','game-art','poster','store-artwork']
  },
  imageGeneration: {
    enabled:true,
    label:'AI Image Generator',
    mode:'server-first',
    outputs:['icon','hero','illustration','background','product-visual','game-asset'],
    advancedTasks:IMAGE_ADVANCED_TASKS,
    controls:CREATIVE_MEDIA_CONTROL_SURFACES.image,
    identityControls:CREATIVE_MEDIA_CONTROL_SURFACES.identity,
    rule:'Advanced task definitions are CODE foundations. Provider-specific output remains evidence-gated until Production proof exists.'
  },
  photoVideoGeneration: {
    enabled:true,
    label:'AI Photo & Video Generator',
    mode:'provider-neutral',
    outputs:['photo-concept','image-sequence','promo-visual','short-video','store-media'],
    rule:'Never claim photorealistic/model output when only the local visual fallback was used.'
  },
  avatarCreation: {
    enabled:true,
    label:'AI Avatar Creator',
    mode:'image-runtime-foundation',
    outputs:['profile-avatar','game-character','npc-concept','presenter','mascot'],
    safeguards:['originality','likeness-consent','privacy','age-appropriate-output']
  },
  videoCreation: {
    enabled:true,
    label:'AI Video Generator',
    modes:['realistic','cartoon','mixed'],
    advancedTasks:VIDEO_ADVANCED_TASKS,
    cinemaControls:CREATIVE_MEDIA_CONTROL_SURFACES.cinema,
    audioControls:CREATIVE_MEDIA_CONTROL_SURFACES.audio,
    devicePolicies:{
      mobile:{defaultClipSeconds:8,maxClipSeconds:12,maxProjectSeconds:60,deviceComputeTarget:15,serverComputeTarget:85},
      desktop:{defaultClipSeconds:12,maxClipSeconds:20,maxProjectSeconds:120,deviceComputeTarget:35,serverComputeTarget:65},
      high_performance_desktop:{defaultClipSeconds:15,maxClipSeconds:20,maxProjectSeconds:120,deviceComputeTarget:45,serverComputeTarget:55}
    },
    heavyTasks:['ai-video-generation','upscale','denoise','complex-effects','final-encode','final-compile'],
    localTasks:['timeline-preview','thumbnailing','trim-preview','subtitle-layout','volume-preview'],
    customerVisibleComputeSplit:false,
    rule:'Video generation modes remain NOT LIVE unless the exact capability has verified Production provider evidence.'
  },
  videoEditor: {
    enabled:true,
    mode:'server-rendered-edl',
    outputs:['timeline','version','mp4'],
    features:['reorder','trim','split','delete','transition','subtitle','music','voice-over','volume','logo','aspect-ratio','auto-connect','version-history']
  },
  appDemoVideo: { enabled:true, mode:'adaptive', defaultDurationSeconds:30, maxDurationSeconds:60, outputs:['storyboard','screen-capture-demo','webm'] }
};

export const SOOLEN_MEDIA_MARKETING_CAPABILITIES=Object.freeze([
  {id:'ai-art',label:'AI Art Generator',description:'Create original concepts, illustrations, characters, environments and game artwork.'},
  {id:'ai-video',label:'AI Video Generator',description:'Create and edit realistic, cartoon or mixed short-form video projects through provider-neutral rendering.'},
  {id:'ai-photo-video',label:'AI Photo & Video Generator',description:'Plan and generate mixed photo/video media while preserving truthful model-vs-local output status.'},
  {id:'ai-avatar',label:'AI Avatar Creator',description:'Create original avatar, presenter, mascot, player-character and NPC concepts with consent/privacy safeguards.'}
]);

export function getCreativeMediaReadiness(options={}) {
  return summarizeCreativeMediaReadiness(options);
}

export function buildMediaInstruction({ hasReferenceImages = false, createDemoVideo = false } = {}) {
  return [
    'LANERIQ AI has reusable foundations for AI Art, AI Image, AI Photo & Video, AI Video and AI Avatar creation. Use the Creative Intelligence Control Plane to select a task and keep CODE, provider-ready and Production LIVE evidence separate.',
    hasReferenceImages ? 'Use uploaded screenshots as design references. Infer structure and propose modifications; never copy protected branding/assets verbatim.' : '',
    createDemoVideo ? 'After the app specification is complete, create a concise demo-video storyboard showing the strongest user flow. Keep heavy video generation and final rendering server-side; customer devices should only handle lightweight previews and edit decisions.' : ''
  ].filter(Boolean).join(' ');
}
