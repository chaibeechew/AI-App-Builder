import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const workflow=fs.readFileSync(path.join(root,'.github/workflows/email-delivery-production-sync.yml'),'utf8');

assert.ok(workflow.includes('GMAIL_USER: ${{ secrets.GMAIL_USER }}'));
assert.ok(workflow.includes('GMAIL_APP_PASSWORD: ${{ secrets.GMAIL_APP_PASSWORD }}'));
assert.ok(workflow.includes('VERCEL_TOKEN: ${{ secrets.VERCEL_TOKEN }}'));
assert.match(workflow,/smtp\.gmail\.com/);
assert.match(workflow,/key:"SMTP_HOST"/);
assert.match(workflow,/key:"SMTP_PORT"/);
assert.match(workflow,/key:"SMTP_USER"/);
assert.match(workflow,/key:"SMTP_PASS"/);
assert.match(workflow,/key:"EMAIL_FROM"/);
assert.match(workflow,/vercel@latest deploy --prod --yes/);
assert.doesNotMatch(workflow,/echo\s+"?\$\{?(?:SMTP_PASS|GMAIL_APP_PASSWORD|RESEND_API_KEY|VERCEL_TOKEN)/);

console.log('✓ Production Email sync accepts Gmail SMTP or replaceable Resend credentials');
console.log('✓ Production Email sync redeploys the existing LANERIQ AI Vercel project');
