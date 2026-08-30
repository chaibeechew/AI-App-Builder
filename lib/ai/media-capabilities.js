// Provider-neutral media plan used by SoolenAI.
// Heavy generation/rendering is server-first; customer devices handle lightweight preview/edit work.
export const SOOLEN_MEDIA_CAPABILITIES = {
  uploadRecognition: { enabled:true, mode:"adaptive", outputs:["ui-structure","colors","text","layout","industry-signals","design-style"] },
  imageGeneration: { enabled:true, mode:"server-first", outputs:["icon","hero","illustration","background","product-visual"] },
  videoCreation: {
    enabled:true,
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

export function buildMediaInstruction({ hasReferenceImages = false, createDemoVideo = false } = {}) {
  return [
    hasReferenceImages ? "Use uploaded screenshots as design references. Infer structure and propose modifications; never copy protected branding/assets verbatim." : "",
    createDemoVideo ? "After the app specification is complete, create a concise demo-video storyboard showing the strongest user flow. Keep heavy video generation and final rendering server-side; customer devices should only handle lightweight previews and edit decisions." : ""
  ].filter(Boolean).join(" ");
}
