export const PUBLISHING_READINESS_VERSION = "laneriq-publishing-readiness-v1-2026-09-01";

const CAPABILITY_DEFINITIONS = Object.freeze([
  {
    id: "camera",
    label: "Camera",
    purposeField: "cameraPurpose",
    pattern: /\b(?:camera|take (?:a )?photo|capture (?:a )?photo|scan (?:a )?(?:qr|barcode|document|receipt))\b|相机|拍照|扫码/i,
  },
  {
    id: "microphone",
    label: "Microphone",
    purposeField: "microphonePurpose",
    pattern: /\b(?:microphone|voice input|voice recording|record audio|audio recording|speech[- ]to[- ]text|dictation)\b|麦克风|语音输入|录音/i,
  },
  {
    id: "location",
    label: "Location",
    purposeField: "locationPurpose",
    pattern: /\b(?:gps|geolocation|current location|live location|location permission|location tracking|nearby places|turn[- ]by[- ]turn)\b|定位|当前位置|实时位置/i,
  },
  {
    id: "photos",
    label: "Photos",
    purposeField: "photosPurpose",
    pattern: /\b(?:(?:upload|select|choose|import|attach|save)\s+(?:a\s+)?(?:photo|image)|(?:photo|image)\s+(?:upload|library|picker|attachment)|photo library)\b|相册|上传.{0,8}(?:照片|图片)/i,
  },
  {
    id: "notifications",
    label: "Notifications",
    purposeField: "notificationsPurpose",
    pattern: /\b(?:push notifications?|notification permission|send notifications?|appointment reminders?|order alerts?|safety alerts?)\b|推送通知|通知权限|发送通知/i,
  },
]);

function object(value) { return value && typeof value === "object" && !Array.isArray(value) ? value : {}; }
function array(value) { return Array.isArray(value) ? value : []; }
function value(value) { return String(value ?? "").trim(); }
function validEmail(input) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value(input)); }
function validHttpUrl(input) { try { const url = new URL(value(input)); return url.protocol === "https:" || url.protocol === "http:"; } catch { return false; } }

function searchableSpecification(specification = {}) {
  const safe = {
    description: specification.description,
    industry: specification.industry,
    pages: specification.pages,
    features: specification.features,
    actions: specification.actions,
    navigation: specification.navigation,
    permissions: specification.permissions,
    capabilities: specification.capabilities,
    data: specification.data,
    dataModels: specification.dataModels,
  };
  try { return JSON.stringify(safe).slice(0, 240000); } catch { return ""; }
}

export function detectPublishingCapabilities(specification = {}) {
  const text = searchableSpecification(specification);
  return CAPABILITY_DEFINITIONS.filter((item) => item.pattern.test(text)).map(({ pattern: _pattern, ...item }) => item);
}

function normalizedAsset(asset = {}) {
  return [asset.file_name, asset.name, asset.category, asset.mime_type, asset.suggested_role, asset.suggested_page, asset.placement_reason, asset.placement].map(value).join(" ").toLowerCase();
}

export function inspectStoreAssets(assets = []) {
  const rows = array(assets);
  const iconAssets = rows.filter((asset) => {
    const text = normalizedAsset(asset);
    const isImage = !value(asset.mime_type) || value(asset.mime_type).startsWith("image/");
    return isImage && (/\b(?:app[-_ ]?icon|store[-_ ]?icon|launcher[-_ ]?icon)\b/.test(text) || ["app_icon", "store_icon", "launcher_icon"].includes(value(asset.suggested_role).toLowerCase()));
  });
  const screenshotAssets = rows.filter((asset) => {
    const text = normalizedAsset(asset);
    const isImage = !value(asset.mime_type) || value(asset.mime_type).startsWith("image/");
    return isImage && (/\b(?:store[-_ ]?screenshot|iphone[-_ ]?screenshot|android[-_ ]?screenshot|app[-_ ]?screenshot)\b/.test(text) || ["store_screenshot", "screenshot"].includes(value(asset.suggested_role).toLowerCase()));
  });
  return {
    total: rows.length,
    appIcon: { prepared: iconAssets.length > 0, count: iconAssets.length, assetIds: iconAssets.map((asset) => asset.asset_id || asset.id).filter(Boolean) },
    storeScreenshots: { prepared: screenshotAssets.length > 0, count: screenshotAssets.length, assetIds: screenshotAssets.map((asset) => asset.asset_id || asset.id).filter(Boolean) },
  };
}

