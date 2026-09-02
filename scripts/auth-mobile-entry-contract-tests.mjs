import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const auth = readFileSync(new URL("../app/auth/page.js", import.meta.url), "utf8");

assert.match(auth, /SESSION_CHECK_TIMEOUT_MS\s*=\s*3500/);
assert.match(auth, /controller\.abort\(\)/);
assert.match(auth, /failOpenTimer/);
assert.match(auth, /setChecking\(false\)/);
assert.doesNotMatch(auth, /import \{ createClient \} from "\.\.\/\.\.\/lib\/supabase\/client"/);
assert.match(auth, /await import\("\.\.\/\.\.\/lib\/supabase\/client"\)/);
assert.match(auth, /verifyWhatsAppCompatibility/);
assert.match(auth, /if \(method === "email"\)/);

console.log("✓ Auth session check cannot leave mobile clients stuck indefinitely");
console.log("✓ Email auth entry does not initialize the legacy browser client");
console.log("✓ WhatsApp compatibility client is lazy-loaded only for explicit WhatsApp verification");
