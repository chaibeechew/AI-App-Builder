export const LANERIQ_LAUNCH_MODE_VERSION = "2026-09-04.1";

export const LAUNCH_MODE = Object.freeze({
  id: "no-credits-launch",
  version: LANERIQ_LAUNCH_MODE_VERSION,
  active: true,
  customerAccessModel: "no_credits",
  credits: Object.freeze({
    customerModelActive: false,
    publicNavigationVisible: false,
    publicBalancePageEnabled: false,
    purchasePromptAllowed: false,
    shortagePromptAllowed: false,
    referralCreditsPromoted: false,
    backendEntitlementCompatibilityRetained: true,
    historicalLedgerCompatibilityRetained: true,
  }),
  promotion: Object.freeze({
    freeFirstProjectPublicMessaging: false,
    historicalEligibilityCompatibilityRetained: true,
  }),
  infrastructure: Object.freeze({
    fixedCostIncreaseRequired: false,
    databaseMigrationRequired: false,
    providerChangeRequired: false,
    dedicatedServerRequired: false,
  }),
  userCopy: Object.freeze({
    accessUnavailable: "Build access is temporarily unavailable. Please try again shortly.",
  }),
});

export function isNoCreditsLaunchMode() {
  return LAUNCH_MODE.active === true && LAUNCH_MODE.customerAccessModel === "no_credits";
}
