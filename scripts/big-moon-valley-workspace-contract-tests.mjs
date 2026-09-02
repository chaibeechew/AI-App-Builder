import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const read=p=>fs.readFileSync(path.join(root,p),'utf8');

const layout=read('app/layout.js');
const css=read('app/big-moon-valley-workspace.css');
const editor=read('app/editor/[id]/page.js');
const dashboard=read('app/app-dashboard/[id]/page.js');

const editorRoot='main.page:has(.workspace .assistant)';
const dashboardRoot='main.page:has(.readinessPanel .mainActions)';

assert.match(layout,/import "\.\/big-moon-valley-release\.css";\s*import "\.\/big-moon-valley-workspace\.css";/,'Workspace shell must load after the release shell');
assert.match(editor,/className="workspace"/,'Editor workspace structural signature must remain available');
assert.match(editor,/className="assistant"/,'Editor AI assistant structural signature must remain available');
assert.match(dashboard,/className="readinessPanel"/,'Dashboard readiness structural signature must remain available');
assert.match(dashboard,/className="mainActions"/,'Dashboard action structural signature must remain available');

assert.match(css,/url\('\/big-moon-valley\.svg'\)/,'Workspace shell must use the Big Moon Valley signature scene');
assert.match(css,/padding-top:clamp\(145px,21svh,245px\)/,'Desktop workspace must preserve a moon/valley viewing zone');
assert.match(css,/padding-top:clamp\(205px,33svh,285px\)/,'Phone workspace must preserve a larger signature viewing zone');
assert.match(css,/env\(safe-area-inset-top\)/,'Workspace must respect the iPhone top safe area');
assert.match(css,/env\(safe-area-inset-bottom\)/,'Workspace must respect the iPhone bottom safe area');
assert.match(css,/min-height:48px!important/,'Primary workspace actions must keep mobile-friendly targets');
assert.match(css,/font-size:16px!important/,'Editor instruction textarea must avoid iPhone focus zoom');
assert.match(css,/backdrop-filter:blur\(28px\) saturate\(1\.08\)/,'Editor command surfaces must retain premium glass depth');
assert.match(css,/position:sticky!important/,'Wide Editor AI assistant must remain a usable sticky workbench');
assert.match(css,/@media\(max-width:520px\)/,'Dedicated phone workspace composition is required');
assert.match(css,/@media\(prefers-reduced-motion:reduce\)/,'Workspace must respect reduced-motion preference');

const clean=css.replace(/\/\*[\s\S]*?\*\//g,'');
assert.ok(!clean.includes('/a/'),'Workspace visual CSS must never target generated App routes');
assert.ok(!clean.includes('/website/'),'Workspace visual CSS must never target generated Website routes');

const allowedRoots=[editorRoot,dashboardRoot];
let selectorCount=0;
for(const match of clean.matchAll(/([^{}]+)\{/g)){
  const header=match[1].trim();
  if(!header||header.startsWith('@'))continue;
  for(const selector of header.split(',')){
    const s=selector.trim();
    selectorCount+=1;
    assert.ok(allowedRoots.some(root=>s.startsWith(root)),`Unscoped selector is forbidden in workspace shell: ${s}`);
  }
}
assert.ok(selectorCount>=70,'Workspace selector scope check must cover the complete visual layer');

assert.match(editor,/fetch\("\/api\/modify"/,'Editor must keep the real AI Modify endpoint');
assert.match(editor,/wallpaperStyle\(currentWallpaper,\{primary,accent\}\)/,'Customer preview must keep the project saved wallpaper rather than inheriting the LANERIQ shell');
assert.match(editor,/Version History & Rollback/,'Editor must retain version-history safety messaging');
assert.match(editor,/Create a new version rather than destructively overwriting history/,'AI Modify must retain non-destructive version instructions');
assert.match(dashboard,/supabase\.auth\.getUser\(\)/,'Project Dashboard must retain authenticated ownership lookup');
assert.match(dashboard,/redirect\("\/auth"\)/,'Project Dashboard must remain auth protected');
assert.match(dashboard,/buildProjectReadiness/,'Project Dashboard must retain readiness computation');
assert.match(dashboard,/href=\{`\/a\/\$\{id\}\?demo=1`\}/,'Customer App preview navigation must remain separate');
assert.match(dashboard,/href=\{`\/website\/\$\{id\}`\}/,'Customer Website preview navigation must remain separate');

console.log('✓ Big Moon Valley now carries through LANERIQ Editor / AI Modify and Project Dashboard shells');
console.log('✓ Editor customer preview still renders its saved project wallpaper instead of the LANERIQ shell scene');
console.log(`✓ ${selectorCount} workspace selectors are scoped to Editor/Dashboard structural signatures only`);
console.log('✓ Auth, ownership, readiness, AI Modify and version-history safety contracts remain intact');
