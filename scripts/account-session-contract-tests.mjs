import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const safetySource=read('lib/auth/session-safety.js');
const safety=await import(`data:text/javascript;base64,${Buffer.from(safetySource).toString('base64')}`);
const sessionEngine=read('lib/auth/laneriq-session.js');
const sessionRoute=read('app/api/auth/session/route.js');
const account=read('app/components/AccountNav.js');
const authGuard=read('app/components/AuthFlowGuard.js');
const authPage=read('app/auth/page.js');
const supabaseProxy=read('lib/supabase/proxy.js');
const rootProxy=read('proxy.js');

const {
  PRIVATE_SESSION_STORAGE_KEYS,
  PUBLIC_DISCOVERY_PATHS,
  safeInternalNext,
  normalizeReferralCode,
  clearPrivateSessionStorage,
  protectedReturnPath,
  isPublicAccountPath,
  SESSION_SAFETY_LIMITS,
}=safety;

assert.equal(SESSION_SAFETY_LIMITS.MAX_NEXT_LENGTH,2048);
assert.equal(safeInternalNext('/my-apps?tab=recent#top'),'/my-apps?tab=recent#top');
assert.equal(safeInternalNext('/app-dashboard/abc?view=versions'),'/app-dashboard/abc?view=versions');
assert.equal(safeInternalNext('https://evil.example/steal'),'/');
assert.equal(safeInternalNext('//evil.example/steal'),'/');
assert.equal(safeInternalNext('/\\evil.example/steal'),'/');
assert.equal(safeInternalNext('javascript:alert(1)'),'/');
assert.equal(safeInternalNext('/auth?next=/my-apps'),'/');
assert.equal(safeInternalNext('/auth/callback?next=/my-apps'),'/');
assert.equal(safeInternalNext('/my-apps\nSet-Cookie:x'),'/');
assert.equal(safeInternalNext('/'+ 'a'.repeat(3000)),'/');
assert.equal(protectedReturnPath('/app-dashboard/abc','?tab=data'),'/app-dashboard/abc?tab=data');

assert.equal(normalizeReferralCode(' ab12cd34ef '),'AB12CD34EF');
assert.equal(normalizeReferralCode('abc-123'),'');
assert.equal(normalizeReferralCode('<script>'),'');
assert.equal(normalizeReferralCode('A'.repeat(33)),'');

assert.ok(PRIVATE_SESSION_STORAGE_KEYS.includes('soolenAppIdea'));
assert.ok(PRIVATE_SESSION_STORAGE_KEYS.includes('soolenReferenceAnalysis'));
assert.ok(PRIVATE_SESSION_STORAGE_KEYS.includes('soolenPendingAssetIds'));
assert.ok(PRIVATE_SESSION_STORAGE_KEYS.includes('soolenInspirationTemplate'));
assert.ok(PRIVATE_SESSION_STORAGE_KEYS.includes('soolenAnalyticsSession'));
assert.ok(!PRIVATE_SESSION_STORAGE_KEYS.includes('laneriq-language'),'Language preference must survive logout.');
const removed=[];
clearPrivateSessionStorage({removeItem:key=>removed.push(key)});
assert.deepEqual(removed,[...PRIVATE_SESSION_STORAGE_KEYS]);

assert.equal(isPublicAccountPath('/'),true);
assert.equal(isPublicAccountPath('/templates'),true);
assert.equal(isPublicAccountPath('/templates/tpl-0001-x'),true);
assert.equal(isPublicAccountPath('/auth'),true);
assert.equal(isPublicAccountPath('/auth/help'),true);
assert.equal(isPublicAccountPath('/api/soolenai/capabilities'),true,'Capability discovery must return JSON before sign-in instead of redirecting to /auth.');
assert.equal(isPublicAccountPath('/robots.txt'),true,'robots.txt must never redirect to authentication.');
assert.equal(isPublicAccountPath('/sitemap.xml'),true,'sitemap.xml must never redirect to authentication.');
assert.equal(PUBLIC_DISCOVERY_PATHS.length,8,'The eight canonical SEO landing pages must stay explicit and bounded.');
for(const discoveryPath of PUBLIC_DISCOVERY_PATHS)assert.equal(isPublicAccountPath(discoveryPath),true,`${discoveryPath} must remain publicly crawlable.`);
assert.equal(isPublicAccountPath('/my-apps'),false);
assert.equal(isPublicAccountPath('/studio'),false);
assert.equal(isPublicAccountPath('/app-dashboard/abc'),false);
assert.equal(isPublicAccountPath('/api/apps'),false);
assert.equal(isPublicAccountPath('/api/apps/abc'),false);
assert.equal(isPublicAccountPath('/authentication-secret'),false,'Auth prefix must not accidentally make unrelated routes public.');
assert.equal(isPublicAccountPath('/ai-app-builder/private'),false,'Public SEO routes must be exact paths, not broad prefixes.');

