import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const read=p=>fs.readFileSync(path.join(root,p),'utf8');

const layout=read('app/layout.js');
const homeCss=read('app/home-big-moon-valley.css');
const engine=read('app/components/AdaptiveWallpaperEngine.js');
const presets=read('lib/design/wallpaper-presets.js');
const home=read('app/page.js');
const asset=read('public/big-moon-valley.svg');

assert.match(layout,/import "\.\/home-big-moon-valley\.css";/,'Big Moon Valley final CSS must remain imported');
assert.match(layout,/href="\/big-moon-valley\.svg"/,'Big Moon Valley must remain the first-paint preload');
assert.match(homeCss,/url\('\/big-moon-valley\.svg'\)/,'Homepage final background must use Big Moon Valley');
assert.match(homeCss,/styleRail button:first-child i/,'Cinematic thumbnail must be aligned with Big Moon Valley');
assert.match(engine,/HOME_SIGNATURE_PRESET="moon-city"/,'Compatibility preset id must stay stable');
assert.match(engine,/function homeSignatureSurface\(/,'Homepage must explicitly identify its signature surface');
assert.match(engine,/!homeSignatureSurface\(\)&&saved/,'A saved wallpaper must not override a fresh homepage visit');
assert.match(engine,/choice==="random"&&\["idea","understand"\]\.includes\(stage\)\?HOME_SIGNATURE_PRESET/,'Idea and understanding stages must resolve to the signature preset');
assert.match(presets,/name:"Big Moon Valley"/,'Moon City compatibility preset must render as Big Moon Valley');
assert.match(presets,/oversized moon/i,'Big Moon Valley preset must retain the oversized moon direction');
assert.match(home,/id:"cinematic"[\s\S]*wallpaper:"moon-city"/,'Cinematic style must keep the Big Moon Valley compatibility wallpaper');
assert.match(asset,/width="1440" height="1100"/,'Signature asset must retain the intended cinematic canvas');
assert.match(asset,/<circle cx="1090" cy="255" r="258"/,'Signature asset must retain the oversized moon');
assert.match(asset,/<path d="M680 1100 C710 1015/,'Signature asset must retain the luminous valley river');

console.log('✓ Big Moon Valley is locked as LANERIQ AI homepage first paint and fresh-session signature scene');
console.log('✓ Saved wallpaper preferences cannot silently replace the homepage signature on reload');
console.log('✓ Cinematic style preview, runtime preset and static first paint remain visually aligned');