export function extractPublishingAnswers(listing = {}) {
  const apple = object(listing.apple);
  const google = object(listing.google_play || listing.googlePlay);
  const permissionDisclosures = { ...object(google.permissionDisclosures), ...object(apple.permissionDisclosures) };
  return {
    supportEmail: value(google.contactEmail),
    privacyPolicyUrl: value(apple.privacyUrl || google.privacyPolicyUrl),
    supportUrl: value(apple.supportUrl),
    termsUrl: value(apple.termsUrl || google.termsUrl),
    websiteUrl: value(apple.marketingUrl || google.developerWebsite),
    targetAudience: value(google.audienceSummary),
    ageRating: value(apple.ageRating || google.ageRating),
    loginRequired: Boolean(apple.loginRequired ?? google.loginRequired ?? /authenticated areas/i.test(value(apple.reviewNotes))),
    reviewAccessReady: Boolean(apple.reviewAccessReady ?? google.reviewAccessReady),
    permissionDisclosures,
    cameraPurpose: value(permissionDisclosures.camera),
    microphonePurpose: value(permissionDisclosures.microphone),
    locationPurpose: value(permissionDisclosures.location),
    photosPurpose: value(permissionDisclosures.photos),
    notificationsPurpose: value(permissionDisclosures.notifications),
  };
}

function row(id, label, status, detail, options = {}) {
  return { id, label, status, detail, platform: options.platform || "both", blocking: options.blocking === true, actionHref: options.actionHref || null };
}

