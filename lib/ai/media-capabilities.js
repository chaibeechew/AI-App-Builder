// Provider-neutral media plan used by Soolen AI when generating apps.
// Image recognition and demo video should work locally where possible.
export const SOOLEN_MEDIA_CAPABILITIES = {
  uploadRecognition: { enabled:true, mode:"local-first", outputs:["ui-structure","colors","text","layout","industry-signals","design-style"] },
  imageGeneration: { enabled:true, mode:"local-first", outputs:["icon","hero","illustration","background","product-visual"] },
  appDemoVideo: { enabled:true, mode:"browser-local", defaultDurationSeconds:30, maxDurationSeconds:60, outputs:["storyboard","screen-capture-demo","webm"] }
};

export function buildMediaInstruction({ hasReferenceImages = false, createDemoVideo = false } = {}) {
  return [
    hasReferenceImages ? "Use uploaded screenshots as design references. Infer structure and propose modifications; never copy protected branding/assets verbatim." : "",
    createDemoVideo ? "After the app specification is complete, create a concise demo-video storyboard showing the strongest user flow. Video is optional and secondary to app generation." : ""
  ].filter(Boolean).join(" ");
}
