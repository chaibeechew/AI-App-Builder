import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const read=p=>fs.readFileSync(path.join(root,p),'utf8');

const layout=read('app/layout.js');
const css=read('app/big-moon-valley-data-automation.css');
const database=read('app/database/[id]/page.js');
const workflows=read('app/workflows/[id]/page.js');
const integrations=read('app/integrations/[id]/page.js');

assert.match(layout,/import "\.\/big-moon-valley-creative-assets\.css";\s*import "\.\/big-moon-valley-data-automation\.css";/);
assert.match(css,/url\('\/big-moon-valley\.svg'\)/);
assert.match(css,/main\.page:has\(\.heroCard\):has\(\.badge\)/);
assert.match(css,/main\.page:has\(\.safe\):has\(\.presets\)/);
assert.match(css,/main\.page:has\(\.explain\):has\(\.security\)/);
assert.match(css,/env\(safe-area-inset-bottom\)/);
assert.match(css,/min-height:44px!important/);
assert.match(css,/min-height:48px!important/);
assert.match(css,/prefers-reduced-motion:reduce/);
assert.doesNotMatch(css,/(^|\n)\s*(html|body|\*)\s*[{,]/m);
assert.doesNotMatch(css,/GeneratedAppClient|websiteShell|generatedApp|customerSurface/);

assert.match(database,/\/api\/apps\/\$\{appId\}\/database`, \{ cache: "no-store" \}/);
assert.match(database,/\/database\/rollback/);
assert.match(database,/Restored Customer Data v\$\{data\.restoredFrom\} safely as new version v\$\{data\.newVersion\}/);
assert.match(database,/Restoring never deletes the current version/);
assert.match(database,/PRIVATE BY DEFAULT/);

assert.match(workflows,/dryRun:true/);
assert.match(workflows,/idempotencyKey:`safe-test-\$\{workflow\.id\}-\$\{Date\.now\(\)\}`/);
assert.match(workflows,/Safe Test passed\. No customer data was saved and no messages were sent/);
assert.match(workflows,/without saving customer data, sending email or WhatsApp, creating calendar events or notifying your team/);
assert.match(workflows,/send_whatsapp/);
assert.doesNotMatch(workflows,/send_sms|Send SMS|email\/SMS\/WhatsApp/);

assert.match(integrations,/const platformReady=managed\?\.\[type\]\?\.ready===true/);
assert.match(integrations,/const operational=platformReady&&enabled/);
assert.match(integrations,/disabled=\{busy===type\|\|!platformReady\}/);
assert.match(integrations,/SoolenAI platform setup is still needed/);
assert.match(integrations,/project never stores visible API keys, passwords or provider secrets/);
assert.match(integrations,/\["whatsapp","WhatsApp","Send verification and business messages through Meta WhatsApp Cloud API\."\]/);
assert.doesNotMatch(integrations,/\["sms","SMS"/);

console.log('✓ Big Moon Valley data/automation shell is scoped to Customer Data, Automations and Connections');
console.log('✓ Safe Test and server-owned readiness remain intact with WhatsApp replacing paid SMS');
console.log('✓ Traditional SMS is absent from current automation and connection UI');