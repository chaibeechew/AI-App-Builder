export const PROJECT_EXPORT_FORMAT = "laneriq-ai-project-export-v2";
export const PROJECT_EXPORT_SCORE_REQUIRED = 100;

const SENSITIVE_KEY_PATTERN = /(?:^|_)(?:api_?key|access_?key|private_?key|client_?secret|secret|token|password|credential|authorization|cookie|session)(?:$|_)/i;
const SENSITIVE_VALUE_PATTERNS = [
  /\b(?:bearer|basic)\s+[a-z0-9._~+/=-]{12,}/i,
  /\b(?:sk_live|sk_test|ghp|github_pat|xox[baprs]|sq0atp)-?[a-z0-9_-]{12,}/i,
  /\bAIza[0-9A-Za-z_-]{24,}\b/,
  /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
  /\beyJ[a-zA-Z0-9_-]{8,}\.[a-zA-Z0-9_-]{8,}\.[a-zA-Z0-9_-]{8,}\b/,
  /(?:postgres(?:ql)?|mysql|mongodb(?:\+srv)?):\/\/[^\s:/]+:[^\s@]+@/i,
];

const REQUIRED_ARRAY_SECTIONS = ["versions", "workflows", "assetPlacements", "integrations", "monetization"];

function sensitiveKey(key) {
  const normalized = String(key || "").replace(/([a-z])([A-Z])/g, "$1_$2").replace(/[^a-z0-9]+/gi, "_");
  return SENSITIVE_KEY_PATTERN.test(normalized);
}

function sensitiveString(value) {
  return SENSITIVE_VALUE_PATTERNS.some((pattern) => pattern.test(String(value || "")));
}

function sanitizeValue(value, state, depth = 0) {
  if (depth > 24) {
    state.redacted += 1;
    return "[REDACTED:DEPTH_LIMIT]";
  }
  if (Array.isArray(value)) return value.map((item) => sanitizeValue(item, state, depth + 1));
  if (value && typeof value === "object") {
    const out = {};
    for (const [key, child] of Object.entries(value)) {
      if (sensitiveKey(key)) {
        out[key] = "[REDACTED]";
        state.redacted += 1;
      } else {
        out[key] = sanitizeValue(child, state, depth + 1);
      }
    }
    return out;
  }
  if (typeof value === "string" && sensitiveString(value)) {
    state.redacted += 1;
    return "[REDACTED]";
  }
  if (["string", "number", "boolean"].includes(typeof value) || value === null) return value;
  return null;
}

export function sanitizeProjectExport(value) {
  const state = { redacted: 0 };
  return { value: sanitizeValue(value, state), redactedFields: state.redacted };
}

function scanSensitive(value, path = "export", issues = [], depth = 0) {
  if (depth > 28) return issues;
  if (Array.isArray(value)) {
    value.forEach((item, index) => scanSensitive(item, `${path}[${index}]`, issues, depth + 1));
    return issues;
  }
  if (value && typeof value === "object") {
    for (const [key, child] of Object.entries(value)) {
      if (sensitiveKey(key) && child !== "[REDACTED]") issues.push(`${path}.${key}`);
      scanSensitive(child, `${path}.${key}`, issues, depth + 1);
    }
    return issues;
  }
  if (typeof value === "string" && value !== "[REDACTED]" && sensitiveString(value)) issues.push(path);
  return issues;
}

export function auditProjectExport(payload = {}) {
  const currentVersionId = String(payload?.project?.currentVersionId || "");
  const versions = Array.isArray(payload?.versions) ? payload.versions : [];
  const sensitivePaths = scanSensitive(payload);
  const checks = [
    { id: "format", weight: 10, passed: payload?.format === PROJECT_EXPORT_FORMAT, message: "Canonical portable export format is required." },
    { id: "verified-ownership", weight: 10, passed: payload?.ownership?.ownerVerified === true && !Object.prototype.hasOwnProperty.call(payload?.ownership || {}, "ownerUserId"), message: "Ownership must be verified without exposing the account identifier." },
    { id: "current-version", weight: 20, passed: Boolean(currentVersionId) && versions.some((version) => String(version?.id || "") === currentVersionId), message: "The exact current version must be present in the export." },
    { id: "secret-safety", weight: 25, passed: sensitivePaths.length === 0, message: "Credential-like keys and values must be redacted." },
    { id: "required-sections", weight: 15, passed: REQUIRED_ARRAY_SECTIONS.every((key) => Array.isArray(payload?.[key])) && Object.prototype.hasOwnProperty.call(payload, "dataModel") && Object.prototype.hasOwnProperty.call(payload, "projectLearning"), message: "Every portable project section must be represented explicitly." },
    { id: "source-completeness", weight: 10, passed: payload?.manifest?.sourceComplete === true && Array.isArray(payload?.manifest?.sections) && payload.manifest.sections.length >= 7, message: "The server must prove that every export query completed." },
    { id: "portability", weight: 10, passed: payload?.ownership?.portable === true && Boolean(payload?.exportedAt) && payload?.manifest?.assetFilesIncluded === false, message: "Portability scope and external asset handling must be explicit." },
  ];
  const score = checks.reduce((total, check) => total + (check.passed ? check.weight : 0), 0);
  return {
    score,
    required: PROJECT_EXPORT_SCORE_REQUIRED,
    passed: score === PROJECT_EXPORT_SCORE_REQUIRED && checks.every((check) => check.passed),
    checks,
    sensitivePaths,
    methodology: "laneriq-portable-project-export-audit-v2",
  };
}

export function buildProjectExport({ app = {}, sources = {}, exportedAt = new Date().toISOString() } = {}) {
  const raw = {
    format: PROJECT_EXPORT_FORMAT,
    exportedAt,
    ownership: {
      ownerVerified: true,
      portable: true,
      projectId: app.id || null,
      statement: "This customer-owned export can be retained independently of the LANERIQ AI workspace.",
    },
    project: {
      id: app.id || null,
      name: app.name || "Untitled Project",
      description: app.description || "",
      createdAt: app.created_at || null,
      updatedAt: app.updated_at || null,
      visibility: app.visibility || "private",
      publishStatus: app.publish_status || "draft",
      currentVersionId: app.current_version_id || null,
    },
    versions: sources.versions || [],
    dataModel: sources.backend || null,
    workflows: sources.workflows || [],
    assetPlacements: sources.assets || [],
    integrations: (sources.integrations || []).map((item) => ({
      integrationType: item?.integration_type || "unknown",
      displayName: item?.display_name || "Connection",
      enabled: item?.enabled === true,
      config: item?.config || {},
      updatedAt: item?.updated_at || null,
      note: "Provider credentials are never included in a project export.",
    })),
    monetization: sources.offers || [],
    projectLearning: sources.memory || null,
    manifest: {
      sourceComplete: sources.sourceComplete === true,
      sections: ["project", "versions", "dataModel", "workflows", "assetPlacements", "integrations", "monetization", "projectLearning"],
      assetFilesIncluded: false,
      assetNote: "Asset placement metadata is included. Private binary files remain in managed storage and must be downloaded separately by the owner.",
      redactedFields: 0,
    },
  };
  const sanitized = sanitizeProjectExport(raw);
  sanitized.value.manifest.redactedFields = sanitized.redactedFields;
  return { payload: sanitized.value, audit: auditProjectExport(sanitized.value) };
}
