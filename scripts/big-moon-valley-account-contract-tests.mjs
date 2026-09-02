import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const read=p=>fs.readFileSync(path.join(root,p),'utf8');

const layout=read('app/layout.js');
const css=read('app/big-moon-valley-account.css');
const auth=read('app/auth/page.js');
const authCss=read('app/auth/auth.css');
const projects=read('app/my-apps/page.js');

const projectRoot='main.page:has(>header .owner)';
const allowedRoots=['.authPage','.loadingScreen',projectRoot];

assert.match(layout,/import "\.\/big-moon-valley-workspace\.css";\s*import "\.\/big-moon-valley-account\.css";/,'Account shell must load after the workspace shell');
assert.match(css,/url\('\/big-moon-valley\.svg'\)/,'Account shell must use the Big Moon Valley signature scene');
assert.match(css,/padding-top:clamp\(145px,20svh,235px\)/,'Desktop Auth must preserve a cinematic landscape zone');
assert.match(css,/padding-top:clamp\(150px,22svh,250px\)/,'Desktop My Projects must preserve a cinematic landscape zone');
assert.match(css,/padding-top:clamp\(205px,33svh,285px\)/,'Phone My Projects must preserve a larger signature zone');
assert.match(css,/env\(safe-area-inset-top\)/,'Account shell must respect the iPhone top safe area');
assert.match(css,/env\(safe-area-inset-bottom\)/,'Account shell must respect the iPhone bottom safe area');
assert.match(css,/font-size:16px!important/,'Auth inputs must retain iPhone-safe input sizing');
assert.match(css,/min-height:48px!important/,'Primary account actions must retain mobile-friendly touch targets');
assert.match(css,/backdrop-filter:blur\(30px\) saturate\(1\.09\)/,'Auth card must retain premium glass depth');
assert.match(css,/@media\(max-width:520px\)/,'Dedicated phone account composition is required');
assert.match(css,/@media\(prefers-reduced-motion:reduce\)/,'Account shell must respect reduced-motion preference');

const clean=css.replace(/\/\*[\s\S]*?\*\//g,'');
assert.ok(!clean.includes('/a/'),'Account visual CSS must never target generated App routes');
assert.ok(!clean.includes('/website/'),'Account visual CSS must never target generated Website routes');
let selectorCount=0;
for(const match of clean.matchAll(/([^{}]+)\{/g)){
  const header=match[1].trim();
  if(!header||header.startsWith('@'))continue;
  for(const selector of header.split(',')){
    const s=selector.trim();
    selectorCount+=1;
    assert.ok(allowedRoots.some(root=>s.startsWith(root)),`Unscoped selector is forbidden in account shell: ${s}`);
  }
}
assert.ok(selectorCount>=70,'Account selector scope check must cover the full Auth/My Projects visual layer');

assert.match(auth,/const WHATSAPP_AUTH_ENABLED = process\.env\.NEXT_PUBLIC_WHATSAPP_AUTH_ENABLED === "true";/,'WhatsApp must be controlled by the dedicated environment flag');
assert.match(auth,/if \(value === "whatsapp" && !WHATSAPP_AUTH_ENABLED\) return;/,'Unconfigured WhatsApp must remain non-selectable');
assert.match(auth,/disabled=\{!WHATSAPP_AUTH_ENABLED\}/,'WhatsApp tab must fail closed until the Meta + Auth Hook path is ready');
assert.match(auth,/WHATSAPP_AUTH_ENABLED \? "READY" : "SETUP"/,'WhatsApp status must be explicit');
assert.match(auth,/Email Code/,'Email Code must remain available');
assert.match(auth,/WhatsApp Code/,'WhatsApp Code must be the only phone verification option');
assert.doesNotMatch(auth,/<strong>SMS Code<\/strong>/,'Paid SMS must not remain as a customer verification option');
assert.doesNotMatch(auth,/process\.env\.NEXT_PUBLIC_SMS_AUTH_ENABLED|const\s+SMS_AUTH_ENABLED\s*=/,'Retired SMS feature flag must never be active');
assert.doesNotMatch(auth,/switchMethod\("sms"\)/,'Retired SMS method must not be selectable');
assert.match(auth,/No paid SMS fallback is used/,'Auth UI must explicitly forbid paid SMS fallback');
assert.match(auth,/supabase\.auth\.signInWithOtp\(\{ email, options \}\)/,'Email OTP send path must remain intact');
assert.match(auth,/supabase\.auth\.signInWithOtp\(\{ phone, options \}\)/,'WhatsApp uses Supabase phone OTP only as the secure OTP/session authority');
assert.match(auth,/supabase\.auth\.verifyOtp\(\{ email: normalizeEmailAddress\(identifier\), token, type: "email" \}\)/,'Email OTP verification path must remain intact');
assert.match(auth,/supabase\.auth\.verifyOtp\(\{ phone: normalizePhoneNumber\(identifier\), token, type: "sms" \}\)/,'Supabase internal phone OTP verification type remains intact for the WhatsApp Auth Hook path');
assert.match(auth,/const \{ data: trustedUserData, error: trustedUserError \} = await supabase\.auth\.getUser\(\)/,'Trusted session user verification must remain intact');
assert.match(auth,/safeInternalNext\(searchParams\.get\("next"\)\)/,'Auth redirect target must remain internally sanitized');
assert.match(authCss,/\.inputWrap input[\s\S]*font-size:16px/,'Base Auth CSS must keep iPhone-safe input sizing even without the shell override');

assert.doesNotMatch(projects,/AI APP BUILDER/,'My Projects must not show the retired AI APP BUILDER brand');
assert.match(projects,/className="eyebrow">LANERIQ AI</,'My Projects must use LANERIQ AI branding');
assert.match(projects,/supabase\.auth\.getUser\(\)/,'My Projects must remain authenticated');
assert.match(projects,/if \(!user\) redirect\("\/auth"\)/,'Unauthenticated My Projects access must still redirect to Auth');
assert.match(projects,/\.eq\("owner_id", user\.id\)/,'My Projects query must remain owner-scoped');
assert.match(projects,/await client\.auth\.signOut\(\); redirect\("\/auth"\)/,'My Projects sign-out must retain the existing session close flow');
assert.match(projects,/href=\{`\/a\/\$\{app\.id\}\?demo=1`\}/,'Generated App demo navigation must remain separate from LANERIQ shell styling');
assert.match(projects,/href=\{`\/website\/\$\{app\.id\}`\}/,'Generated Website navigation must remain separate from LANERIQ shell styling');

console.log('✓ Big Moon Valley now carries through LANERIQ Auth and authenticated My Projects shells');
console.log(`✓ ${selectorCount} account-shell selectors are scoped only to Auth/loading/My Projects roots`);
console.log('✓ Email Code + WhatsApp Code are the only customer verification choices; paid SMS fallback is removed');
console.log('✓ Trusted session verification, safe redirects, owner filtering and sign-out contracts remain intact');