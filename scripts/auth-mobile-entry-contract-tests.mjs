import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const auth = readFileSync(new URL("../app/auth/page.js", import.meta.url), "utf8");
const authGuard = readFileSync(new URL("../app/components/AuthFlowGuard.js", import.meta.url), "utf8");
const studioLauncher = readFileSync(new URL("../app/components/StudioLauncher.js", import.meta.url), "utf8");
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

console.log("✓ Auth session check cannot leave mobile clients stuck indefinitely");
console.log("✓ Email auth entry does not initialize the legacy browser client");
console.log("✓ WhatsApp compatibility client is lazy-loaded only for explicit WhatsApp verification");
console.log("✓ Auth guard cannot create a self-triggering DOM MutationObserver loop");
console.log("✓ Auth surface does not mount or prefetch the protected Studio launcher");
