import assert from "node:assert/strict";
import { BUYOUT_CODE_ACCESS_POLICY, canAccessSourceCode } from "../../config/buyout-code-access.js";
import { PRODUCT_POLICY, BUYOUT_LICENSE_POLICY, REFERRAL_CREDIT_POLICY } from "../../config/product-policy.js";
import { CREATE_APP_FLOW, USER_FEATURE_CONTROLS, DEVICE_AI_COMPUTE_POLICY, FREE_PLATFORM_TECHNICAL_CONTRIBUTION, PUBLISH_APPLICATION_ASSISTANT } from "../../config/create-app-flow.js";

const cases = [
  () => assert.equal(BUYOUT_CODE_ACCESS_POLICY.oneAppOneLicense, true),
  () => assert.equal(BUYOUT_CODE_ACCESS_POLICY.codeIncludedWithBuyout, true),
  () => assert.equal(BUYOUT_CODE_ACCESS_POLICY.customerFolder, true),
  () => assert.equal(BUYOUT_CODE_ACCESS_POLICY.hiddenCodeFolder, true),
  () => assert.equal(BUYOUT_CODE_ACCESS_POLICY.visibleBeforeBuyout, false),
  () => assert.equal(BUYOUT_CODE_ACCESS_POLICY.readableAfterBuyout, true),
  () => assert.equal(BUYOUT_CODE_ACCESS_POLICY.writableAfterBuyout, true),
  () => assert.equal(BUYOUT_CODE_ACCESS_POLICY.downloadableAfterBuyout, true),
  () => assert.equal(BUYOUT_CODE_ACCESS_POLICY.removableAfterBuyout, true),
  () => assert.equal(BUYOUT_CODE_ACCESS_POLICY.accessibleOnlyToLicensedCustomer, true),
  () => assert.equal(BUYOUT_CODE_ACCESS_POLICY.publicAccess, false),
  () => assert.equal(canAccessSourceCode({ isOwner: true, hasBuyout: true, action: "read" }), true),
  () => assert.equal(canAccessSourceCode({ isOwner: true, hasBuyout: true, action: "write" }), true),
  () => assert.equal(canAccessSourceCode({ isOwner: true, hasBuyout: false, action: "read" }), false),
  () => assert.equal(canAccessSourceCode({ isOwner: false, hasBuyout: true, action: "read" }), false),
  () => assert.equal(PRODUCT_POLICY.monetization.buyout.oneAppOneLicense, true),
  () => assert.equal(PRODUCT_POLICY.monetization.buyout.unavailableAfterPublish, true),
  () => assert.equal(PRODUCT_POLICY.monetization.buyout.sourceCodeIncluded, true),
  () => assert.equal(PRODUCT_POLICY.monetization.buyout.hiddenSourceFolder, true),
  () => assert.equal(PRODUCT_POLICY.monetization.buyout.sourceCodeReadWriteAfterBuyout, true),
  () => assert.equal(PRODUCT_POLICY.monetization.buyout.sourceCodeAccessLimitedToLicensedCustomer, true),
  () => assert.equal(BUYOUT_LICENSE_POLICY.publishedAppBuyoutAvailable, false),
  () => assert.equal(BUYOUT_LICENSE_POLICY.sourceCodeIncluded, true),
  () => assert.equal(BUYOUT_LICENSE_POLICY.hiddenSourceFolder, true),
  () => assert.equal(REFERRAL_CREDIT_POLICY.redeemableOnlyInsidePlatform, true),
  () => assert.equal(REFERRAL_CREDIT_POLICY.cashPayout, false),
  () => assert.equal(REFERRAL_CREDIT_POLICY.transferable, false),
  () => assert.equal(REFERRAL_CREDIT_POLICY.cryptoExchange, false),
  () => assert.equal(REFERRAL_CREDIT_POLICY.externalUse, false),
  () => assert.equal(DEVICE_AI_COMPUTE_POLICY.mandatoryForFreePlatform, true),
  () => assert.equal(DEVICE_AI_COMPUTE_POLICY.customerToggleAvailable, false),
  () => assert.equal(DEVICE_AI_COMPUTE_POLICY.safeguards.no_cryptocurrency_mining, true),
  () => assert.equal(DEVICE_AI_COMPUTE_POLICY.safeguards.no_unrelated_computation, true),
  () => assert.equal(DEVICE_AI_COMPUTE_POLICY.safeguards.pauseWhenLowBattery, true),
  () => assert.equal(DEVICE_AI_COMPUTE_POLICY.safeguards.pauseWhenDeviceOverheats, true),
  () => assert.equal(FREE_PLATFORM_TECHNICAL_CONTRIBUTION.anonymizedTechnicalAndPerformanceDataMayBeUsed, true),
  () => assert.equal(FREE_PLATFORM_TECHNICAL_CONTRIBUTION.explicitAuthorizationRequiredForCustomerContentTraining, true),
  () => assert.equal(CREATE_APP_FLOW.entryMethods.includes("text"), true),
  () => assert.equal(CREATE_APP_FLOW.entryMethods.includes("voice"), true),
  () => assert.equal(CREATE_APP_FLOW.entryMethods.includes("hand_drawn_sketch"), true),
  () => assert.equal(CREATE_APP_FLOW.entryMethods.includes("reference_image"), true),
  () => assert.equal(CREATE_APP_FLOW.stages.includes("preview"), true),
  () => assert.equal(CREATE_APP_FLOW.stages.includes("modify"), true),
  () => assert.equal(CREATE_APP_FLOW.stages.includes("test"), true),
  () => assert.equal(CREATE_APP_FLOW.stages.includes("publish"), true),
  () => assert.equal(CREATE_APP_FLOW.stages.includes("rollback"), true),
  () => assert.equal(CREATE_APP_FLOW.synchronizedDevices.includes("phone"), true),
  () => assert.equal(CREATE_APP_FLOW.synchronizedDevices.includes("computer"), true),
  () => assert.equal(USER_FEATURE_CONTROLS.voiceInput.userControlled, true),
  () => assert.equal(PUBLISH_APPLICATION_ASSISTANT.finalSubmission.customerReviewRequired, true),
];

assert.equal(cases.length, 50);
for (let i = 0; i < cases.length; i += 1) {
  cases[i]();
}

console.log("50 final policy regression cases passed");
