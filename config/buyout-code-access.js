export const BUYOUT_CODE_ACCESS_POLICY = Object.freeze({
  oneAppOneLicense: true,
  codeIncludedWithBuyout: true,
  customerFolder: true,
  hiddenCodeFolder: true,
  hiddenFolderName: ".source",
  visibleBeforeBuyout: false,
  readableAfterBuyout: true,
  writableAfterBuyout: true,
  downloadableAfterBuyout: true,
  removableAfterBuyout: true,
  accessibleOnlyToLicensedCustomer: true,
  platformAdminAccessForSecurityAndSupport: true,
  otherCustomersAccess: false,
  publicAccess: false,
  publishedAppDoesNotGrantBuyoutAccess: true,
  licenseScope: "single_app",
});

export function canAccessSourceCode({ isOwner, hasBuyout, action = "read" } = {}) {
  if (!isOwner || !hasBuyout) return false;
  return ["read", "write", "download", "remove"].includes(action);
}
