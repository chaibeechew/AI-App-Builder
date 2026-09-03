import assert from 'node:assert/strict';
import fs from 'node:fs';

const sender=fs.readFileSync('lib/communications/in-app-sender.js','utf8');
const adapters=fs.readFileSync('lib/communications/omnichannel-adapters.js','utf8');
const migration=fs.readFileSync('supabase/migrations/20260903153700_add_in_app_notifications.sql','utf8');

assert.match(sender,/server_create_in_app_notification/);
assert.match(sender,/SUPABASE_SECRET_KEY\|\|process\.env\.SUPABASE_SERVICE_ROLE_KEY/);
assert.match(sender,/status:"delivered"/);
assert.match(sender,/in_app_delivery_failed/);
assert.match(sender,/relative path or HTTPS URL/);
assert.match(adapters,/in_app:payload=>sendInAppNotification/);
assert.match(adapters,/sendImplemented:true,costClass:COST_CLASS\.FREE/);
assert.match(migration,/create table if not exists public\.laneriq_in_app_notifications/);
assert.match(migration,/enable row level security/);
assert.match(migration,/auth\.uid\(\) = user_id/);
assert.match(migration,/auth\.role\(\) <> 'service_role'/);
assert.match(migration,/revoke all on function public\.server_create_in_app_notification/);
assert.match(migration,/grant execute on function public\.server_create_in_app_notification.*to service_role/);
assert.doesNotMatch(migration,/grant insert.*to authenticated/i);

console.log('LANERIQ in-app notification contract tests passed.');
