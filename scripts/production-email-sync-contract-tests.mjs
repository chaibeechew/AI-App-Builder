import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const workflow=fs.readFileSync(path.join(root,'.github/workflows/email-delivery-production-sync.yml'),'utf8');

assert.match(workflow,/workflow_dispatch:/);
assert.match(workflow,/resume_email_live_work:/);
assert.match(workflow,/default:\s*'no'/);
assert.match(workflow,/if:\s*\$\{\{ inputs\.resume_email_live_work == 'yes' \}\}/);
assert.doesNotMatch(workflow,/\n\s*push:\s*\n/, 'Email live Production sync must not auto-run from main while Email work is ON HOLD.');
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

console.log('✓ Email live Production sync is ON HOLD and cannot auto-run from main');
console.log('✓ Explicit owner resume input is required before the live sync job can run');
console.log('✓ Dedicated Gmail secret precedence and safe credential handling remain regression-protected');
console.log('✓ Existing Production sync path remains available only for a future explicit Email resume');
