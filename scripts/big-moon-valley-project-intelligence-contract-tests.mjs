import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const read=p=>fs.readFileSync(path.join(root,p),'utf8');

const layout=read('app/layout.js');
const css=read('app/big-moon-valley-project-intelligence.css');
const analytics=read('app/analytics/[id]/page.js');
const operations=read('app/operations/[id]/page.js');
const versions=read('app/app-dashboard/[id]/versions/page.js');
const rollback=read('app/app-dashboard/[id]/versions/VersionRollbackButton.js');

assert.match(layout,/import "\.\/big-moon-valley-creator-services\.css";\s*import "\.\/big-moon-valley-project-intelligence\.css";/);
assert.match(css,/url\('\/big-moon-valley\.svg'\)/);
assert.match(css,/main\.page:has\(\.bars\)/);
assert.match(css,/main\.page:has\(\.checks \.summary\)/);
assert.match(css,/main\.historyPage/);
assert.match(css,/env\(safe-area-inset-bottom\)/);
assert.match(css,/min-height:44px!important/);
assert.match(css,/min-height:48px!important/);
assert.match(css,/prefers-reduced-motion:reduce/);
assert.doesNotMatch(css,/(^|\n)\s*(html|body|\*)\s*[{,]/m);
assert.doesNotMatch(css,/GeneratedAppClient|generatedApp|websiteShell|customerSurface/);

assert.match(analytics,/if\(!user\)redirect/);
assert.match(analytics,/\.eq\("owner_id",user\.id\)/);
assert.match(analytics,/\.eq\("app_id",id\)/);
assert.match(analytics,/30\*24\*60\*60\*1000/);
assert.match(analytics,/Privacy-minimized project usage signals/);

assert.match(operations,/if\(!user\)redirect/);
assert.match(operations,/\.eq\("owner_id",user\.id\)/);
assert.match(operations,/integrationStatus\(\)/);
assert.match(operations,/needsWhatsApp=externalTypes\.has\("send_whatsapp"\)&&!managed\.whatsapp\.ready/);
assert.match(operations,/WhatsApp delivery/);
assert.doesNotMatch(operations,/needsSms|SMS delivery|send_sms/);
assert.match(operations,/AI Operations reports observable project state/);

assert.match(versions,/\.eq\("owner_id", user\.id\)/);
assert.match(versions,/Restoring an older version creates a new version instead of deleting history/);
assert.match(rollback,/expectedCurrentVersionId/);
assert.match(rollback,/requestId: rollbackRequestId/);
assert.match(rollback,/response\.status === 409/);
assert.match(rollback,/window\.location\.reload\(\)/);

console.log('✓ Big Moon Valley Project Intelligence shell is scoped to Analytics, AI Operations and Version History');
console.log('✓ Operations checks WhatsApp readiness and no longer contains paid SMS readiness');
console.log('✓ Ownership, privacy and rollback/idempotency contracts remain intact');