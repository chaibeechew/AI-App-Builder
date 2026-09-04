// Enterprise pricing policy for LANERIQ AI.
// Personal, Family, and ordinary Team usage are not charged by this policy.
// Pricing is intentionally benchmarked below many enterprise app-builder platforms
// while preserving room for security, support, governance, and publishing costs.

export const ENTERPRISE_PRICING = Object.freeze({
  currency: "USD",
  billing: "annual",
  appliesTo: "enterprise_only",
  tiers: [
    {
      id: "enterprise_starter",
      name: "Enterprise Starter",
      minMembers: 11,
      maxMembers: 50,
      annualPrice: 1200,
      monthlyEquivalent: 100,
      includes: [
        "organization workspace",
        "member management",
        "role based access",
        "shared projects",
        "multi-device sync",
        "standard security controls",
        "standard publishing support",
      ],
    },
    {
      id: "enterprise_business",
      name: "Enterprise Business",
      minMembers: 51,
      maxMembers: 250,
      annualPrice: 3600,
      monthlyEquivalent: 300,
      includes: [
        "everything in Enterprise Starter",
        "advanced permissions",
        "audit-ready activity records",
        "priority support",
        "advanced publishing controls",
        "organization level governance",
      ],
    },
    {
      id: "enterprise_scale",
      name: "Enterprise Scale",
      minMembers: 251,
      maxMembers: null,
      annualPrice: 7200,
      monthlyEquivalent: 600,
      includes: [
        "everything in Enterprise Business",
        "large organization support",
        "dedicated onboarding",
        "priority infrastructure support",
        "custom governance review",
      ],
    },
  ],
  buyoutLicense: {
    enabled: true,
    customerFacingOption: true,
    purchasable: true,
    priceUsd: 499,
    customQuoteAvailable: false,
    mustSelectBeforePublish: true,
    availableAfterPublish: false,
    gameProjectEligible: false,
    encourageCreatorSupportedProjectEligible: false,
    encourageCreatorRestrictionScope: "supported_project_only",
    revenueShareAfterBuyoutPercent: 0,
    sourceCodeAccess: true,
    dashboardCertificateVisible: true,
    transactionalEmailCertificate: true,
    rule: "Eligible Enterprise non-Game projects may purchase the existing US$499 project-specific Buyout License before publish. The specific project that redeemed Encourage Creator support is not eligible. An active Buyout License sets future LANERIQ AI revenue share for that licensed project to 0%, subject to the applicable license terms.",
  },
  revenueShare: {
    enabled: true,
    defaultRatePercent: 5,
    appliesOnlyToAppRevenue: true,
    doesNotApplyToCustomerBusinessTransactions: true,
    removableByEligibleBuyout: true,
  },
  classification: {
    deviceCountDoesNotCreateEnterprise: true,
    memberCountAloneDoesNotAutomaticallyCreateEnterprise: true,
    organizationManagementIsEnterpriseSignal: true,
  },
});

export function getEnterpriseTier(memberCount = 1) {
  const count = Math.max(1, Number(memberCount) || 1);
  if (count < 11) return null;
  return ENTERPRISE_PRICING.tiers.find(
    (tier) => count >= tier.minMembers && (tier.maxMembers === null || count <= tier.maxMembers)
  ) || ENTERPRISE_PRICING.tiers.at(-1);
}

export function isEnterpriseOrganization({ memberCount = 1, organizationManaged = false } = {}) {
  return Boolean(organizationManaged || Number(memberCount) >= 11);
}
