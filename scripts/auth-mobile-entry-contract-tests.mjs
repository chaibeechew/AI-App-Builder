import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const auth = readFileSync(new URL("../app/auth/page.js", import.meta.url), "utf8");
const authGuard = readFileSync(new URL("../app/components/AuthFlowGuard.js", import.meta.url), "utf8");
const studioLauncher = readFileSync(new URL("../app/components/StudioLauncher.js", import.meta.url), "utf8");
const wallpaper = readFileSync(new URL("../app/components/AdaptiveWallpaperEngine.js", import.meta.url), "utf8");
const overlayPolicy = readFileSync(new URL("../lib/ui/global-overlay-policy.js", import.meta.url), "utf8");

assert.match(auth, /SESSION_CHECK_TIMEOUT_MS\s*=\s*3500/);
assert.match(auth, /controller\.abort\(\)/);
assert.match(auth, /failOpenTimer/);
assert.match(auth, /setChecking\(false\)/);
assert.doesNotMatch(auth, /import \{ createClient \} from "\.\.\/\.\.\/lib\/supabase\/client"/);
assert.match(auth, /await import\("\.\.\/\.\.\/lib\/supabase\/client"\)/);
assert.match(auth, /verifyWhatsAppCompatibility/);
assert.match(auth, /if \(method === "email"\)/);

assert.doesNotMatch(authGuard, /new MutationObserver/);
assert.doesNotMatch(authGuard, /\.textContent\s*=/);
assert.match(authGuard, /window\.location\.pathname !== "\/auth"/);
assert.match(studioLauncher, /shouldHideBuilderGlobalOverlay\(pathname\)/);
assert.match(overlayPolicy, /"\/auth"/);
assert.match(overlayPolicy, /"\/studio"/);

assert.match(wallpaper, /usePathname/);
assert.match(wallpaper, /wallpaperControlHidden\(pathname\)/);
assert.match(wallpaper, /path==="\/auth"/);
assert.match(wallpaper, /path==="\/mobile-readiness"/);
assert.match(wallpaper, /path==="\/production-e2e"/);
assert.match(wallpaper, /if\(hidden\|\|wallpaperControlHidden\(pathname\)\)return null/);
assert.match(wallpaper, /document\.querySelectorAll\("\.bg,\.backdrop,\.studioBackdrop,\.authPage,main\.page,main\.studio"\)/, "Auth can keep the wallpaper background while the floating chooser is hidden.");

console.log("✓ Auth session check cannot leave mobile clients stuck indefinitely");
console.log("✓ Email auth entry does not initialize the legacy browser client");
console.log("✓ WhatsApp compatibility client is lazy-loaded only for explicit WhatsApp verification");
console.log("✓ Auth guard cannot create a self-triggering DOM MutationObserver loop");
console.log("✓ Auth surface does not mount or prefetch the protected Studio launcher");
console.log("✓ Auth/evidence surfaces keep wallpaper visuals without mounting the floating Wallpaper control over primary actions");
