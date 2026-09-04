// Temporary migration debt only. This list may shrink, never grow.
// LANERIQ AI is the only customer-facing identity. Entries remain here solely
// because parallel windows or legacy compatibility surfaces still own cleanup.

export const PUBLIC_IDENTITY_DEBT_VERSION = 1;
export const PUBLIC_IDENTITY_DEBT_BUDGET = 16;

export const PUBLIC_IDENTITY_DEBT = Object.freeze([
  { path:"app/soolen-ai/page.js", owner:"UI", reason:"Legacy operator page and capability consumer pending UI-window cutover." },
  { path:"app/templates/page.js", owner:"UI", reason:"Legacy footer/link copy pending UI-window cleanup." },
  { path:"app/pro/[id]/ProEditTools.js", owner:"UI", reason:"Professional UI compatibility copy pending UI-window cleanup." },
  { path:"app/components/ProductCopyFix.js", owner:"UI", reason:"Legacy product-copy compatibility mapping pending UI-window cleanup." },
  { path:"app/modern-product-theme.css", owner:"UI", reason:"Legacy selector/comment compatibility pending UI-window cleanup." },
  { path:"app/generated-industry-visual-v2.css", owner:"UI", reason:"Legacy generated-visual selector/comment compatibility pending UI-window cleanup." },
  { path:"app/liui-complete-18-page-surface.css", owner:"UI", reason:"Legacy LIUI selector/comment compatibility pending UI-window cleanup." },

  { path:"app/api/media/generate/route.js", owner:"AI_IMAGE_VIDEO", reason:"Customer-facing media error copy pending Creative Media window cleanup." },
  { path:"app/api/images/analyze/route.js", owner:"AI_IMAGE_VIDEO", reason:"Customer-facing vision analysis copy pending Creative Media window cleanup." },
  { path:"app/api/video/projects/route.js", owner:"AI_IMAGE_VIDEO", reason:"Legacy video runtime naming pending Creative Media window cleanup." },
  { path:"lib/soolen/video-engine.js", owner:"AI_IMAGE_VIDEO", reason:"Customer-facing video validation copy pending Creative Media window migration." },

  { path:"app/api/soolenai/voice/route.js", owner:"LEGACY_COMPATIBILITY", reason:"Legacy Voice endpoint retained until canonical consumer telemetry proves retirement safe." },
  { path:"app/api/soolenai/capabilities/route.js", owner:"LEGACY_COMPATIBILITY", reason:"Legacy capability endpoint retained for supported clients during canonical migration." },
  { path:"app/api/admin/soolenai-voice/clone/route.js", owner:"ADMIN_COMPATIBILITY", reason:"Admin-only legacy Voice clone configuration pending Voice migration." },

  { path:"app/api/apps/[id]/publishing-agent/route.js", owner:"APP_BUILDER", reason:"Publishing-agent legacy runtime naming is owned by the App Builder window." },
  { path:"lib/product-brand.js", owner:"UI", reason:"Legacy poweredBy compatibility value pending brand/UI migration." },
]);

export const PUBLIC_IDENTITY_SELECTED_RUNTIME_LIBS = Object.freeze([
  "lib/product-brand.js",
  "lib/soolen/video-engine.js",
]);

export const PUBLIC_IDENTITY_FORBIDDEN_CLEAN_SURFACES = Object.freeze([
  "app/api/chat/route.js",
  "app/api/laneriq/capabilities/route.js",
  "app/api/laneriq/platform/route.js",
  "app/api/laneriq/runtime/status/route.js",
]);

export function publicIdentityDebtByOwner(){
  const result={};
  for(const item of PUBLIC_IDENTITY_DEBT)(result[item.owner]||=[]).push(item.path);
  return result;
}
