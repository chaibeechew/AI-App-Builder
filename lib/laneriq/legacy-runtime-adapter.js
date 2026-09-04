import { createClient } from "../supabase/server.js";
import { resolveSoolenCapabilities } from "../soolen/capability-registry.js";
import { publicPlatformStatus } from "../soolen/platform-operator.js";
import { getSoolenSubscription } from "../soolen/user-tier.js";
import {
  SOOLENAI_SECURITY_PROFILE,
  SOOLENAI_SECURITY_BASELINE_VERSION,
  SOOLENAI_MAX_SECURITY_CONTROLS,
} from "../ai/soolenai-max-security.js";

export const LANERIQ_LEGACY_RUNTIME_ADAPTER_VERSION = "1.0.0";

function canonicalLaneriqCopy(value) {
  return String(value ?? "")
    .replace(/\bSoolenAI\b/g, "LANERIQ AI")
    .replace(/\bSoolen AI\b/g, "LANERIQ AI")
    .replace(/\bSoolen's\b/g, "LANERIQ AI's")
    .replace(/\bSoolen\b/g, "LANERIQ AI");
}

function canonicalizeCapability(capability = {}) {
  return {
    ...capability,
    category: canonicalLaneriqCopy(capability.category),
    name: canonicalLaneriqCopy(capability.name),
    description: canonicalLaneriqCopy(capability.description),
  };
}

export function resolveLaneriqCapabilities({ tier = "free" } = {}) {
  const legacy = resolveSoolenCapabilities({ tier });
  return {
    ...legacy,
    capabilities: Array.isArray(legacy?.capabilities)
      ? legacy.capabilities.map(canonicalizeCapability)
      : [],
  };
}

export async function resolveLaneriqAccountContext({ anonymousOnly = false } = {}) {
  if (anonymousOnly) {
    return {
      authenticated: false,
      subscription: { tier: "free", planName: "Free", status: "none", currentPeriodEnd: null },
      resolved: resolveLaneriqCapabilities({ tier: "free" }),
    };
  }

  const provider = await createClient();
  const { data: { user } } = await provider.auth.getUser();
  const subscription = user
    ? await getSoolenSubscription(provider, user.id)
    : { tier: "free", planName: "Free", status: "none", currentPeriodEnd: null };
  const tier = subscription.tier || "free";

  return {
    authenticated: Boolean(user),
    subscription: {
      tier,
      planName: subscription.planName || "Free",
      status: subscription.status || "none",
      currentPeriodEnd: subscription.currentPeriodEnd || null,
    },
    resolved: resolveLaneriqCapabilities({ tier }),
  };
}

export function publicLaneriqPlatformStatus(options = {}) {
  const legacy = publicPlatformStatus(options);
  return {
    ...legacy,
    service: "LANERIQ Platform Operator",
    authority: "laneriq",
    canonicalNamespace: "/api/laneriq",
    compatibility: {
      legacyAdapter: true,
      legacyRuntimeRequired: false,
      migrationMode: "gradual",
    },
  };
}

export function laneriqSecurityCapability() {
  return {
    profile: SOOLENAI_SECURITY_PROFILE,
    baselineVersion: SOOLENAI_SECURITY_BASELINE_VERSION,
    authority: "laneriq",
    secureByDefault: true,
    customerDowngradeAllowed: false,
    defaultProjectState: "private/draft",
    releaseFailClosed: true,
    malwareDefense: "defense-in-depth",
    antivirusClaim: "A real malware scanner clean result is only claimed when hash-bound scanner evidence exists; this profile is not an absolute no-malware/no-vulnerability guarantee.",
    controls: SOOLENAI_MAX_SECURITY_CONTROLS,
  };
}

export function laneriqCanonicalRuntimeStatus() {
  return {
    service: "LANERIQ Canonical Runtime",
    authority: "laneriq",
    version: LANERIQ_LEGACY_RUNTIME_ADAPTER_VERSION,
    canonicalApiNamespace: "/api/laneriq",
    legacyCompatibilityAvailable: true,
    legacyRuntimeRequired: false,
    newLaneriqCodeMayImportLegacyModulesDirectly: false,
    migrationMode: "adapter-first-gradual",
  };
}
