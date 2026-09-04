export const CREATOR_ENCOURAGEMENT_POLICY = Object.freeze({
  name: "LANERIQ AI Creator Encouragement Program",
  customerButton: "Encourage Creator",
  individualOnly: true,
  companyTeamEnterpriseEligible: false,
  supportAccess: {
    extensionMonths: 3,
    allAvailableLaneriqFeatures: true,
    requiresFirstFreeAccessUsed: true,
    requiresUnfinishedProject: true,
    repeatApplicationAfterExpiry: true,
    automaticRenewal: false,
  },
  approval: {
    modes: ["auto", "manual"],
    defaultMode: "manual",
    autoApprovalStillUsesEligibilityAndAbuseGates: true,
    exceptionsRouteToManualReview: true,
  },
  verifyCode: {
    required: true,
    oneTime: true,
    accountBound: true,
    transferable: false,
    revocableByAdmin: true,
    audited: true,
  },
  ui: {
    hiddenUntilEligible: true,
    expandsOnlyAfterButtonPress: true,
    buttonHelperText: "个人 Creator 项目还没完成？可申请额外 3 个月全部功能使用期。",
    englishHelperText: "Individual Creator still finishing a project? Apply for 3 more months of all-feature Creator Support Access.",
  },
});
