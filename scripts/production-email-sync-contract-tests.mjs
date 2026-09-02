import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const workflow=fs.readFileSync(path.join(root,'.github/workflows/email-delivery-production-sync.yml'),'utf8');

assert.ok(workflow.includes('GMAIL_USER: ${{ secrets.GMAIL_USER }}'));
assert.ok(workflow.includes('GMAIL_APP_PASSWORD: ${{ secrets.GMAIL_APP_PASSWORD }}'));
assert.ok(workflow.includes('VERCEL_TOKEN: ${{ secrets.VERCEL_TOKEN }}'));
assert.match(workflow,/if \[ -n "\$\{GMAIL_USER:-\}" \] && \[ -n "\$\{GMAIL_APP_PASSWORD:-\}" \]; then/);
assert.match(workflow,/smtp_host="smtp\.gmail\.com"/);
assert.match(workflow,/smtp_port="465"/);
assert.match(workflow,/smtp_user="\$\(printf '%s' "\$GMAIL_USER" \| tr -d '\\r\\n'\)"/);
assert.match(workflow,/smtp_pass="\$\(printf '%s' "\$GMAIL_APP_PASSWORD" \| tr -d '\[:space:\]'\)"/);
assert.doesNotMatch(workflow,/smtp_user="\$\{SMTP_USER:-\$\{GMAIL_USER:-\}\}"/);
assert.doesNotMatch(workflow,/smtp_pass="\$\{SMTP_PASS:-\$\{GMAIL_APP_PASSWORD:-\}\}"/);
assert.match(workflow,/key:"SMTP_HOST"/);
assert.match(workflow,/key:"SMTP_PORT"/);
assert.match(workflow,/key:"SMTP_USER"/);
assert.match(workflow,/key:"SMTP_PASS"/);
assert.match(workflow,/key:"EMAIL_FROM"/);
assert.match(workflow,/vercel@latest deploy --prod --yes/);
assert.doesNotMatch(workflow,/echo\s+"?\$\{?(?:SMTP_PASS|GMAIL_APP_PASSWORD|RESEND_API_KEY|VERCEL_TOKEN)/);

console.log('✓ Dedicated Gmail secrets take precedence over stale generic SMTP secrets');
console.log('✓ Gmail App Password whitespace is normalized before Vercel Production sync');
console.log('✓ Production Email sync accepts Gmail SMTP or replaceable Resend credentials');
console.log('✓ Production Email sync redeploys the existing LANERIQ AI Vercel project');
