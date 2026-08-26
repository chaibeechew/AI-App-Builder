export function normalizeAiInputs({ text = "", transcript = "", imageRefs = [] } = {}) {
  const images = Array.isArray(imageRefs) ? imageRefs.filter((v) => typeof v === "string" && v.trim()).slice(0, 10) : [];
  const voice = typeof transcript === "string" ? transcript.trim() : "";
  const written = typeof text === "string" ? text.trim() : "";
  return {
    text: written,
    voiceTranscript: voice,
    referenceImages: images,
    combinedIdea: [written, voice].filter(Boolean).join("\n\n"),
  };
}

export function buildReferenceInstruction() {
  return "Analyze reference images for layout, information hierarchy, interaction patterns and visual direction. Create an original implementation; do not copy logos, copyrighted artwork, proprietary text, or distinctive branded assets.";
}
