export const LANERIQ_VERCEL_PREBUILT_ADAPTER_VERSION = "2026-09-04.1";

function normalizeRoute(route, index) {
  const src = String(route?.src || "").trim();
  const dest = String(route?.dest || "").trim();
  if (!src || !dest) throw new Error(`LANERIQ_VERCEL_PREBUILT_ROUTE_INVALID:${index}`);
  if (!src.startsWith("/")) throw new Error(`LANERIQ_VERCEL_PREBUILT_ROUTE_SRC_INVALID:${index}`);
  return Object.freeze({ src, dest });
}

function outputPath(path) {
  const normalized = String(path || "").replaceAll("\\", "/").replace(/^\.\//, "");
  if (!normalized || normalized.startsWith("/") || normalized.split("/").includes("..")) {
    throw new Error(`LANERIQ_VERCEL_PREBUILT_PATH_INVALID:${normalized || "missing"}`);
  }
  return `.vercel/output/static/${normalized}`;
}

export function createVercelPrebuiltPlan({ bundle, artifactId, routes = [] } = {}) {
  if (!bundle || bundle.schema !== "laneriq.build-bundle" || bundle.providerOpaque !== true) {
    throw new Error("LANERIQ_VERCEL_PREBUILT_PORTABLE_BUNDLE_REQUIRED");
  }
  const id = String(artifactId || "").trim();
  if (!id) throw new Error("LANERIQ_VERCEL_PREBUILT_ARTIFACT_ID_REQUIRED");
  const artifact = bundle.artifacts.find((item) => item.id === id);
  if (!artifact) throw new Error(`LANERIQ_VERCEL_PREBUILT_ARTIFACT_NOT_FOUND:${id}`);
  if (artifact.kind !== "static") throw new Error(`LANERIQ_VERCEL_PREBUILT_LEVEL0_KIND_UNSUPPORTED:${artifact.kind}`);

  const copies = bundle.files
    .filter((entry) => entry.artifactId === id)
    .map((entry) => Object.freeze({
      sourcePath: entry.path,
      targetPath: outputPath(entry.path),
      digest: entry.digest,
      sizeBytes: entry.sizeBytes,
    }));
  if (copies.length === 0) throw new Error("LANERIQ_VERCEL_PREBUILT_STATIC_FILES_REQUIRED");

  const normalizedRoutes = (Array.isArray(routes) ? routes : []).map(normalizeRoute);
  return Object.freeze({
    adapterVersion: LANERIQ_VERCEL_PREBUILT_ADAPTER_VERSION,
    providerId: "vercel",
    deploymentMode: "prebuilt",
    bundleDigest: bundle.bundleDigest,
    artifactId: id,
    artifactDigest: artifact.digest,
    outputRoot: ".vercel/output",
    staticRoot: ".vercel/output/static",
    configPath: ".vercel/output/config.json",
    config: Object.freeze({ version: 3, routes: Object.freeze(normalizedRoutes) }),
    fileCopies: Object.freeze(copies),
    commandHint: "vercel deploy --prebuilt",
    executesCli: false,
    performsNetworkCalls: false,
    readsProviderCredentials: false,
    systemEnvironmentAvailableDuringPrebuiltDeploy: false,
    materializationRequiredBeforeDeploy: true,
    sourceCodeUploadRequiredByAdapterPlan: false,
  });
}

export function publicVercelPrebuiltAdapterPolicy() {
  return Object.freeze({
    version: LANERIQ_VERCEL_PREBUILT_ADAPTER_VERSION,
    isolatedProviderAdapter: true,
    buildOutputApiVersion: 3,
    outputRoot: ".vercel/output",
    supportedLevel0ArtifactKinds: ["static"],
    prebuiltDeploySupportedByPlan: true,
    sourceCodeUploadRequiredByPlan: false,
    providerSdkRequired: false,
    networkCallsPerformed: false,
    credentialsRead: false,
    liveDeployTriggered: false,
    fixedInfrastructureCostRequired: false,
  });
}
