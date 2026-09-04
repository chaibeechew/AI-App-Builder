// Temporary migration debt only. This list may shrink, never grow after this
// runner-verified baseline. LANERIQ AI is the only customer-facing identity.
// Entries remain here solely because parallel windows or legacy compatibility
// surfaces still own cleanup.

export const PUBLIC_IDENTITY_DEBT_VERSION = 2;
export const PUBLIC_IDENTITY_DEBT_BASELINE = 36;
export const PUBLIC_IDENTITY_DEBT_BUDGET = 36;

export const PUBLIC_IDENTITY_DEBT = Object.freeze([
  // Admin / legacy compatibility.
  { path:"app/api/admin/soolenai-voice/clone/route.js", owner:"ADMIN_COMPATIBILITY", reason:"Admin-only legacy Voice clone identity pending Voice migration." },
  { path:"app/api/soolenai/voice/route.js", owner:"LEGACY_COMPATIBILITY", reason:"Legacy Voice endpoint retained until canonical consumer telemetry proves retirement safe." },

  // App Builder / product workflow surfaces.
  { path:"app/api/apps/[id]/publishing-agent/route.js", owner:"APP_BUILDER", reason:"Publishing-agent legacy runtime identity is owned by the App Builder window." },
  { path:"app/api/modify/route.js", owner:"APP_BUILDER", reason:"Modify-flow public runtime copy is owned by the App Builder window." },
  { path:"app/create/page.js", owner:"APP_BUILDER", reason:"Create-flow UI identity is owned by the App Builder window." },
  { path:"app/database/[id]/page.js", owner:"APP_BUILDER", reason:"Generated-project database surface is owned by the App Builder window." },
  { path:"app/game-builder/page.js", owner:"APP_BUILDER", reason:"Game-builder product surface is owned by the App Builder window." },
  { path:"app/game-e2e-lab/page.js", owner:"APP_BUILDER", reason:"Generated-game E2E surface is owned by the App Builder window." },
  { path:"app/monetization/[id]/page.js", owner:"APP_BUILDER", reason:"Generated-project monetization surface is owned by the App Builder window." },
  { path:"app/publish/[id]/PublishingReadinessPanel.js", owner:"APP_BUILDER", reason:"Publish readiness copy is owned by the App Builder window." },
  { path:"app/publish/[id]/page.js", owner:"APP_BUILDER", reason:"Publish flow identity is owned by the App Builder window." },
  { path:"app/release/[id]/page.js", owner:"APP_BUILDER", reason:"Release flow identity is owned by the App Builder window." },
  { path:"app/workflows/[id]/page.js", owner:"APP_BUILDER", reason:"Generated-project workflow surface is owned by the App Builder window." },

  // AI Image / Video / media surfaces.
  { path:"app/api/images/analyze/route.js", owner:"AI_IMAGE_VIDEO", reason:"Customer-facing vision analysis copy pending Creative Media window cleanup." },
  { path:"app/api/media/generate/route.js", owner:"AI_IMAGE_VIDEO", reason:"Customer-facing media generation copy pending Creative Media window cleanup." },
  { path:"app/api/video/projects/route.js", owner:"AI_IMAGE_VIDEO", reason:"Video-project runtime identity pending Creative Media window cleanup." },
  { path:"app/api/video/storyboard/route.js", owner:"AI_IMAGE_VIDEO", reason:"Storyboard runtime identity pending Creative Media window cleanup." },
  { path:"app/avatar-studio/page.js", owner:"AI_IMAGE_VIDEO", reason:"Avatar Studio product identity is owned by the Creative Media window." },
  { path:"app/demo-video/page.js", owner:"AI_IMAGE_VIDEO", reason:"Demo-video product identity is owned by the Creative Media window." },
  { path:"app/media-studio/page.js", owner:"AI_IMAGE_VIDEO", reason:"Media Studio product identity is owned by the Creative Media window." },
  { path:"app/video-studio/page.js", owner:"AI_IMAGE_VIDEO", reason:"Video Studio product identity is owned by the Creative Media window." },
  { path:"app/vision/page.js", owner:"AI_IMAGE_VIDEO", reason:"Vision product identity is owned by the Creative Media window." },
  { path:"lib/soolen/video-engine.js", owner:"AI_IMAGE_VIDEO", reason:"Customer-facing video validation copy pending Creative Media window migration." },

  // UI / LIUI / brand surfaces.
  { path:"app/app-dashboard/[id]/page.js", owner:"UI", reason:"Dashboard identity cleanup belongs to the UI window." },
  { path:"app/components/ProductCopyFix.js", owner:"UI", reason:"Legacy product-copy compatibility mapping pending UI-window cleanup." },
  { path:"app/generated-industry-visual-v2.css", owner:"UI", reason:"Legacy generated-visual selector/comment compatibility pending UI-window cleanup." },
  { path:"app/landing/page.js", owner:"UI", reason:"Landing-page identity cleanup belongs to the UI window." },
  { path:"app/liui-complete-18-page-surface.css", owner:"UI", reason:"Legacy LIUI selector/comment compatibility pending UI-window cleanup." },
  { path:"app/modern-product-theme.css", owner:"UI", reason:"Legacy selector/comment compatibility pending UI-window cleanup." },
  { path:"app/my-apps/page.js", owner:"UI", reason:"My Apps public product copy cleanup belongs to the UI window." },
  { path:"app/page.js", owner:"UI", reason:"Root customer-facing product identity cleanup belongs to the UI window." },
  { path:"app/pro/[id]/ProEditTools.js", owner:"UI", reason:"Professional UI compatibility copy pending UI-window cleanup." },
  { path:"app/pro/[id]/page.js", owner:"UI", reason:"Professional project UI identity cleanup belongs to the UI window." },
  { path:"app/soolen-ai/page.js", owner:"UI", reason:"Legacy operator page and capability consumer pending UI-window cutover." },
  { path:"app/templates/page.js", owner:"UI", reason:"Legacy template/footer copy pending UI-window cleanup." },
  { path:"lib/product-brand.js", owner:"UI", reason:"Legacy poweredBy compatibility value pending brand/UI migration." },
]);

export const PUBLIC_IDENTITY_SELECTED_RUNTIME_LIBS = Object.freeze([
  "lib/product-brand.js",
  "lib/soolen/video-engine.js",
]);

export const PUBLIC_IDENTITY_FORBIDDEN_CLEAN_SURFACES = Object.freeze([
  "app/api/chat/route.js",
  "app/api/soolenai/capabilities/route.js",
  "app/api/laneriq/capabilities/route.js",
  "app/api/laneriq/platform/route.js",
  "app/api/laneriq/runtime/status/route.js",
]);

export function publicIdentityDebtByOwner(){
  const result={};
  for(const item of PUBLIC_IDENTITY_DEBT)(result[item.owner]||=[]).push(item.path);
  return result;
}