export function buildPublishingReadiness({ specification = {}, listing = null, assets = [], buildQuality = null, visualQuality = null } = {}) {
  const detectedCapabilities = detectPublishingCapabilities(specification);
  const assetEvidence = inspectStoreAssets(assets);
  const answers = extractPublishingAnswers(listing || {});
  const prepared = [];
  const aiCanPrepare = [];
  const customerMustConfirm = [];
  const externalActions = [
    row("apple-developer-account", "Apple Developer Program account", "external_action", "The customer owns the account and pays Apple directly.", { platform: "apple" }),
    row("google-developer-account", "Google Play developer account", "external_action", "The customer owns the account and pays Google directly.", { platform: "google_play" }),
    row("signing-and-store-console", "Signing, declarations and final store-console review", "external_action", "Credentials, legal declarations and the final submit action stay with the customer and the official stores."),
  ];

  const requireCustomer = (id, label, detail) => customerMustConfirm.push(row(id, label, "customer_must_confirm", detail, { blocking: true }));
  const prepareOrRequire = (condition, id, label, missingDetail, validator = (input) => Boolean(value(input)), input = condition) => {
    if (validator(input)) prepared.push(row(id, label, "prepared", "Provided and available in the current reviewed listing."));
    else requireCustomer(id, label, missingDetail);
  };

  if (listing) {
    const apple = object(listing.apple), google = object(listing.google_play || listing.googlePlay);
    if (value(apple.name || google.title)) prepared.push(row("store-name", "Store name", "prepared", "Prepared from the current project."));
    else aiCanPrepare.push(row("store-name", "Store name", "ai_can_prepare", "LANERIQ AI can prepare this from the current project."));
    if (value(apple.description || google.fullDescription)) prepared.push(row("store-description", "Store descriptions", "prepared", "Prepared from the current project."));
    else aiCanPrepare.push(row("store-description", "Store descriptions", "ai_can_prepare", "LANERIQ AI can prepare these from the current project."));
  } else {
    aiCanPrepare.push(row("store-listing", "Apple and Google store information", "ai_can_prepare", "Generate a listing from the exact current project version.", { actionHref: "#customer-questions" }));
  }

  prepareOrRequire(answers.supportEmail, "support-email", "Support email", "Provide a real support email.", validEmail, answers.supportEmail);
  prepareOrRequire(answers.targetAudience, "target-audience", "Target audience", "Confirm the real audience and age suitability.");
  prepareOrRequire(answers.privacyPolicyUrl, "privacy-policy", "Privacy Policy URL", "Confirm a real reachable privacy policy URL.", validHttpUrl, answers.privacyPolicyUrl);
  prepareOrRequire(answers.supportUrl, "support-url", "Support URL", "Confirm a real reachable support URL.", validHttpUrl, answers.supportUrl);
  prepareOrRequire(answers.termsUrl, "terms-url", "Terms URL", "Confirm a real reachable Terms of Use / Terms of Service URL.", validHttpUrl, answers.termsUrl);
  prepareOrRequire(answers.ageRating, "age-rating", "Age / content rating declaration", "Answer the rating declaration truthfully and complete the official store questionnaires.");

  if (answers.loginRequired) {
    if (answers.reviewAccessReady) prepared.push(row("review-access", "Store reviewer access", "prepared", "Customer confirmed that reviewer/demo access is ready; credentials are not stored here."));
    else requireCustomer("review-access", "Store reviewer access", "Confirm that valid reviewer/demo access will be entered directly in the official store console. Do not place passwords here.");
  }

  for (const capability of detectedCapabilities) {
    const purpose = value(answers.permissionDisclosures?.[capability.id] || answers[capability.purposeField]);
    if (purpose) prepared.push(row(`permission-${capability.id}`, `${capability.label} purpose disclosure`, "prepared", purpose));
    else requireCustomer(`permission-${capability.id}`, `${capability.label} purpose disclosure`, `LANERIQ AI detected ${capability.label} use. Confirm the exact customer-facing reason before submission.`);
  }

  if (assetEvidence.appIcon.prepared) prepared.push(row("app-icon", "Dedicated App Icon", "prepared", `${assetEvidence.appIcon.count} dedicated icon asset(s) identified.`));
  else aiCanPrepare.push(row("app-icon", "Dedicated App Icon", "ai_can_prepare", "Create and select a dedicated store icon; a logo or design direction alone is not counted as a finished icon.", { actionHref: "/image-studio?mode=create" }));
  if (assetEvidence.storeScreenshots.prepared) prepared.push(row("store-screenshots", "Store Screenshots", "prepared", `${assetEvidence.storeScreenshots.count} dedicated store screenshot asset(s) identified.`));
  else aiCanPrepare.push(row("store-screenshots", "Store Screenshots", "ai_can_prepare", "Capture screenshots from the final tested iPhone and Android Preview.", { actionHref: "#preview-assets" }));

  const buildPassed = buildQuality?.passed === true || Number(buildQuality?.overall) === 100;
  const visualPassed = visualQuality?.passed === true || Number(visualQuality?.score) === 100;
  if (buildPassed) prepared.push(row("quality-gate", "100-point release quality gate", "prepared", "The exact current version passed every deterministic quality dimension."));
  else aiCanPrepare.push(row("quality-gate", "100-point release quality gate", "ai_can_prepare", "Use Fix with AI and re-run Quality Gate on the exact current version.", { blocking: true }));
  if (visualPassed) prepared.push(row("visual-gate", "Per-page visual audit", "prepared", "Every page passed the premium mobile visual contract."));
  else aiCanPrepare.push(row("visual-gate", "Per-page visual audit", "ai_can_prepare", "Redesign and recheck every page before Preview or store preparation.", { blocking: true }));

  const customerApproved = Boolean(listing?.customer_approved_at);
  if (listing && customerApproved) prepared.push(row("listing-approval", "Customer listing approval", "prepared", "The customer approved this exact store listing."));
  else if (listing) customerMustConfirm.push(row("listing-approval", "Customer listing approval", "customer_must_confirm", "Review the generated listing and approve it before preparing a store request.", { blocking: true }));

  const customerFieldBlockers = customerMustConfirm.filter((item) => item.id !== "listing-approval");
  const systemBlockers = aiCanPrepare.filter((item) => item.blocking);
  const readyForReview = Boolean(listing) && customerFieldBlockers.length === 0 && systemBlockers.length === 0;
  const readyForSubmissionPreparation = readyForReview && customerApproved;
  const readinessItems = [...prepared, ...aiCanPrepare, ...customerMustConfirm, ...externalActions];

  return {
    version: PUBLISHING_READINESS_VERSION,
    detectedCapabilities,
    assetEvidence,
    answers,
    readinessItems,
    groups: { prepared, aiCanPrepare, customerMustConfirm, externalActions },
    counts: { prepared: prepared.length, aiCanPrepare: aiCanPrepare.length, customerMustConfirm: customerMustConfirm.length, externalActions: externalActions.length },
    readyForReview,
    readyForSubmissionPreparation,
    readyForOfficialSubmission: false,
    customerApproved,
    officialSubmissionState: "not_submitted",
    productionHold: true,
  };
}
