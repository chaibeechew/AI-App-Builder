// Provider-neutral media plan used by SoolenAI.
// Heavy generation/rendering is server-first; customer devices handle lightweight preview/edit work.
// Capabilities are product foundations, not claims that a paid external model/provider is connected.
export const SOOLEN_MEDIA_CAPABILITIES = {
  uploadRecognition: { enabled:true, mode:"adaptive", outputs:["ui-structure","colors","text","layout","industry-signals","design-style"] },
  artGeneration: {
    enabled:true,
    label:"AI Art Generator",
    mode:"server-first-with-local-fallback",
    outputs:["concept-art","illustration","character-concept","environment","game-art","poster","store-artwork"]
  },
  imageGeneration: { enabled:true, label:"AI Image Generator", mode:"server-first", outputs:["icon","hero","illustration","background","product-visual","game-asset"] },
  photoVideoGeneration: {
    enabled:true,
    label:"AI Photo & Video Generator",
    mode:"provider-neutral",
    outputs:["photo-concept","image-sequence","promo-visual","short-video","store-media"],
    rule:"Never claim photorealistic/model output when only the local visual fallback was used."
  },
  avatarCreation: {
    enabled:true,
    label:"AI Avatar Creator",
    mode:"image-runtime-foundation",
    outputs:["profile-avatar","game-character","npc-concept","presenter","mascot"],
    safeguards:["originality","likeness-consent","privacy","age-appropriate-output"]
  },
  videoCreation: {
    enabled:true,
    label:"AI Video Generator",
    modes:["realistic","cartoon","mixed"],
    devicePolicies:{
      mobile:{defaultClipSeconds:8,maxClipSeconds:12,maxProjectSeconds:60,deviceComputeTarget:15,serverComputeTarget:85},
      desktop:{defaultClipSeconds:12,maxClipSeconds:20,maxProjectSeconds:120,deviceComputeTarget:35,serverComputeTarget:65},
      high_performance_desktop:{defaultClipSeconds:15,maxClipSeconds:20,maxProjectSeconds:120,deviceComputeTarget:45,serverComputeTarget:55}
    },
    heavyTasks:["ai-video-generation","upscale","denoise","complex-effects","final-encode","final-compile"],
    localTasks:["timeline-preview","thumbnailing","trim-preview","subtitle-layout","volume-preview"],
    customerVisibleComputeSplit:false
  },
  videoEditor: {
    enabled:true,
    mode:"server-rendered-edl",
    outputs:["timeline","version","mp4"],
    features:["reorder","trim","split","delete","transition","subtitle","music","voice-over","volume","logo","aspect-ratio","auto-connect","version-history"]
  },
  appDemoVideo: { enabled:true, mode:"adaptive", defaultDurationSeconds:30, maxDurationSeconds:60, outputs:["storyboard","screen-capture-demo","webm"] }
};

export const SOOLEN_MEDIA_MARKETING_CAPABILITIES=Object.freeze([
  {id:"ai-art",label:"AI Art Generator",description:"Create original concepts, illustrations, characters, environments and game artwork."},
  {id:"ai-video",label:"AI Video Generator",description:"Create and edit realistic, cartoon or mixed short-form video projects through provider-neutral rendering."},
  {id:"ai-photo-video",label:"AI Photo & Video Generator",description:"Plan and generate mixed photo/video media while preserving truthful model-vs-local output status."},
  {id:"ai-avatar",label:"AI Avatar Creator",description:"Create original avatar, presenter, mascot, player-character and NPC concepts with consent/privacy safeguards."}
]);

export function buildMediaInstruction({ hasReferenceImages = false, createDemoVideo = false } = {}) {
  return [
    "SoolenAI has reusable foundations for AI Art, AI Image, AI Photo & Video, AI Video and AI Avatar creation. Use them when they materially help the customer's product, especially for mobile-game characters, environments, icons, store media and trailers. Keep provider availability and cost-policy status truthful.",
    hasReferenceImages ? "Use uploaded screenshots as design references. Infer structure and propose modifications; never copy protected branding/assets verbatim." : "",
    createDemoVideo ? "After the app specification is complete, create a concise demo-video storyboard showing the strongest user flow. Keep heavy video generation and final rendering server-side; customer devices should only handle lightweight previews and edit decisions." : ""
  ].filter(Boolean).join(" ");
}
