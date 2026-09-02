import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const read=p=>fs.readFileSync(path.join(root,p),'utf8');

const layout=read('app/layout.js');
const homeCss=read('app/home-big-moon-valley.css');
const journeyCss=read('app/big-moon-valley-journey.css');
const engine=read('app/components/AdaptiveWallpaperEngine.js');
const presets=read('lib/design/wallpaper-presets.js');
const home=read('app/page.js');
const asset=read('public/big-moon-valley.svg');

assert.match(layout,/import "\.\/home-big-moon-valley\.css";\s*import "\.\/big-moon-valley-journey\.css";/,'Journey continuity CSS must load after the Big Moon Valley homepage authority');
assert.match(layout,/href="\/big-moon-valley\.svg"/,'Big Moon Valley must remain the first-paint preload');
assert.match(homeCss,/url\('\/big-moon-valley\.svg'\)/,'Homepage final background must use Big Moon Valley');
assert.match(homeCss,/styleRail button:first-child i/,'Cinematic thumbnail must be aligned with Big Moon Valley');
assert.match(homeCss,/min-height:clamp\(500px,62svh,720px\)/,'Wide-screen hero must reserve cinematic landscape space');
assert.match(homeCss,/padding:clamp\(170px,26vh,300px\) 0 42px/,'Wide-screen copy must sit below the moon visual zone');
assert.match(homeCss,/width:min\(760px,100%\)/,'Creator controls must stay in a narrower glass column');
assert.match(homeCss,/backdrop-filter:blur\(26px\) saturate\(1\.08\)/,'Desktop creator surfaces must retain premium glass depth');
assert.match(homeCss,/@media\(max-width:520px\)/,'Dedicated phone composition is required');
assert.match(homeCss,/min-height:clamp\(455px,64svh,590px\)/,'Phone hero must preserve a large landscape cover zone');
assert.match(homeCss,/padding:clamp\(260px,42svh,355px\) 2px 26px/,'Phone title must start beneath the moon instead of covering it');
assert.match(homeCss,/env\(safe-area-inset-top\)/,'Phone composition must respect the top safe area');
assert.match(homeCss,/env\(safe-area-inset-bottom\)/,'Phone composition must respect the bottom safe area');

assert.match(journeyCss,/\.premiumHome \.buildProgress\{/,'Build progress must have a dedicated cinematic glass treatment');
assert.match(journeyCss,/\.premiumHome \.journeyPanel\{/,'Planning and Preview must share the cinematic journey panel authority');
assert.match(journeyCss,/min-height:clamp\(560px,72svh,780px\)/,'Desktop journey panel must retain premium vertical presence');
assert.match(journeyCss,/grid-template-columns:repeat\(3,minmax\(0,1fr\)\)/,'Planning page cards must use a structured premium grid');
assert.match(journeyCss,/grid-template-columns:minmax\(300px,\.88fr\) minmax\(340px,1\.12fr\)/,'Preview must use a device-plus-AI-workbench layout');
assert.match(journeyCss,/\.premiumHome \.phoneHero\{[\s\S]*url\('\/big-moon-valley\.svg'\)/,'Preview device hero must carry the Big Moon Valley scene');
assert.match(journeyCss,/margin-top:clamp\(180px,30svh,260px\)/,'Phone Planning and Preview must preserve a visible moon/valley zone before the glass panel');
assert.match(journeyCss,/\.premiumHome \.modify\{display:grid/,'AI modification controls must retain a deliberate responsive layout');
assert.match(journeyCss,/@media\(max-width:520px\)/,'Journey continuity must include dedicated phone rules');

assert.match(engine,/HOME_SIGNATURE_PRESET="moon-city"/,'Compatibility preset id must stay stable');
assert.match(engine,/function homeSignatureSurface\(/,'Homepage must explicitly identify its signature surface');
assert.match(engine,/!homeSignatureSurface\(\)&&saved/,'A saved wallpaper must not override a fresh homepage visit');
assert.match(engine,/choice==="random"&&\["idea","understand"\]\.includes\(stage\)\?HOME_SIGNATURE_PRESET/,'Idea and understanding stages must resolve to the signature preset');
assert.match(presets,/name:"Big Moon Valley"/,'Moon City compatibility preset must render as Big Moon Valley');
assert.match(presets,/oversized moon/i,'Big Moon Valley preset must retain the oversized moon direction');
assert.match(home,/id:"cinematic"[\s\S]*wallpaper:"moon-city"/,'Cinematic style must keep the Big Moon Valley compatibility wallpaper');
assert.match(home,/screen==="plan"&&<section className="journeyPanel"/,'Plan state must remain attached to the shared journey panel');
assert.match(home,/screen==="preview"&&<section className="journeyPanel"/,'Preview state must remain attached to the shared journey panel');
assert.match(asset,/width="1440" height="1100"/,'Signature asset must retain the intended cinematic canvas');
assert.match(asset,/<circle cx="1090" cy="255" r="258"/,'Signature asset must retain the oversized moon');
assert.match(asset,/<path d="M680 1100 C710 1015/,'Signature asset must retain the luminous valley river');

console.log('✓ Big Moon Valley is locked as LANERIQ AI homepage first paint and fresh-session signature scene');
console.log('✓ Homepage composition protects the moon/valley visual zone and moves the glass creator console below it');
console.log('✓ Planning, Build Progress and Preview now remain inside the Big Moon Valley cinematic glass system');
console.log('✓ Preview device carries the signature landscape while AI modification stays a separate premium workbench');
console.log('✓ Phone journey screens preserve the moon/valley view before presenting the workflow panel');
