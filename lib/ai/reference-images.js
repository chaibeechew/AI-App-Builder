import { buildReferenceInstruction } from "./input-normalizer.js";

export function prepareReferenceImages(imageRefs = []) {
  if (!Array.isArray(imageRefs)) return [];
  return imageRefs.filter((ref) => typeof ref === "string" && ref.trim()).slice(0, 10).map((ref) => ({ ref, instruction: buildReferenceInstruction() }));
}

export function referenceImagePolicy() {
  return {
    maxImages: 10,
    acceptedTypes: ["image/jpeg", "image/png", "image/webp"],
    privateStorageRequired: true,
    originalImplementationOnly: true,
  };
}
