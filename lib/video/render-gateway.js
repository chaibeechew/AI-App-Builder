import { assertRuntimeUrlAllowed } from "../soolen/security-policy.js";
import { getSoolenCostMode } from "../soolen/cost-policy.js";

const RENDER_TIMEOUT_MS = 45000;
const STATUS_TIMEOUT_MS = 15000;
const SAFE_RENDER_STATUSES = new Set(["queued", "rendering", "completed", "failed"]);

export class VideoRenderGatewayError extends Error {
  constructor(message, code = "VIDEO_RENDER_GATEWAY_ERROR", status = 502) {
    super(message);
    this.name = "VideoRenderGatewayError";
    this.code = code;
    this.status = status;
  }
}

function cleanText(value, max = 2000) {
  return String(value || "").replace(/[\u0000-\u001f\u007f]/g, "").trim().slice(0, max);
}

function rendererHeaders() {
  const headers = { "Content-Type": "application/json", Accept: "application/json" };
  const token = String(process.env.VIDEO_RENDER_TOKEN || "").trim();
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

function withTimeout(ms) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  return { signal: controller.signal, done: () => clearTimeout(timer) };
}

function normalizeStatus(value, fallback = "queued") {
  const raw = String(value || "").toLowerCase().trim();
  if (["ready", "complete", "completed", "succeeded", "success", "done"].includes(raw)) return "completed";
  if (["running", "processing", "rendering", "in_progress", "in-progress"].includes(raw)) return "rendering";
  if (["error", "errored", "failed", "cancelled", "canceled"].includes(raw)) return "failed";
  if (["pending", "accepted", "queued"].includes(raw)) return "queued";
  return SAFE_RENDER_STATUSES.has(raw) ? raw : fallback;
}

