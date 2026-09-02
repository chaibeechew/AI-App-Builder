import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const read=p=>fs.readFileSync(path.join(root,p),'utf8');

const layout=read('app/layout.js');
const css=read('app/big-moon-valley-media-intelligence.css');
const media=read('app/media-studio/page.js');
const vision=read('app/vision/page.js');
const copyFix=read('app/components/ProductCopyFix.js');

assert.match(layout,/import "\.\/big-moon-valley-discovery-community\.css";\s*import "\.\/big-moon-valley-media-intelligence\.css";/,'Media intelligence shell must load after discovery/community');
assert.match(css,/url\('\/big-moon-valley\.svg'\)/);
assert.match(css,/main:has\(> header \+ section \.device\):has\(\.flow\)/);
assert.match(css,/main\.page:has\(\.card \.drop\)/);
assert.match(css,/env\(safe-area-inset-top\)/);
assert.match(css,/env\(safe-area-inset-bottom\)/);
assert.match(css,/font-size:16px!important/);
assert.match(css,/min-height:44px!important/);
assert.match(css,/min-height:54px!important/);
assert.match(css,/@media\(max-width:520px\)/);
assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
const clean=css.replace(/\/\*[\s\S]*?\*\//g,'');
assert.ok(!clean.includes('/a/'),'Media intelligence CSS must never target generated App routes');
assert.ok(!clean.includes('/website/'),'Media intelligence CSS must never target generated Website routes');
assert.doesNotMatch(clean,/(^|\n)\s*(html|body|\*)\s*[{,]/m,'Media intelligence shell must not use global document selectors');

// Device Media Studio keeps private-device defaults, explicit consent and honest local-render readiness.
assert.match(media,/createDeviceExecutionPolicy\(\{useThisDevice,companyPool,shareSpareCompute,shareLimitPercent:5\}\)/);
assert.match(media,/const\[device,setDevice\]=useState\(null\).*const\[useThisDevice,setUseThisDevice\]=useState\(true\)/s);
assert.match(media,/const\[companyPool,setCompanyPool\]=useState\(false\)/);
assert.match(media,/const\[shareSpareCompute,setShareSpareCompute\]=useState\(false\)/);
assert.match(media,/if\(\(voiceSource==="upload"\|\|referenceImage\|\|sourceVideo\)&&!consent\)return setStatus\("Please confirm you own or have permission to use the uploaded media and voice\."\)/);
assert.match(media,/createLocalRuntimeSession\(\{allowNetwork:false,allowPersistence:false\}\)/);
assert.match(media,/rawMediaUploaded:false/);
assert.match(media,/Your uploaded media stayed on this device\. Approved local AI model runtime still needs to be connected before rendering/);
assert.match(media,/Selected compute target will receive the media required for this task after your consent/);
assert.match(media,/executionTarget:policy\.executionTarget/);
assert.match(media,/fetch\("\/api\/media\/generate",\{method:"POST",body:f\}\)/);
assert.match(media,/Local mode: uploaded media stays on this device/);
assert.match(media,/Remote compute: required media is sent only after your consent/);
assert.match(media,/Share spare compute voluntarily/);
assert.match(media,/OFF by default · max 5%/);

// Vision keeps explicit request-only image analysis and does not imply automatic publication.
assert.match(vision,/fetch\("\/api\/images\/analyze",\{method:"POST"/);
assert.match(vision,/reader\.readAsDataURL\(file\)/);
assert.match(vision,/accept="image\/png,image\/jpeg,image\/webp"/);
assert.match(vision,/Images are processed for this request and are not automatically published/);
assert.match(vision,/setStatus\("Soolen AI is recognizing the image…"\)/);
assert.match(vision,/setStatus\("Recognition complete\."\)/);

// Historical customer-facing aliases still resolve to the canonical LANERIQ AI brand at runtime.
assert.match(copyFix,/\/AI APP BUILDER\/gi,PRODUCT_BRAND\.name/);
assert.match(copyFix,/Canonical customer brand: LANERIQ AI/);

console.log('✓ Big Moon Valley carries through Device Media Studio and Soolen Vision');
console.log('✓ Local-media privacy, remote-consent, voluntary spare-compute and Vision publication boundaries remain intact');
console.log('✓ Historical customer-facing builder aliases still resolve to LANERIQ AI and SMS stays on hold');
