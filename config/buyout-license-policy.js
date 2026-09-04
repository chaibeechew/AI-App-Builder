export const BUYOUT_LICENSE_ISSUANCE_POLICY = Object.freeze({
  product: "LANERIQ AI",
  model: "one_project_one_buyout_license",
  currency: "USD",
  prices: Object.freeze({
    personal: 49,
    business: 199,
    enterprise: 499,
  }),
  certificateVersion: "LANERIQ-BUYOUT-CERT-v1",
  termsVersion: "LANERIQ-BUYOUT-LICENSE-v1-DRAFT",
  legalStatus: "DRAFT_LEGAL_REVIEW",
  customerProjectOwnershipPreserved: true,
  sourceCodeAccessAfterActiveLicense: true,
  futureLaneriqRevenueShareAfterBuyoutPercent: 0,
  mustBeIssuedAfterPaymentConfirmation: true,
  mustSelectBeforePublish: true,
  availableAfterPublish: false,
  gameProjectEligible: false,
  encourageCreatorSupportedProjectEligible: false,
  encourageCreatorRestrictionScope: "supported_project_only",
  otherProjectsOfSameCreatorRemainEligible: true,
  dashboardVisible: true,
  transactionalEmailReceiptEnabled: true,
  dashboardIsSourceOfTruth: true,
  emailFailureDoesNotInvalidateLicense: true,
  licenseNumberPrefix: "LQ-BUYOUT",
  privacy: Object.freeze({
    rawEmailStoredInLicenseTable: false,
    privateNoticeDataMustNotBePublishedInPublicRepository: true,
  }),
});

export function buyoutPriceForTier(tier) {
  const normalized = String(tier || "").trim().toLowerCase();
  const price = BUYOUT_LICENSE_ISSUANCE_POLICY.prices[normalized];
  if (!Number.isFinite(price)) throw new Error("Unsupported Buyout License tier.");
  return price;
}