function normalizeOutputPath(value) {
  const output = cleanText(value, 4000);
  if (!output) return null;
  if (/^https:\/\//i.test(output)) return output;
  if (/^(?:\/|[A-Za-z0-9_.-])[A-Za-z0-9_./:@?=&%+~-]*$/.test(output)) return output;
  return null;
}

function safeJson(raw) {
  try { return raw ? JSON.parse(raw) : {}; } catch { return {}; }
}

function checkedEndpoint(value, code) {
  if (!String(value || "").trim()) return null;
  try { return assertRuntimeUrlAllowed(String(value).trim()); }
  catch (error) { throw new VideoRenderGatewayError(error?.message || "Invalid render endpoint.", code, error?.status || 500); }
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

export function getVideoRendererConfig() {
  const provider = cleanText(process.env.VIDEO_RENDER_PROVIDER || "", 80);
  const rawEndpoint = String(process.env.VIDEO_RENDER_ENDPOINT || "").trim();
  const rawStatusEndpoint = String(process.env.VIDEO_RENDER_STATUS_ENDPOINT || "").trim();
  const costClass = normalizeCostClass(process.env.VIDEO_RENDER_COST_CLASS);
  const costMode = getSoolenCostMode();
  const connected = Boolean(provider && rawEndpoint);
  const allowedByCostPolicy = costClassAllowed(costClass, costMode);
  return {
    provider: provider || "provider-neutral",
    connected,
    configured: connected && allowedByCostPolicy,
    blockedByCostPolicy: connected && !allowedByCostPolicy,
    costClass,
    costMode,
    endpoint: rawEndpoint || null,
    statusEndpoint: rawStatusEndpoint || null,
  };
}

export async function startVideoRender({ project, version, editJson }) {
  const config = getVideoRendererConfig();
  if (config.blockedByCostPolicy) throw new VideoRenderGatewayError("The connected video renderer is blocked by the current zero-cost policy.", "VIDEO_RENDER_COST_POLICY_BLOCKED", 403);
  if (!config.configured) return { configured: false, started: false, status: "draft", jobId: null, outputPath: null, provider: null };

  const endpoint = checkedEndpoint(config.endpoint, "VIDEO_RENDER_ENDPOINT_INVALID");
  const timeout = withTimeout(RENDER_TIMEOUT_MS);
  let response;
  try {
    response = await fetch(endpoint, {
      method: "POST",
      headers: rendererHeaders(),
      body: JSON.stringify({
        schemaVersion: 1,
        provider: config.provider,
        project: {
          id: project.id,
          name: cleanText(project.name, 160),
          style: project.style,
          deviceClass: project.device_class,
          maxDurationSeconds: project.max_duration_seconds,
        },
        version: {
          id: version.id,
          versionNo: version.version_no,
          durationSeconds: Number(version.duration_seconds || 0),
        },
        edit: editJson,
        requestedOutput: { container: "mp4", finalEncode: true },
      }),
      cache: "no-store",
      redirect: "error",
      signal: timeout.signal,
    });
  } catch (error) {
    if (error?.name === "AbortError") throw new VideoRenderGatewayError("The video renderer did not accept the job before the timeout.", "VIDEO_RENDER_TIMEOUT", 504);
    throw new VideoRenderGatewayError("The configured video renderer could not be reached.", "VIDEO_RENDER_UNREACHABLE", 503);
  } finally {
    timeout.done();
  }

  const raw = await response.text();
  const data = safeJson(raw);
  if (!response.ok) throw new VideoRenderGatewayError(cleanText(data?.error || data?.message, 500) || "The video renderer rejected this job.", cleanText(data?.code, 100) || "VIDEO_RENDER_REJECTED", response.status >= 400 && response.status < 600 ? response.status : 502);

  const outputPath = normalizeOutputPath(data?.outputPath || data?.outputUrl || data?.videoUrl || data?.url);
  const jobId = cleanText(data?.jobId || data?.id || data?.renderId, 240) || null;
  let status = normalizeStatus(data?.status, outputPath ? "completed" : "queued");
  if (outputPath) status = "completed";
  if (!jobId && !outputPath) throw new VideoRenderGatewayError("The renderer accepted the request but returned neither a render job id nor an output path.", "VIDEO_RENDER_INVALID_RESPONSE", 502);

  return { configured: true, started: true, status, jobId, outputPath, provider: config.provider };
}

function statusUrl(template, jobId) {
  const cleanJobId = encodeURIComponent(cleanText(jobId, 240));
  if (!cleanJobId) throw new VideoRenderGatewayError("Render job id is missing.", "VIDEO_RENDER_JOB_ID_MISSING", 400);
  const raw = String(template || "").trim();
  if (!raw) return null;
  const expanded = raw.includes("{jobId}") ? raw.replaceAll("{jobId}", cleanJobId) : `${raw}${raw.includes("?") ? "&" : "?"}jobId=${cleanJobId}`;
  return checkedEndpoint(expanded, "VIDEO_RENDER_STATUS_ENDPOINT_INVALID");
}

export async function checkVideoRenderStatus({ jobId }) {
  const config = getVideoRendererConfig();
  if (config.blockedByCostPolicy) throw new VideoRenderGatewayError("The connected video renderer is blocked by the current zero-cost policy.", "VIDEO_RENDER_COST_POLICY_BLOCKED", 403);
  if (!config.configured || !config.statusEndpoint) return { checked: false, provider: config.provider, status: null, outputPath: null, jobId };
  const endpoint = statusUrl(config.statusEndpoint, jobId);
  const timeout = withTimeout(STATUS_TIMEOUT_MS);
  let response;
  try {
    response = await fetch(endpoint, { method: "GET", headers: rendererHeaders(), cache: "no-store", redirect: "error", signal: timeout.signal });
  } catch (error) {
    if (error?.name === "AbortError") throw new VideoRenderGatewayError("The video renderer status check timed out.", "VIDEO_RENDER_STATUS_TIMEOUT", 504);
    throw new VideoRenderGatewayError("The video renderer status service could not be reached.", "VIDEO_RENDER_STATUS_UNREACHABLE", 503);
  } finally {
    timeout.done();
  }
  const raw = await response.text();
  const data = safeJson(raw);
  if (!response.ok) throw new VideoRenderGatewayError(cleanText(data?.error || data?.message, 500) || "Unable to check the render job.", cleanText(data?.code, 100) || "VIDEO_RENDER_STATUS_ERROR", response.status >= 400 && response.status < 600 ? response.status : 502);
  const outputPath = normalizeOutputPath(data?.outputPath || data?.outputUrl || data?.videoUrl || data?.url);
  let status = normalizeStatus(data?.status, outputPath ? "completed" : "rendering");
  if (outputPath) status = "completed";
  return { checked: true, provider: config.provider, status, outputPath, jobId };
}
