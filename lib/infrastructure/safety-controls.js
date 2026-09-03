export const LANERIQ_SAFETY_CONTROLS_VERSION = "2026-09-03.1";

export const OPERATIONAL_MODE = Object.freeze({
  NORMAL: "normal",
  DEGRADED: "degraded",
  SURVIVAL: "survival",
  RECOVERY: "recovery",
});

export const SURVIVAL_ALLOWLIST = Object.freeze([
  "auth.login",
  "project.read",
  "project.save",
  "project.export",
  "recovery.status",
]);

export function resolveOperationalMode({
  manualEmergency = false,
  providerHealthy = true,
  errorRate = 0,
  spendRatio = 0,
  recovering = false,
} = {}) {
  if (recovering) return OPERATIONAL_MODE.RECOVERY;
  if (manualEmergency || Number(spendRatio) >= 1 || Number(errorRate) >= 0.25) return OPERATIONAL_MODE.SURVIVAL;
  if (!providerHealthy || Number(spendRatio) >= 0.9 || Number(errorRate) >= 0.08) return OPERATIONAL_MODE.DEGRADED;
  return OPERATIONAL_MODE.NORMAL;
}

export function resolveCapabilityAccess({
  capability,
  mode = OPERATIONAL_MODE.NORMAL,
  featureFlags = {},
  killSwitches = {},
} = {}) {
  const id = String(capability || "").trim();
  if (!id) throw new Error("LANERIQ_SAFETY_CAPABILITY_REQUIRED");

  if (killSwitches?.global === true || killSwitches?.[id] === true) {
    return Object.freeze({ allowed: false, reason: "emergency_kill_switch", mode });
  }
  if (featureFlags?.[id] === false) {
    return Object.freeze({ allowed: false, reason: "feature_flag_disabled", mode });
  }
  if (mode === OPERATIONAL_MODE.SURVIVAL && !SURVIVAL_ALLOWLIST.includes(id)) {
    return Object.freeze({ allowed: false, reason: "survival_mode_nonessential", mode });
  }
  if (mode === OPERATIONAL_MODE.RECOVERY && id.startsWith("generation.heavy")) {
    return Object.freeze({ allowed: false, reason: "recovery_mode_heavy_generation_paused", mode });
  }
  return Object.freeze({ allowed: true, reason: "policy_allowed", mode });
}

export function publicSafetyControlPolicy() {
  return Object.freeze({
    version: LANERIQ_SAFETY_CONTROLS_VERSION,
    modes: Object.values(OPERATIONAL_MODE),
    survivalAllowlist: [...SURVIVAL_ALLOWLIST],
    killSwitchIndependentOfDeploy: true,
    failClosedForKilledCapabilities: true,
    existingProjectAccessPriority: true,
  });
}
