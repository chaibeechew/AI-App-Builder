import fs from 'node:fs';
import assert from 'node:assert/strict';

const read=(p)=>fs.readFileSync(new URL(`../${p}`,import.meta.url),'utf8');
const component=read('app/components/LANERIQ18VisualReference.js');
const css=read('app/laneriq-18-reference.css');
const layout=read('app/layout.js');

assert.match(component,/data-laneriq-reference18="true"/,'18-page reference surface marker must exist');
for(let n=1;n<=18;n++) assert.match(component,new RegExp(`case ${n}:`),`page ${n} must be explicitly mapped`);

assert.match(layout,/import "\.\/laneriq-18-reference\.css";/,'reference CSS must be mounted globally');
assert.match(layout,/LANERIQ18VisualReference/,'reference component must be mounted');

// Approved button geometry and states from the user reference set.
for(const token of [
  '.l18-root button',
  '.l18-goldCta',
  '.l18-purpleCta',
  '.l18-tabbar',
  '.l18-segment',
  'button.active',
  'button.selected',
  'button:active',
  'button:focus-visible',
  'button:disabled',
  'input[type="checkbox"]',
  '.l18-bottom',
]) assert.ok(css.includes(token),`missing reference control contract: ${token}`);

for(const token of [
  '.l18-header', '.l18-user', '.l18-glass', '.l18-shell', '.l18-steps',
  '.l18-previewGrid', '.l18-publishGrid', '.l18-dbGrid', '.l18-testGrid',
]) assert.ok(css.includes(token),`missing reference layout contract: ${token}`);

assert.match(css,/url\('\/laneriq-future-city-people\.webp'\)/,'approved future-city visual must remain the shared background');
assert.match(css,/@media\(max-width:430px\)/,'phone-specific layout contract is required');
assert.match(css,/@media\(prefers-reduced-motion:reduce\)/,'reduced-motion accessibility contract is required');

// Visual references do not override current product policy.
assert.doesNotMatch(component,/120\s*Credits|Credits\s*Saved/i,'legacy credit UI must not be reintroduced');
assert.doesNotMatch(component,/Send\s*SMS/i,'SMS is on hold and must not be reintroduced by visual reference work');

console.log('LANERIQ 18-page user-reference layout/button contract: PASS');
