import { CLOUD_MAX_REQUEST_BYTES, CLOUD_MAX_UPSTREAM_RESPONSE_BYTES, CLOUD_SECURITY_LEVEL, CLOUD_SECURITY_PROFILE, validateAdapterUrl } from "../lib/security.js";

const EXACT_SHA = /^[a-f0-9]{40}$/i;

function productionRuntime() {
  return String(process.env.VERCEL_ENV || "").toLowerCase() === "production";
}

function releaseIdentity() {
  const sha = String(process.env.VERCEL_GIT_COMMIT_SHA || "").trim();
  return Object.freeze({
    sha: EXACT_SHA.test(sha) ? sha.toLowerCase() : null,
    environment: String(process.env.VERCEL_ENV || "").trim().toLowerCase() || "unknown",
    projectId: String(process.env.VERCEL_PROJECT_ID || "").trim() || null,
  });
}

export default function handler(_req, res) {
  const serviceSecretReady = String(process.env.LANERIQ_CLOUD_SERVICE_SECRET || "").length >= 32;
  const adapterSecretReady = String(process.env.LANERIQ_CLOUD_STORAGE_ADAPTER_SECRET || "").length >= 32;
  const adapterReady = Boolean(validateAdapterUrl(process.env.LANERIQ_CLOUD_STORAGE_ADAPTER_URL));
  const adapterCredentialReady = adapterSecretReady || serviceSecretReady;
  const production = productionRuntime();
  const release = releaseIdentity();
  res.setHeader("Cache-Control", "no-store, private, max-age=0");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "no-referrer");
  res.status(200).json({
    service: "laneriq-cloud-data",
    contract: "csvc1",
    mode: "standalone",
    securityLevel: CLOUD_SECURITY_LEVEL,
    securityProfile: CLOUD_SECURITY_PROFILE,
    signedRequestsRequired: true,
    timestampFreshnessRequiredForLegacyHmac: true,
    replayNonceDefenseForLegacyHmac: true,
    tripleScopeRequired: true,
    arbitraryQueryAllowed: false,
    providerOpaque: true,
    requestSizeBound: CLOUD_MAX_REQUEST_BYTES,
    upstreamResponseSizeBound: CLOUD_MAX_UPSTREAM_RESPONSE_BYTES,
    jsonOnly: true,
    prototypePollutionBlocked: true,
    rawSecretsBlocked: true,
    privateNetworkAdapterTargetsBlocked: true,
    redirectsBlocked: true,
    localBurstDefense: true,
    binaryUploadsAllowed: false,
    activeContentExecutionAllowed: false,
    malwareScannerCleanClaimWithoutEvidence: false,
    peerAuthenticationPreferred: "VERCEL_OIDC",
    peerAuthenticationFallback: production ? null : "HMAC_SHA256",
    productionOidcRequired: production,
    oidcPeerAuthenticationCapable: true,
    oidcExpectedSourceProject: "laneriq-ai",
    oidcExpectedEnvironment: "production",
    sharedPeerSecretRequired: false,
    serviceSecretReady,
    storageAdapterSecretReady: adapterSecretReady,
    storageAdapterReady: adapterReady,
    storageAdapterCredentialReady: adapterCredentialReady,
    serviceReleaseSha: release.sha,
    serviceEnvironment: release.environment,
    serviceProjectId: release.projectId,
    exactReleaseIdentityRequiredForLive: true,
    evidenceLevel: "CODE_READY",
    live: false,
  });
}
