export const REFERENCE_LIMITS = Object.freeze({
  maxFiles: 8,
  maxImageBytes: 12 * 1024 * 1024,
  maxVideoBytes: 80 * 1024 * 1024,
  maxTotalSourceBytes: 160 * 1024 * 1024,
  maxAnalysisReferences: 12,
  maxAnalysisItemBase64Chars: 900_000,
  maxAnalysisBase64Chars: 6_000_000,
  maxRequestBytes: 8 * 1024 * 1024,
});

export const REFERENCE_IMAGE_MIME_TYPES = Object.freeze([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/heic",
  "image/heif",
]);

export const REFERENCE_VIDEO_MIME_TYPES = Object.freeze([
  "video/mp4",
  "video/quicktime",
  "video/webm",
]);

export const REFERENCE_ANALYSIS_MIME_TYPES = Object.freeze([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

const IMAGE_SET = new Set(REFERENCE_IMAGE_MIME_TYPES);
const VIDEO_SET = new Set(REFERENCE_VIDEO_MIME_TYPES);
const ANALYSIS_SET = new Set(REFERENCE_ANALYSIS_MIME_TYPES);
const BASE64 = /^[A-Za-z0-9+/]*={0,2}$/;

export function referenceKindFromMime(mimeType) {
  const mime = String(mimeType || "").toLowerCase();
  if (IMAGE_SET.has(mime)) return "image";
  if (VIDEO_SET.has(mime)) return "video";
  return "unsupported";
}

export function validateReferenceFileMeta({ mimeType, size } = {}) {
  const kind = referenceKindFromMime(mimeType);
  const bytes = Number(size || 0);
  if (kind === "unsupported") return { ok:false, error:"Use a supported image or video file." };
  if (!Number.isFinite(bytes) || bytes <= 0) return { ok:false, error:"The selected file is empty or unreadable." };
  const max = kind === "video" ? REFERENCE_LIMITS.maxVideoBytes : REFERENCE_LIMITS.maxImageBytes;
  if (bytes > max) return { ok:false, error:`This ${kind} is too large.` };
  return { ok:true, kind, maxBytes:max };
}

function safeText(value, max) {
  return String(value || "").replace(/[\u0000-\u001f\u007f]/g, " ").trim().slice(0, max);
}

export function sanitizeReferenceAnalysisInput(value) {
  const list = Array.isArray(value) ? value.slice(0, REFERENCE_LIMITS.maxAnalysisReferences) : [];
  let total = 0;
  const references = [];
  for (const item of list) {
    const mimeType = String(item?.mimeType || "").toLowerCase();
    const data = String(item?.data || "").trim();
    const sourceName = safeText(item?.sourceName || item?.name, 180);
    const kind = safeText(item?.kind, 40);
    if (!ANALYSIS_SET.has(mimeType) || !sourceName || !data) continue;
    if (data.length > REFERENCE_LIMITS.maxAnalysisItemBase64Chars || data.length % 4 !== 0 || !BASE64.test(data)) continue;
    total += data.length;
    if (total > REFERENCE_LIMITS.maxAnalysisBase64Chars) break;
    references.push({ mimeType, data, sourceName, name:safeText(item?.name, 220), kind });
  }
  return { references, totalBase64Chars:total };
}

export function inferReferenceRole(sourceName) {
  const name = String(sourceName || "").toLowerCase();
  if (/logo|brand|mark|icon/.test(name)) return "brand";
  if (/hero|cover|banner|header/.test(name)) return "hero";
  if (/property|house|room|unit|listing|home/.test(name)) return "gallery";
  if (/product|item|menu|food|catalog/.test(name)) return "product";
  if (/team|person|profile|portrait|staff/.test(name)) return "profile";
  return "content";
}

export function buildReferenceAssetIntelligence(sourceName, frameCount = 1, dimensions = []) {
  const role = inferReferenceRole(sourceName);
  const name = safeText(sourceName, 180) || "Customer reference";
  const sections = role === "brand" ? ["Home","Header","About"]
    : role === "hero" ? ["Home","Landing"]
      : role === "product" ? ["Products","Catalog","Home"]
        : role === "gallery" ? ["Gallery","Listings","Home"]
          : role === "profile" ? ["About","Team","Profile"]
            : ["Home","Gallery","About"];
  const shape = dimensions.find(item => item?.width && item?.height);
  const sizeNote = shape ? ` Approximate analysis frame: ${shape.width}×${shape.height}.` : "";
  return {
    sourceName:name,
    role,
    label:`Customer-owned ${role} reference`,
    subject:name,
    description:`Use this customer-owned reference as project context and media placement input.${sizeNote} Preserve its intent without copying third-party branding, text, code or distinctive layouts.`,
    tags:["customer-owned","private-reference",role,frameCount > 1 ? "video-sampled" : "image-reference"],
    suggestedSections:sections,
    confidence: role === "content" ? 0.62 : 0.82,
  };
}

export function buildReferenceBrief(assetIntelligence = []) {
  const items = Array.isArray(assetIntelligence) ? assetIntelligence.slice(0, REFERENCE_LIMITS.maxFiles) : [];
  if (!items.length) return "No usable visual references were supplied.";
  const lines = items.map((item, index) => `${index + 1}. ${item.sourceName}: role=${item.role}; suggested sections=${(item.suggestedSections || []).join(", ")}.`);
  return [
    `Prepared ${items.length} private customer reference${items.length === 1 ? "" : "s"}.`,
    ...lines,
    "Treat these files as customer-owned project context. Learn intent and placement only; do not clone third-party branding, text, code, copyrighted imagery or distinctive layouts. Raw private reference bytes must never be reused across customers.",
  ].join("\n").slice(0, 4000);
}
