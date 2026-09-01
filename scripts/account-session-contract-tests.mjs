import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const safetySource=read('lib/auth/session-safety.js');
const safety=await import(`data:text/javascript;base64,${Buffer.from(safetySource).toString('base64')}`);
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
assert.equal(isPublicAccountPath('/robots.txt'),true,'robots.txt must never redirect to authentication.');
assert.equal(isPublicAccountPath('/sitemap.xml'),true,'sitemap.xml must never redirect to authentication.');
assert.equal(PUBLIC_DISCOVERY_PATHS.length,8,'The eight canonical SEO landing pages must stay explicit and bounded.');
for(const discoveryPath of PUBLIC_DISCOVERY_PATHS)assert.equal(isPublicAccountPath(discoveryPath),true,`${discoveryPath} must remain publicly crawlable.`);
assert.equal(isPublicAccountPath('/my-apps'),false);
assert.equal(isPublicAccountPath('/studio'),false);
assert.equal(isPublicAccountPath('/app-dashboard/abc'),false);
assert.equal(isPublicAccountPath('/api/apps/abc'),false);
assert.equal(isPublicAccountPath('/authentication-secret'),false,'Auth prefix must not accidentally make unrelated routes public.');
assert.equal(isPublicAccountPath('/ai-app-builder/private'),false,'Public SEO routes must be exact paths, not broad prefixes.');

assert.match(supabaseProxy,/session-safety\.js/);
const authCanonicalIndex=supabaseProxy.indexOf('if (pathname === "/auth")');
const publicIndex=supabaseProxy.indexOf('if (isPublicAccountPath(pathname))');
assert.ok(authCanonicalIndex>=0&&publicIndex>authCanonicalIndex,'Auth next canonicalization must run before public-route return.');
assert.match(supabaseProxy,/safeInternalNext\(rawNext\)/);
assert.match(supabaseProxy,/protectedReturnPath\(request\.nextUrl\.pathname, request\.nextUrl\.search\)/);
assert.match(supabaseProxy,/url\.search = ""/);
assert.match(supabaseProxy,/supabase\.auth\.getUser\(\)/);
assert.doesNotMatch(supabaseProxy,/supabase\.auth\.getSession\(\)/);
assert.match(supabaseProxy,/if \(userError \|\| !user\)/);
assert.match(supabaseProxy,/Cache-Control", "private, no-store, max-age=0/);
assert.match(supabaseProxy,/Pragma", "no-cache/);
assert.match(rootProxy,/updateSession\(request\)/);
assert.match(rootProxy,/matcher/);

assert.match(authGuard,/normalizeReferralCode, safeInternalNext/);
assert.match(authGuard,/window\.history\.replaceState/);
assert.match(authGuard,/rawNext && rawNext !== next/);
assert.match(authGuard,/auth\.onAuthStateChange/);
assert.match(authGuard,/subscription\?\.unsubscribe/);
assert.match(authGuard,/window\.location\.replace\(next\)/);
assert.match(authGuard,/supabase\.auth\.getUser\(\)/);
assert.match(authGuard,/window\.__LANERIQ_AUTH_FLOW_BUSY__ === true/);
assert.doesNotMatch(authGuard,/window\.location\.assign\(next\)/);

// Auth page independently sanitizes navigation inputs, trusts the authenticated user with getUser,
// and coordinates with the global guard so referral completion cannot lose the race.
assert.match(authPage,/safeInternalNext\(searchParams\.get\("next"\)\)/);
assert.match(authPage,/normalizeReferralCode\(searchParams\.get\("ref"\)\)/);
assert.match(authPage,/router\.replace\(next\)/);
assert.match(authPage,/supabase\.auth\.getUser\(\)/);
assert.match(authPage,/supabase\.auth\.verifyOtp/);
assert.match(authPage,/window\.__LANERIQ_AUTH_FLOW_BUSY__ = true/);
assert.doesNotMatch(authPage,/const next = searchParams\.get\("next"\) \|\| "\/"/);

assert.match(account,/supabase\.auth\.signOut\(\{ scope: "local" \}\)/);
assert.match(account,/if \(error\) throw error/);
assert.match(account,/clearPrivateSessionStorage\(window\.sessionStorage\)/);
assert.match(account,/window\.location\.replace\("\/auth"\)/);
assert.doesNotMatch(account,/window\.location\.assign\("\/auth"\)/);
assert.match(account,/Sign out did not complete\. Your session is still active/);
assert.match(account,/client\.auth\.getUser\(\)/);
assert.match(account,/auth\.onAuthStateChange/);
assert.match(account,/event === "SIGNED_OUT"/);
assert.match(account,/window\.addEventListener\("pageshow"/);
assert.match(account,/document\.addEventListener\("visibilitychange"/);
assert.match(account,/subscription\?\.unsubscribe/);
assert.match(account,/redirectSignedOutProtectedPage/);
assert.match(account,/isPublicAccountPath\(window\.location\.pathname\)/);

console.log('✓ Return-path sanitizer blocks external, protocol-relative, backslash, auth-loop, control-character and oversized redirects');
console.log('✓ Server proxy canonicalizes /auth next before rendering and protects private routes with fresh Supabase getUser validation');
console.log('✓ robots, sitemap and the eight canonical SEO landing pages remain explicit public discovery routes');
console.log('✓ Protected responses are no-store and signed-out BFCache/tab restores are revalidated client-side');
console.log('✓ Logout is current-session scoped, fail-closed on error, uses history replace and clears private session drafts');
console.log('✓ Auth/account listeners unsubscribe cleanly and OTP flow now coordinates safe redirect ownership');