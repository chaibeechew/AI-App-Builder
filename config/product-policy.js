export const PRODUCT_POLICY = Object.freeze({
  product: "AI App Builder",
  data: {
    customerDataOwnership: "customer",
    useUploadedDataForModelTraining: false,
    uploadedDataPurpose: "app_creation_reference_only",
    crossCustomerDataUse: false,
  },
  access: {
    multiDevice: true,
    simultaneousPhoneComputerUse: true,
    deviceCountDoesNotCreateEnterprise: true,
    memberCountAloneDoesNotCreateEnterprise: true,
    organizationBasedBusinessAccess: true,
  },
  ai: {
    providerIdentityInternalOnly: true,
    providerVisibleToCustomers: false,
    freeProvidersPreferred: true,
    automaticFallback: true,
    proactiveQuotaSwitch: true,
  },
  monetization: {
    commercialAppCreatorDefinition: "professional_app_creation_and_operation",
    revenueShareOption: {
      enabled: true,
      ratePercent: 5,
      appliesTo: "app_revenue_only",
      excludesCustomerProductOrServiceTransactions: true,
    },
    buyout: {
      oneAppOneLicense: true,
      personal: { priceUsd: 49 },
      business: { priceUsd: 199 },
      enterprise: { priceUsd: 499 },
      futureRevenueShareAfterBuyoutPercent: 0,
      selectionRequiredBeforePublish: true,
    },
  },
  coreFlow: ["create", "modify", "preview", "test", "publish", "rollback"],
  userGuideLanguages: ["en", "zh-CN"],
});

export const BUYOUT_LICENSE_POLICY = Object.freeze({
  model: "one_app_one_license",
  personalPriceUsd: 49,
  businessPriceUsd: 199,
  enterprisePriceUsd: 499,
  revenueShareAfterBuyoutPercent: 0,
  mustSelectBeforePublish: true,
});
