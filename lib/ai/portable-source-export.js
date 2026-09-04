import crypto from "node:crypto";

export const LANERIQ_PORTABLE_SOURCE_EXPORT_VERSION = "2026-09-05.1";
export const LANERIQ_PORTABLE_SOURCE_EXPORT_MEDIA_TYPE = "application/vnd.laneriq.source-bundle+json";

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.entries(value)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, nested]) => [key, stable(nested)]),
  );
}

function sha256(value) {
  return `sha256:${crypto.createHash("sha256").update(value, "utf8").digest("hex")}`;
}

function normalizedSecretKey(key) {
  return String(key || "")
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .replace(/[-.\s]+/g, "_")
    .toLowerCase();
}

function isSensitiveKey(key) {
  const normalized = normalizedSecretKey(key);
  return /(^|_)(api_key|secret|password|passphrase|authorization|auth_token|access_token|refresh_token|id_token|bearer_token|private_key|service_role|service_role_key|client_secret|cookie|session_secret)(_|$)/.test(normalized);
}

function looksLikeCredential(value) {
  const text = String(value || "");
  return /-----BEGIN (?:RSA |EC |OPENSSH |PGP )?PRIVATE KEY-----/i.test(text)
    || /\bsk-(?:proj-)?[A-Za-z0-9_-]{20,}\b/.test(text)
    || /\bsb_secret_[A-Za-z0-9_-]{20,}\b/i.test(text)
    || /\b(?:authorization|api[_-]?key|access[_-]?token|refresh[_-]?token|password|client[_-]?secret|service[_-]?role[_-]?key)\s*[:=]\s*["']?(?:bearer\s+)?[A-Za-z0-9._~+\/-]{12,}/i.test(text);
}

function sanitize(value, path, redactions) {
  if (Array.isArray(value)) return value.map((item, index) => sanitize(item, `${path}[${index}]`, redactions));
  if (value && typeof value === "object") {
    const output = {};
    for (const key of Object.keys(value).sort((a, b) => a.localeCompare(b))) {
      const nestedPath = path ? `${path}.${key}` : key;
      if (isSensitiveKey(key)) {
        output[key] = "[REDACTED]";
        redactions.push(nestedPath);
      } else {
        output[key] = sanitize(value[key], nestedPath, redactions);
      }
    }
    return output;
  }
  if (typeof value === "string" && looksLikeCredential(value)) {
    redactions.push(path || "$value");
    return "[REDACTED]";
  }
  return value;
}

function jsonFile(path, value) {
  const content = `${JSON.stringify(stable(value), null, 2)}\n`;
  return Object.freeze({
    path,
    mediaType: "application/json",
    sizeBytes: Buffer.byteLength(content, "utf8"),
    digest: sha256(content),
    content,
  });
}

function textFile(path, content) {
  const normalized = String(content).endsWith("\n") ? String(content) : `${content}\n`;
  return Object.freeze({
    path,
    mediaType: "text/markdown; charset=utf-8",
    sizeBytes: Buffer.byteLength(normalized, "utf8"),
    digest: sha256(normalized),
    content: normalized,
  });
}

export function portableSourceFilename(projectId, versionNo) {
  const id = String(projectId || "project").replace(/[^A-Za-z0-9_-]/g, "-").slice(0, 80) || "project";
  const version = Number.isInteger(Number(versionNo)) ? Math.max(0, Number(versionNo)) : 0;
  return `${id}-v${version}.laneriq.json`;
}

export function createPortableSourceExport({ app, version } = {}) {
  const projectId = String(app?.id || "").trim();
  const versionId = String(version?.id || "").trim();
  if (!projectId) throw new Error("LANERIQ_SOURCE_EXPORT_PROJECT_REQUIRED");
  if (!versionId) throw new Error("LANERIQ_SOURCE_EXPORT_VERSION_REQUIRED");

  const versionNo = Number(version?.version_no);
  if (!Number.isInteger(versionNo) || versionNo < 1) throw new Error("LANERIQ_SOURCE_EXPORT_VERSION_NO_INVALID");
  if (!version?.specification || typeof version.specification !== "object" || Array.isArray(version.specification)) {
    throw new Error("LANERIQ_SOURCE_EXPORT_SPECIFICATION_REQUIRED");
  }

  const redactions = [];
  const specification = sanitize(version.specification, "specification", redactions);
  const versionMetadata = sanitize({
    id: versionId,
    versionNo,
    createdAt: version.created_at || null,
    changeSummary: version.change_summary || null,
  }, "version", redactions);

  const files = [
    jsonFile("project/specification.json", specification),
    jsonFile("project/version.json", versionMetadata),
    textFile(
      "README.md",
      `# LANERIQ AI Portable Project Source\n\nProject: ${projectId}\nVersion: ${versionId} (v${versionNo})\n\nThis bundle contains the persisted, structured LANERIQ project source for one exact saved version. It is provider-independent and intentionally excludes credentials, environment secrets, runtime sessions, deployment tokens and generated framework build artifacts.`,
    ),
  ].sort((a, b) => a.path.localeCompare(b.path));

  const canonicalPayload = stable({
    schema: "laneriq.portable-project-source",
    version: LANERIQ_PORTABLE_SOURCE_EXPORT_VERSION,
    projectId,
    versionId,
    versionNo,
    sourceKind: "persisted-generated-specification",
    files,
    redaction: {
      policy: "known-credential-fields-and-values-redacted",
      count: redactions.length,
      paths: [...new Set(redactions)].sort(),
    },
    portability: {
      providerIndependent: true,
      frameworkSourceFilesIncluded: false,
      generatedBuildArtifactsIncluded: false,
      environmentSecretsIncluded: false,
      importContractVersion: LANERIQ_PORTABLE_SOURCE_EXPORT_VERSION,
    },
  });
  const bundleDigest = sha256(JSON.stringify(canonicalPayload));

  return Object.freeze({
    ...canonicalPayload,
    bundleDigest,
  });
}

export function verifyPortableSourceExport(bundle) {
  if (!bundle || bundle.schema !== "laneriq.portable-project-source") {
    return Object.freeze({ verified: false, reason: "bundle_invalid" });
  }
  const { bundleDigest, ...payload } = bundle;
  const observedDigest = sha256(JSON.stringify(stable(payload)));
  const fileDigestsValid = Array.isArray(bundle.files) && bundle.files.every((file) =>
    file
    && typeof file.path === "string"
    && !file.path.startsWith("/")
    && !file.path.split("/").includes("..")
    && file.digest === sha256(String(file.content ?? ""))
    && file.sizeBytes === Buffer.byteLength(String(file.content ?? ""), "utf8")
  );
  return Object.freeze({
    verified: observedDigest === bundleDigest && fileDigestsValid,
    expectedDigest: bundleDigest || null,
    observedDigest,
    fileDigestsValid,
  });
}
