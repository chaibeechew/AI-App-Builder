import { createServerClient } from "../../../../lib/supabase/server.js";
import {
  HIGH_RISK_API_LIMITS,
  boundaryResponse,
  isVerifiedUser,
  privateJson,
  readBoundedJson,
} from "../../../../lib/security/high-risk-api-boundary.js";

const ALLOWED_IMAGE_MIME = new Set(["image/jpeg", "image/png"]);

function pngSize(buffer) {
  if (buffer.length < 24 || buffer.slice(0, 8).toString("hex") !== "89504e470d0a1a0a") return null;
  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
}

function jpegSize(buffer) {
  if (buffer.length < 4 || buffer[0] !== 0xff || buffer[1] !== 0xd8) return null;
  let offset = 2;
  while (offset + 8 < buffer.length) {
    if (buffer[offset] !== 0xff) { offset += 1; continue; }
    const marker = buffer[offset + 1];
    if (marker === 0xd8 || marker === 0xd9) { offset += 2; continue; }
    if (offset + 4 > buffer.length) return null;
    const length = buffer.readUInt16BE(offset + 2);
    if (length < 2 || offset + 2 + length > buffer.length) return null;
    if (marker >= 0xc0 && marker <= 0xc3 && offset + 9 <= buffer.length) {
      return { height: buffer.readUInt16BE(offset + 5), width: buffer.readUInt16BE(offset + 7) };
    }
    offset += 2 + length;
  }
  return null;
}

function cleanScalar(value, max = 240) {
  if (typeof value === "boolean") return value;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  return String(value ?? "").trim().replace(/\s+/g, " ").slice(0, max);
}

function cleanList(value, maxItems, maxText = 240) {
  if (!Array.isArray(value)) return [];
  return value.slice(0, maxItems).map((item) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) return cleanScalar(item, maxText);
    return Object.fromEntries(
      Object.entries(item)
        .slice(0, 8)
        .map(([key, entry]) => [cleanScalar(key, 48), cleanScalar(entry, maxText)])
        .filter(([key]) => key)
    );
  });
}

function decodeImageData(imageData, requestedMime) {
  const raw = String(imageData || "").trim();
  const match = raw.match(/^data:(image\/(?:jpeg|png));base64,([A-Za-z0-9+/=\r\n]+)$/i);
  const dataMime = match?.[1]?.toLowerCase() || "";
  const base64 = (match?.[2] || raw).replace(/\s+/g, "");
  const mimeType = String(requestedMime || dataMime || "image/jpeg").toLowerCase();

  if (!ALLOWED_IMAGE_MIME.has(mimeType)) return { error: "Only JPEG and PNG images are supported.", status: 415 };
  if (dataMime && dataMime !== mimeType) return { error: "Image MIME type does not match the uploaded data.", status: 400 };
  if (!base64 || !/^[A-Za-z0-9+/]+={0,2}$/.test(base64)) return { error: "Image data is not valid base64.", status: 400 };
  if (base64.length > HIGH_RISK_API_LIMITS.imageBase64Chars) return { error: "Image is too large. Please use an image under 6 MB.", status: 413 };

  const buffer = Buffer.from(base64, "base64");
  const dimensions = mimeType === "image/png" ? pngSize(buffer) : jpegSize(buffer);
  if (!dimensions) return { error: "Image data is invalid or unsupported.", status: 400 };
  if (dimensions.width < 1 || dimensions.height < 1 || dimensions.width > 16_384 || dimensions.height > 16_384) {
    return { error: "Image dimensions are outside the supported range.", status: 400 };
  }
  return { buffer, dimensions, mimeType };
}

export async function POST(request) {
  try {
    const supabase = await createServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return privateJson({ success: false, error: "Authentication required." }, 401);
    if (!isVerifiedUser(user)) return privateJson({ success: false, error: "Account verification is required." }, 403);

    const body = await readBoundedJson(request, HIGH_RISK_API_LIMITS.imageAnalyzeBytes);
    const decoded = decodeImageData(body?.imageData, body?.mimeType);
    if (decoded.error) return privateJson({ success: false, error: decoded.error }, decoded.status);

    const uiAnalysis = body?.uiAnalysis && typeof body.uiAnalysis === "object" && !Array.isArray(body.uiAnalysis) ? body.uiAnalysis : {};
    const analysis = {
      type: "uploaded-image",
      mimeType: decoded.mimeType,
      dimensions: decoded.dimensions,
      likelyUI: Boolean(uiAnalysis.likelyUI),
      detectedRegions: cleanList(uiAnalysis.detectedRegions, 30),
      dominantColors: cleanList(uiAnalysis.dominantColors, 12, 64),
      textHints: cleanList(uiAnalysis.textHints, 30),
      notes: [
        "Processed without a paid image API.",
        "Use this visual analysis as reference input for Soolen AI modification.",
        "No private-person identification is performed.",
      ],
    };

    return privateJson({ success: true, engine: "Soolen AI Local Vision", cost: "0", result: JSON.stringify(analysis) });
  } catch (error) {
    console.error("SOOLEN_LOCAL_VISION_ERROR:", error?.name || "Error");
    return boundaryResponse(error, "Unable to analyze image.");
  }
}
