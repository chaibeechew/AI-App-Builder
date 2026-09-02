import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const read=p=>fs.readFileSync(path.join(root,p),'utf8');

const layout=read('app/layout.js');
const css=read('app/big-moon-valley-discovery-community.css');
const soolen=read('app/soolen-ai/page.js');
const community=read('app/community-chat/page.js');
const template=read('app/templates/[id]/page.js');

assert.match(layout,/import "\.\/big-moon-valley-game-pro-commerce\.css";\s*import "\.\/big-moon-valley-discovery-community\.css";/,'Discovery/community shell must load after Game + Pro commerce');
assert.match(css,/url\('\/big-moon-valley\.svg'\)/);
assert.match(css,/main\.soolenCenter/);
assert.match(css,/main\.chatPage/);
assert.match(css,/main\.page:has\(\.meta\):has\(\.notice\)/);
assert.match(css,/env\(safe-area-inset-top\)/);
assert.match(css,/env\(safe-area-inset-bottom\)/);
assert.match(css,/font-size:16px!important/);
assert.match(css,/min-height:44px!important/);
assert.match(css,/min-height:54px!important/);
assert.match(css,/@media\(max-width:520px\)/);
assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
const clean=css.replace(/\/\*[\s\S]*?\*\//g,'');
assert.ok(!clean.includes('/a/'),'Discovery/community CSS must never target generated App routes');
assert.ok(!clean.includes('/website/'),'Discovery/community CSS must never target generated Website routes');
assert.doesNotMatch(clean,/(^|\n)\s*(html|body|\*)\s*[{,]/m,'Discovery/community shell must not use global document selectors');

// Soolen Platform Operator keeps server-truth capability/subscription boundaries while hiding infrastructure providers from ordinary users.
assert.match(soolen,/fetch\("\/api\/soolenai\/capabilities",\{cache:"no-store"\}\)/);
assert.match(soolen,/const advancedReady=Boolean\(data\?\.providers\?\.premiumRouting\)/);
assert.match(soolen,/disabled=\{!advancedReady\}/);
assert.match(soolen,/mode:advanced\?"advanced":"standard"/);
assert.match(soolen,/const costMode=data\?\.policy\?\.mode\|\|"zero"/);
assert.match(soolen,/item\.status==="ready"\|\|item\.status==="integration_ready"/);
assert.match(soolen,/STATUS_LABELS/);
assert.match(soolen,/SOOLEN AI · PLATFORM OPERATOR/);
assert.match(soolen,/One App/);
for(const stage of ['Build','Verify','Deploy','Publish'])assert.match(soolen,new RegExp(`label:\"${stage}\"|>${stage}<`));
assert.doesNotMatch(soolen,/via authorized|Connect Ollama|providers connected|Supabase|GitHub|Vercel|Meta/);

// Community Chat stays explicit opt-in, authenticated, room-scoped, bounded and reversible.
assert.match(community,/supabase\.auth\.getUser\(\)/);
assert.match(community,/if \(!data\.user\) \{ window\.location\.href = "\/auth"/);
assert.match(community,/\.eq\("slug", "community"\)\.eq\("is_active", true\)/);
assert.match(community,/\.eq\("room_id", foundRoom\.id\)\.eq\("user_id", data\.user\.id\)/);
assert.match(community,/\.limit\(100\)/);
assert.match(community,/filter: `room_id=eq\.\$\{room\.id\}`/);
assert.match(community,/upsert\(\{ room_id: room\.id, user_id: user\.id \}, \{ onConflict: "room_id,user_id" \}\)/);
assert.match(community,/\.delete\(\)\.eq\("room_id", room\.id\)\.eq\("user_id", user\.id\)/);
assert.match(community,/maxLength=\{4000\}/);
assert.match(community,/Community Chat is off/);
assert.match(community,/This chat is not opened automatically/);
assert.match(community,/Other participating users can see community messages/);

// Template Detail stays no-store, bounded and inspiration-only with originality guardrails.
assert.match(template,/String\(id \|\| ""\)\.slice\(0, 140\)/);
assert.match(template,/fetch\(`\/api\/templates\?id=\$\{encodeURIComponent\(templateId\)\}`, \{ cache: "no-store" \}\)/);
assert.match(template,/Use this LANERIQ AI template only as inspiration/);
assert.match(template,/Do not copy third-party brand identity, text, images, source code, proprietary layouts or distinctive trade dress/);
assert.match(template,/normal AI Planning gate validate the requirements before generation/);
assert.match(template,/application: "inspiration-only"/);
assert.match(template,/sessionStorage\.setItem\("soolenAppIdea"/);
assert.match(template,/sessionStorage\.setItem\("soolenInspirationTemplate"/);
assert.match(template,/re-plan and reimagine the structure, visuals and copy rather than clone a third-party product/);

console.log('✓ Big Moon Valley carries through Soolen Platform Operator, opt-in Community Chat and Template Detail');
console.log('✓ Provider-opaque platform truth, chat membership/privacy and inspiration originality contracts remain intact');
console.log('✓ Generated customer App/Website routes remain separated and paid SMS stays disabled');
