const AI_ALLOWED_ACTIONS = [
  "learn",
  "analyze",
  "create",
  "modify",
  "preview",
  "test",
  "security_scan",
];

const HUMAN_ONLY_ACTIONS = [
  "publish",
  "delete",
  "rollback",
  "change_permissions",
  "change_security_rules",
  "change_provider",
  "disable_engine",
];

export function checkPermission(action) {
  if (!action || typeof action !== "string") {
    return {
      allowed: false,
      requiresHuman: true,
      reason: "Invalid action.",
    };
  }

  const normalized =
    action.toLowerCase().trim();

  if (AI_ALLOWED_ACTIONS.includes(normalized)) {
    return {
      allowed: true,
      requiresHuman: false,
      action: normalized,
    };
  }

  if (HUMAN_ONLY_ACTIONS.includes(normalized)) {
    return {
      allowed: false,
      requiresHuman: true,
      action: normalized,
      reason:
        "Human approval is required for this action.",
    };
  }

  return {
    allowed: false,
    requiresHuman: true,
    action: normalized,
    reason:
      "Unknown actions require human approval.",
  };
}

export function isHumanOnly(action) {
  return HUMAN_ONLY_ACTIONS.includes(
    action?.toLowerCase()?.trim()
  );
}