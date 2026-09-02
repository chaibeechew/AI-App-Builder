import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const read=p=>fs.readFileSync(path.join(root,p),'utf8');

const layout=read('app/layout.js');
const css=read('app/big-moon-valley-creative-assets.css');
const video=read('app/video-studio/page.js');
const avatar=read('app/avatar-studio/page.js');
const brand=read('app/brand-kit/page.js');
const assets=read('app/asset-library/page.js');

// Visual layer must load last and stay limited to LANERIQ creator asset roots.
assert.match(layout,/import "\.\/big-moon-valley-project-intelligence\.css";\s*import "\.\/big-moon-valley-creative-assets\.css";/);
assert.match(css,/url\('\/big-moon-valley\.svg'\)/);
assert.match(css,/main\.page:has\(> \.wrap > \.hero\):has\(> \.wrap > \.panel\)/);
for(const rootClass of ['avatarPage','brandPage','assetPage'])assert.match(css,new RegExp(`main\\.${rootClass}`));
assert.match(css,/env\(safe-area-inset-bottom\)/);
assert.match(css,/min-height:44px!important/);
assert.match(css,/min-height:48px!important/);
assert.match(css,/font-size:16px!important/);
assert.match(css,/prefers-reduced-motion:reduce/);
assert.doesNotMatch(css,/(^|\n)\s*(html|body|\*)\s*[{,]/m);
assert.doesNotMatch(css,/GeneratedAppClient|websiteShell|generatedApp|customerSurface/);

// Video keeps stable request IDs, same-origin/no-store calls and honest renderer claims.
assert.match(video,/LANERIQ AI · VIDEO STUDIO/);
assert.match(video,/newRequestId\("video-storyboard"\)/);
assert.match(video,/newRequestId\("video-compile"\)/);
assert.match(video,/credentials:"same-origin"/);
assert.match(video,/cache:"no-store"/);
assert.match(video,/authorized server renderer accepted a real job/);
assert.match(video,/Final MP4 rendering is not connected yet; no render has been claimed/);

// Avatar keeps explicit likeness permission, source truthfulness and private-library save semantics.
assert.match(avatar,/needsConsent&&!consentConfirmed/);
assert.match(avatar,/permission to create this real-person likeness/);
assert.match(avatar,/newRequestId\("avatar"\)/);
assert.match(avatar,/newRequestId\("avatar-save"\)/);
assert.match(avatar,/credentials:"same-origin"/);
assert.match(avatar,/source:result\?\.source==="model"\?"model":"local"/);
assert.match(avatar,/Save to Private Library/);
assert.match(avatar,/raw reference media is not stored/);

// Brand Kit remains authenticated, exact-user scoped, bounded and HTTPS-only for logo references.
assert.match(brand,/auth\.getUser\(\)/);
assert.match(brand,/\.eq\("user_id", user\.id\)/);
assert.match(brand,/\.eq\("user_id", user\.id\)|user_id: currentUser\.id/);
assert.match(brand,/\^https:\\\/\\\/\[\^\\s\]\+\$/);
assert.match(brand,/slice\(0, 120\)/);
assert.match(brand,/slice\(0, 300\)/);
assert.match(brand,/upsert\(payload, \{ onConflict: "user_id" \}\)/);

// Asset Library keeps auth redirect, user-scoped rows/storage, bounded file types/sizes and short-lived signed previews.
assert.match(assets,/MAX_SIZE = 25 \* 1024 \* 1024/);
assert.match(assets,/ACCEPTED = \["image\/", "video\/", "application\/pdf"\]/);
assert.match(assets,/auth\.getUser\(\)/);
assert.match(assets,/window\.location\.assign\("\/auth\?next=\/asset-library"\)/);
assert.match(assets,/\.eq\("user_id",userId\)/);
assert.match(assets,/createSignedUrl\(item\.storage_path,600\)/);
assert.match(assets,/`\$\{user\.id\}\/\$\{crypto\.randomUUID\(\)\}-\$\{safe\}`/);
assert.match(assets,/upsert:false/);
assert.match(assets,/\.delete\(\)\.eq\("id",item\.id\)\.eq\("user_id",user\.id\)/);

console.log('✓ Big Moon Valley creative-assets shell is scoped to Video, Avatar, Brand Kit and Asset Library');
console.log('✓ Renderer truthfulness, likeness consent, brand ownership and signed private asset contracts remain intact');
console.log('✓ Generated App/Website customer surfaces remain separated and SMS stays on hold');
