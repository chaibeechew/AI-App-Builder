const LEGACY_HOST_PATTERNS = Object.freeze([
  /soolenai/i,
  /ai-app-builder/i,
]);

export const LANERIQ_INDEPENDENT_ROUTE_CONTRACT = "lir1";

export const LANERIQ_SERVICE_BOUNDARIES = Object.freeze({
  app: Object.freeze({
    service: "laneriq-ai",
    deploymentClass: "customer-app",
    endpointEnv: null,
    localFallback: true,
  }),
  cloudData: Object.freeze({
    service: "laneriq-cloud-data",
    deploymentClass: "data-control-plane",
    endpointEnv: "LANERIQ_CLOUD_DATA_URL",
    localFallback: true,
  }),
  malwareDefense: Object.freeze({
    service: "laneriq-malware-defense",
    deploymentClass: "security-control-plane",
    endpointEnv: "LANERIQ_MALWARE_DEFENSE_URL",
    localFallback: true,
  }),
  creativeMedia: Object.freeze({
    service: "laneriq-creative-media",
    deploymentClass: "creative-control-plane",
    endpointEnv: "LANERIQ_CREATIVE_MEDIA_URL",
    localFallback: true,
  }),
  providerRouter: Object.freeze({
    service: "laneriq-provider-router",
    deploymentClass: "provider-control-plane",
    endpointEnv: "LANERIQ_PROVIDER_ROUTER_URL",
    localFallback: true,
  }),
});

function normalizeUrl(value) {
  const raw = String(value || "").trim();
  if (!raw) return null;
  const url = new URL(raw);
  if (!/^https?:$/.test(url.protocol)) throw new Error("LANERIQ_SERVICE_URL_PROTOCOL_INVALID");
  if (LEGACY_HOST_PATTERNS.some((pattern) => pattern.test(url.hostname))) {
    throw new Error("LANERIQ_LEGACY_RUNTIME_TARGET_FORBIDDEN");
  }
  return url.toString().replace(/\/$/, "");
}

export function resolveIndependentService(serviceKey, env = process.env) {
  const boundary = LANERIQ_SERVICE_BOUNDARIES[serviceKey];
  if (!boundary) throw new Error("LANERIQ_SERVICE_UNKNOWN");
  const remoteUrl = boundary.endpointEnv ? normalizeUrl(env?.[boundary.endpointEnv]) : null;
  return Object.freeze({
    ...boundary,
    remoteUrl,
    execution: remoteUrl ? "independent-remote" : "local-boundary",
  });
}

export function independentRoutePolicy(env = process.env) {
  const services = Object.fromEntries(
    Object.keys(LANERIQ_SERVICE_BOUNDARIES).map((key) => [key, resolveIndependentService(key, env)]),
  );

  return Object.freeze({
    contract: LANERIQ_INDEPENDENT_ROUTE_CONTRACT,
    product: "LANERIQ AI",
    runtimeOwner: "LANERIQ AI",
    legacyCompatibility: Object.freeze({
      soolenaiAliasMayExistDuringMigration: true,
      soolenaiRuntimeRequired: false,
      oldAiAppBuilderRuntimeRequired: false,
    }),
    infrastructure: Object.freeze({
      serverIndependentNow: true,
      providerRouterRequiredForExternalAI: true,
      dedicatedLaneriqServerLive: false,
      migrateGradually: true,
    }),
    services: Object.freeze(services),
  });
}

export function publicIndependentRouteStatus(env = process.env) {
  const policy = independentRoutePolicy(env);
  return Object.freeze({
    contract: policy.contract,
    product: policy.product,
    runtimeOwner: policy.runtimeOwner,
    legacyRuntimeRequired: false,
    serverIndependentNow: policy.infrastructure.serverIndependentNow,
    dedicatedLaneriqServerLive: policy.infrastructure.dedicatedLaneriqServerLive,
    services: Object.fromEntries(
      Object.entries(policy.services).map(([key, value]) => [key, {
        service: value.service,
        deploymentClass: value.deploymentClass,
        execution: value.execution,
        independentEndpointConfigured: Boolean(value.remoteUrl),
      }]),
    ),
  });
}