// LANERIQ owns the primary browser session contract.
assert.match(sessionEngine,/LANERIQ_SESSION_COOKIE="laneriq_session"/);
assert.match(sessionEngine,/LANERIQ_SESSION_MODE_COOKIE="laneriq_session_mode"/);
assert.match(sessionEngine,/crypto\.randomBytes\(32\)\.toString\("base64url"\)/);
assert.match(sessionEngine,/createHmac\("sha256"/);
assert.match(sessionEngine,/httpOnly:true/);
assert.match(sessionEngine,/sameSite:"lax"/);
assert.match(sessionEngine,/laneriq_create_session/);
assert.match(sessionEngine,/laneriq_validate_session/);
assert.match(sessionEngine,/laneriq_revoke_session/);
assert.match(sessionEngine,/infrastructureFailuresFailClosed:true/);

// Proxy canonicalizes return paths, validates LANERIQ first, and only then permits the temporary legacy bridge.
assert.match(supabaseProxy,/session-safety\.js/);
const authCanonicalIndex=supabaseProxy.indexOf('if (pathname === "/auth")');
const publicIndex=supabaseProxy.indexOf('if (isPublicAccountPath(pathname))');
assert.ok(authCanonicalIndex>=0&&publicIndex>authCanonicalIndex,'Auth next canonicalization must run before public-route return.');
assert.match(supabaseProxy,/safeInternalNext\(rawNext\)/);
assert.match(supabaseProxy,/protectedReturnPath\(request\.nextUrl\.pathname, request\.nextUrl\.search\)/);
assert.match(supabaseProxy,/url\.search = ""/);
assert.match(supabaseProxy,/const isApiRequest = pathname === "\/api" \|\| pathname\.startsWith\("\/api\/"\)/);
assert.match(supabaseProxy,/function apiAuthFailure/);
assert.match(supabaseProxy,/function apiSessionUnavailable/);
assert.match(supabaseProxy,/AUTHENTICATION_REQUIRED/);
assert.match(supabaseProxy,/AUTH_NOT_CONFIGURED/);
assert.match(supabaseProxy,/SESSION_NOT_READY/);
assert.match(supabaseProxy,/status: 503/);
assert.match(supabaseProxy,/X-Content-Type-Options", "nosniff/);
assert.match(supabaseProxy,/Vary", "Cookie"/);
assert.match(supabaseProxy,/validateLaneriqSessionToken\(laneriqToken\)/);
assert.match(supabaseProxy,/isLaneriqPrimarySessionMode\(laneriqMode\)/);
assert.match(supabaseProxy,/supabase\.auth\.getUser\(\)/);
assert.doesNotMatch(supabaseProxy,/supabase\.auth\.getSession\(\)/);
assert.match(supabaseProxy,/Cache-Control", "private, no-store, max-age=0/);
assert.match(supabaseProxy,/Pragma", "no-cache/);
const laneriqIndex=supabaseProxy.indexOf('validateLaneriqSessionToken(laneriqToken)');
const markerIndex=supabaseProxy.indexOf('isLaneriqPrimarySessionMode(laneriqMode)');
const legacyIndex=supabaseProxy.indexOf('supabase.auth.getUser()');
assert.ok(laneriqIndex>=0&&markerIndex>laneriqIndex&&legacyIndex>markerIndex,'LANERIQ validation and stale-cookie marker must precede any legacy compatibility check.');
assert.match(rootProxy,/updateSession\(request\)/);
assert.match(rootProxy,/matcher/);

// Exact session endpoint is provider-opaque and mutation actions are same-origin JSON only.
assert.match(sessionRoute,/sessionAuthority:"laneriq"/);
assert.match(sessionRoute,/compatibilityBridge:"legacy_data_access_transition"/);
assert.doesNotMatch(sessionRoute,/compatibilityBridge:"supabase/i);
assert.match(sessionRoute,/sameOrigin\(request\)/);
assert.match(sessionRoute,/JSON_REQUIRED/);
assert.match(sessionRoute,/upgrade_verified_compatibility/);
assert.match(sessionRoute,/requireFreshSignIn:true/);
assert.match(sessionRoute,/FRESH_VERIFICATION_REQUIRED/);
assert.match(sessionRoute,/SESSION_REVOKE_UNAVAILABLE/);
const revokeIndex=sessionRoute.indexOf('revoked=await revokeLaneriqSessionToken(token)');
const clearIndex=sessionRoute.indexOf('response.cookies.set(LANERIQ_SESSION_COOKIE,"",laneriqSessionClearCookieOptions())');
assert.ok(revokeIndex>=0&&clearIndex>revokeIndex,'Logout must confirm authoritative revoke before clearing the primary token.');

// Auth guard no longer trusts provider auth listeners as primary session truth.
assert.match(authGuard,/normalizeReferralCode, safeInternalNext/);
assert.match(authGuard,/window\.history\.replaceState/);
assert.match(authGuard,/rawNext && rawNext !== next/);
assert.match(authGuard,/originalFetch\("\/api\/auth\/session"/);
assert.match(authGuard,/window\.location\.replace\(next\)/);
assert.match(authGuard,/window\.__LANERIQ_AUTH_FLOW_BUSY__ === true/);
assert.match(authGuard,/window\.addEventListener\("pageshow"/);
assert.match(authGuard,/document\.addEventListener\("visibilitychange"/);
assert.doesNotMatch(authGuard,/supabase\.auth\./);
assert.doesNotMatch(authGuard,/window\.location\.assign\(next\)/);

// Auth page independently sanitizes navigation and requires LANERIQ Session success.
assert.match(authPage,/safeInternalNext\(searchParams\.get\("next"\)\)/);
assert.match(authPage,/normalizeReferralCode\(searchParams\.get\("ref"\)\)/);
assert.match(authPage,/router\.replace\(next\)/);
assert.match(authPage,/readLaneriqSession\(\)/);
assert.match(authPage,/data\?\.sessionAuthority !== "laneriq"/);
assert.match(authPage,/upgradeVerifiedCompatibilitySession\(\)/);
assert.match(authPage,/action:\s*"upgrade_verified_compatibility"/);
assert.doesNotMatch(authPage,/verifyOtp\(\{ email:/);
assert.match(authPage,/supabase\.auth\.verifyOtp\(\{ phone:/);
assert.match(authPage,/window\.__LANERIQ_AUTH_FLOW_BUSY__ = true/);
assert.doesNotMatch(authPage,/const next = searchParams\.get\("next"\) \|\| "\/"/);

// Account chrome/logout uses LANERIQ Session API; old identity is display-only enrichment.
assert.match(account,/fetch\("\/api\/auth\/session"/);
assert.match(account,/session\?\.sessionAuthority !== "laneriq"/);
assert.match(account,/body: JSON\.stringify\(\{ action: "logout" \}\)/);
assert.match(account,/clearPrivateSessionStorage\(window\.sessionStorage\)/);
assert.match(account,/window\.location\.replace\("\/auth"\)/);
assert.doesNotMatch(account,/window\.location\.assign\("\/auth"\)/);
assert.match(account,/Sign out did not complete\. Your session is still active/);
assert.match(account,/compatibilityClient\.auth\.getUser\(\)/);
assert.doesNotMatch(account,/auth\.signOut\(/);
assert.doesNotMatch(account,/auth\.onAuthStateChange/);
assert.match(account,/window\.addEventListener\("pageshow"/);
assert.match(account,/document\.addEventListener\("visibilitychange"/);
assert.match(account,/redirectSignedOutProtectedPage/);
assert.match(account,/isPublicAccountPath\(window\.location\.pathname\)/);

console.log('✓ Return-path sanitizer blocks external, protocol-relative, backslash, auth-loop, control-character and oversized redirects');
console.log('✓ LANERIQ Session is primary in Proxy/Auth/Account flows; the old identity is a bounded transitional data-access bridge');
console.log('✓ Protected API/session outages fail closed with no-store JSON semantics instead of being misreported as signed-out');
console.log('✓ robots, sitemap, capability discovery and the eight canonical SEO landing pages remain explicit public routes');
console.log('✓ Protected responses are no-store and signed-out BFCache/tab restores are revalidated client-side');
console.log('✓ Logout revokes LANERIQ authority before cookie clearing and stale compatibility cookies cannot resurrect the browser');
console.log('✓ WhatsApp compatibility can upgrade only through the explicit fresh-verification path');
