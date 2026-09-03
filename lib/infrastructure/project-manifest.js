export const LANERIQ_PROJECT_MANIFEST_VERSION = "2026-09-03.1";

export const ARTIFACT_KIND = Object.freeze({
  STATIC: "static",
  SERVERLESS: "serverless",
  WASM: "wasm",
  OCI: "oci",
});

const ALLOWED_ARTIFACT_KINDS = new Set(Object.values(ARTIFACT_KIND));
const PROVIDER_SPECIFIC_KEYS = new Set([
  "vercelProjectId",
  "vercelToken",
  "supabaseProjectId",
  "supabaseUrl",
  "awsAccountId",
  "cloudflareAccountId",
]);

function cleanId(value, name) {
  const normalized = String(value || "").trim();
  if (!normalized) throw new Error(`LANERIQ_PROJECT_MANIFEST_${name}_REQUIRED`);
  return normalized;
}

function assertProviderOpaque(value, path = "manifest") {
  if (!value || typeof value !== "object") return;
  for (const [key, nested] of Object.entries(value)) {
    if (PROVIDER_SPECIFIC_KEYS.has(key)) {
      throw new Error(`LANERIQ_PROJECT_MANIFEST_PROVIDER_FIELD_FORBIDDEN:${path}.${key}`);
    }
    assertProviderOpaque(nested, `${path}.${key}`);
  }
}

function normalizeArtifacts(artifacts = []) {
  if (!Array.isArray(artifacts)) throw new Error("LANERIQ_PROJECT_MANIFEST_ARTIFACTS_ARRAY_REQUIRED");
  return artifacts.map((artifact, index) => {
    const kind = String(artifact?.kind || "").trim().toLowerCase();
    if (!ALLOWED_ARTIFACT_KINDS.has(kind)) {
      throw new Error(`LANERIQ_PROJECT_MANIFEST_ARTIFACT_KIND_INVALID:${index}:${kind || "missing"}`);
    }
    return Object.freeze({
      id: cleanId(artifact.id, `ARTIFACT_${index}_ID`),
      kind,
      digest: artifact.digest ? String(artifact.digest) : null,
      entrypoint: artifact.entrypoint ? String(artifact.entrypoint) : null,
      rebuildable: artifact.rebuildable !== false,
    });
  });
}

export function createLaneriqProjectManifest({
  projectId,
  versionId,
  sourceSha = null,
  capabilities = [],
  artifacts = [],
  workloads = [],
  metadata = {},
} = {}) {
  const manifest = {
    schema: "laneriq.project",
    manifestVersion: LANERIQ_PROJECT_MANIFEST_VERSION,
    projectId: cleanId(projectId, "PROJECT_ID"),
    versionId: cleanId(versionId, "VERSION_ID"),
    sourceSha: sourceSha ? String(sourceSha) : null,
    providerOpaque: true,
    capabilities: [...new Set((Array.isArray(capabilities) ? capabilities : []).map((item) => String(item).trim()).filter(Boolean))],
    artifacts: normalizeArtifacts(artifacts),
    workloads: Array.isArray(workloads) ? workloads.map((item) => Object.freeze({ ...item })) : [],
    metadata: Object.freeze({ ...(metadata || {}) }),
  };
  assertProviderOpaque(manifest);
  return Object.freeze(manifest);
}

export function publicProjectManifestPolicy() {
  return Object.freeze({
    manifestVersion: LANERIQ_PROJECT_MANIFEST_VERSION,
    providerOpaque: true,
    supportedArtifactKinds: [...ALLOWED_ARTIFACT_KINDS],
    deploymentProviderEmbeddedInManifest: false,
    migrationModel: "artifact-first",
  });
}
