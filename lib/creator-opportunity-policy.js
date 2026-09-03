export const CREATOR_OPPORTUNITY_POLICY = Object.freeze({
  id: "creator_opportunity_access",
  customerFacingName: "Creator Opportunity Access",
  eligibility: {
    individualsOnly: true,
    companiesAllowed: false,
    teamsAllowed: false,
    organizationsAllowed: false,
    requiresAdminApproval: true,
    intendedForCreatorsWithoutUpfrontBudget: true,
    creatorBeliefInCommercialPotentialRequired: true,
  },
  access: {
    upfrontPlatformAccessFeeUsd: 0,
    grantsFullCreationAccess: true,
    includesProfessional: true,
    gameAccessPlan: "full",
    ordinaryGameCooldownExempt: true,
    remainsSubjectToSafetyAbuseAndInfrastructureSafeguards: true,
  },
  commercialTerms: {
    extraPlatformSalesSharePercentagePoints: 5,
    meaning: "additive_percentage_points",
    exampleNormalPlatformSharePercent: 5,
    exampleOpportunityPlatformSharePercent: 10,
    appliesToProjectsUsingCreatorOpportunityAccess: true,
    persistsForApplicableCommercialRevenueFromThoseProjects: true,
    taxesRefundsAndChargebacksExcludedWhereTheUnderlyingSalesSharePolicyExcludesThem: true,
  },
  admin: {
    approvalIsIndividual: true,
    bulkOrganizationApprovalNotAllowed: true,
    approvalCanBeRejected: true,
  },
});

export function creatorOpportunityEffectiveShare(basePercent = 0) {
  return Number(basePercent || 0) + CREATOR_OPPORTUNITY_POLICY.commercialTerms.extraPlatformSalesSharePercentagePoints;
}
