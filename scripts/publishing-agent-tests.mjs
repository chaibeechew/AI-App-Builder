import assert from "node:assert/strict";
import { buildPublishingReadiness, detectPublishingCapabilities, inspectStoreAssets, PUBLISHING_READINESS_VERSION } from "../lib/publishing/readiness.js";

const specification = {
  name: "Field Companion",
  description: "A mobile field app",
  pages: [
    { name: "Scan", description: "Use the camera to scan a document and use voice input through the microphone." },
    { name: "Nearby", description: "Use the current location to show nearby places." },
    { name: "Upload", description: "Select a photo from the photo library." },
    { name: "Alerts", description: "Send push notifications for appointment reminders." },
  ],
};

assert.deepEqual(detectPublishingCapabilities(specification).map((item) => item.id), ["camera", "microphone", "location", "photos", "notifications"]);

const assets = [
  { id: "icon-1", file_name: "field-companion-app-icon.png", mime_type: "image/png", suggested_role: "app_icon" },
  { id: "shot-1", file_name: "iphone-store-screenshot-1.png", mime_type: "image/png", suggested_role: "store_screenshot" },
];
const evidence = inspectStoreAssets(assets);
assert.equal(evidence.appIcon.prepared, true);
assert.equal(evidence.storeScreenshots.prepared, true);

const listing = {
  customer_approved_at: "2026-09-01T00:00:00.000Z",
  apple: {
    name: "Field Companion",
    description: "A safe field workflow.",
    privacyUrl: "https://example.com/privacy",
    supportUrl: "https://example.com/support",
    termsUrl: "https://example.com/terms",
    ageRating: "General audience; official store questionnaire still required",
    loginRequired: true,
    reviewAccessReady: true,
    permissionDisclosures: {
      camera: "Scan a customer-selected field document.",
      microphone: "Convert customer-triggered voice notes to text.",
      location: "Show nearby places only after the customer requests it.",
      photos: "Attach a customer-selected image to a record.",
      notifications: "Send reminders the customer explicitly enables.",
    },
  },
  google_play: {
    title: "Field Companion",
    fullDescription: "A safe field workflow.",
    contactEmail: "support@example.com",
    privacyPolicyUrl: "https://example.com/privacy",
    termsUrl: "https://example.com/terms",
    audienceSummary: "Field service professionals aged 18+",
  },
};

const ready = buildPublishingReadiness({ specification, listing, assets, buildQuality: { overall: 100, passed: true }, visualQuality: { score: 100, passed: true } });
assert.equal(ready.version, PUBLISHING_READINESS_VERSION);
assert.equal(ready.readyForReview, true);
assert.equal(ready.readyForSubmissionPreparation, true);
assert.equal(ready.readyForOfficialSubmission, false);
assert.equal(ready.officialSubmissionState, "not_submitted");
assert.equal(ready.groups.customerMustConfirm.length, 0);

const incomplete = buildPublishingReadiness({
  specification,
  listing: { apple: { name: "Field Companion" }, google_play: { title: "Field Companion", contactEmail: "not-an-email" } },
  assets: [],
  buildQuality: { overall: 100, passed: true },
  visualQuality: { score: 100, passed: true },
});
assert.equal(incomplete.readyForReview, false);
assert.equal(incomplete.readyForSubmissionPreparation, false);
assert.equal(incomplete.groups.customerMustConfirm.some((item) => item.id === "permission-camera"), true);
assert.equal(incomplete.groups.customerMustConfirm.some((item) => item.id === "terms-url"), true);
assert.equal(incomplete.groups.aiCanPrepare.some((item) => item.id === "app-icon"), true);
assert.equal(incomplete.groups.aiCanPrepare.some((item) => item.id === "store-screenshots"), true);
assert.equal(incomplete.productionHold, true);

console.log("✓ Publishing Agent detects Camera, Microphone, Location, Photos and Notifications usage");
console.log("✓ Store readiness separates prepared, AI-can-prepare, customer-confirm and external actions");
console.log("✓ App Icon and Store Screenshots require dedicated verifiable assets");
console.log("✓ Official submission is never claimed and Production remains held");
