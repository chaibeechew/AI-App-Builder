import { assertRuntimeUrlAllowed } from "../soolen/security-policy.js";
import { getSoolenCostMode } from "../soolen/cost-policy.js";

const IMAGE_TIMEOUT_MS = 45000;
const MAX_DATA_IMAGE_LENGTH = 20 * 1024 * 1024;

export class ImageGenerationGatewayError extends Error {
  constructor(message, code = "IMAGE_GENERATION_GATEWAY_ERROR", status = 502) {
    super(message);
    this.name = "ImageGenerationGatewayError";
    this.code = code;
    this.status = status;
  }
}

function cleanText(value, max = 2000) {
  return String(value || "").replace(/[\u0000-\u001f\u007f]/g, "").trim().slice(0, max);
}

function normalizeCostClass(value) {
  const costClass = String(value || "metered").trim().toLowerCase();
  return ["zero", "free", "metered"].includes(costClass) ? costClass : "metered";
}

function costClassAllowed(costClass, costMode) {
  if (costMode === "paid" || costMode === "balanced") return true;
  if (costMode === "free") return costClass === "zero" || costClass === "free";
  return costClass === "zero";
}

function checkedEndpoint(value) {
  try { return assertRuntimeUrlAllowed(String(value || "").trim()); }
  catch (error) { throw new ImageGenerationGatewayError(error?.message || "Invalid image generation endpoint.", "IMAGE_GENERATION_ENDPOINT_INVALID", error?.status || 500); }
}

function withTimeout(ms) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  return { signal: controller.signal, done: () => clearTimeout(timer) };
}

function safeJson(raw) {
  try { return raw ? JSON.parse(raw) : {}; } catch { return {}; }
}

function imageValue(value) {
  const raw = typeof value === "string" ? value : value?.image || value?.url || value?.imageUrl || value?.outputUrl || "";
  const image = String(raw || "").trim();
  if (!image) return null;
  if (/^https:\/\//i.test(image) && image.length <= 4000) return image;
  if (/^data:image\/(?:png|jpeg|webp);base64,/i.test(image) && image.length <= MAX_DATA_IMAGE_LENGTH) return image;
  return null;
}

export function getImageGenerationConfig() {
  const provider = cleanText(process.env.IMAGE_GENERATION_PROVIDER || "", 80);
  const endpoint = String(process.env.IMAGE_GENERATION_ENDPOINT || "").trim();
  const costClass = normalizeCostClass(process.env.IMAGE_GENERATION_COST_CLASS);
  const costMode = getSoolenCostMode();
  const connected = Boolean(provider && endpoint);
  const allowedByCostPolicy = costClassAllowed(costClass, costMode);
  return {
    provider: provider || "provider-neutral",
    endpoint: endpoint || null,
    costClass,
    costMode,
    connected,
    configured: connected && allowedByCostPolicy,
    blockedByCostPolicy: connected && !allowedByCostPolicy,
  };
}

export async function generateExternalImages({ prompt, mode, style, palette, count, colors = {} }) {
  const config = getImageGenerationConfig();
  if (config.blockedByCostPolicy) throw new ImageGenerationGatewayError("The connected image model is blocked by the current zero-cost policy.", "IMAGE_GENERATION_COST_POLICY_BLOCKED", 403);
  if (!config.configured) return { configured: false, generated: false, provider: null, images: [] };

  const endpoint = checkedEndpoint(config.endpoint);
  const headers = { "Content-Type": "application/json", Accept: "application/json" };
  const token = String(process.env.IMAGE_GENERATION_TOKEN || "").trim();
  if (token) headers.Authorization = `Bearer ${token}`;
  const timeout = withTimeout(IMAGE_TIMEOUT_MS);
  let response;
  try {
    response = await fetch(endpoint, {
      method: "POST",
      headers,
      body: JSON.stringify({
        schemaVersion: 1,
        prompt: cleanText(prompt, 4000),
        mode: cleanText(mode, 40),
        style: cleanText(style, 80),
        palette: cleanText(palette, 80),
        count: Math.min(4, Math.max(1, Number(count) || 1)),
        colors: {
          primary: cleanText(colors.primary, 16),
          accent: cleanText(colors.accent, 16),
          background: cleanText(colors.background, 16),
        },
        output: { formats: ["png", "webp"], textInImage: false },
      }),
      cache: "no-store",
      redirect: "error",
      signal: timeout.signal,
    });
  } catch (error) {
    if (error?.name === "AbortError") throw new ImageGenerationGatewayError("The image model did not respond before the timeout.", "IMAGE_GENERATION_TIMEOUT", 504);
    throw new ImageGenerationGatewayError("The configured image model could not be reached.", "IMAGE_GENERATION_UNREACHABLE", 503);
  } finally {
    timeout.done();
  }

  const raw = await response.text();
  const data = safeJson(raw);
  if (!response.ok) throw new ImageGenerationGatewayError(cleanText(data?.error || data?.message, 500) || "The image model rejected this request.", cleanText(data?.code, 100) || "IMAGE_GENERATION_REJECTED", response.status >= 400 && response.status < 600 ? response.status : 502);

  const candidates = Array.isArray(data?.images) ? data.images : Array.isArray(data?.outputs) ? data.outputs : [data?.image || data?.url].filter(Boolean);
  const images = candidates.slice(0, Math.min(4, Math.max(1, Number(count) || 1))).map((item, index) => {
    const image = imageValue(item);
    if (!image) return null;
    return {
      id: cleanText(item?.id, 120) || `generated-${index + 1}`,
      image,
      width: Number(item?.width) || null,
      height: Number(item?.height) || null,
    };
  }).filter(Boolean);
  if (!images.length) throw new ImageGenerationGatewayError("The image model returned no usable image output.", "IMAGE_GENERATION_INVALID_RESPONSE", 502);
  return { configured: true, generated: true, provider: config.provider, images };
}
