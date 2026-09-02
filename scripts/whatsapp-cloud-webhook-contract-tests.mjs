import assert from 'node:assert/strict';
import fs from 'node:fs';

const route = fs.readFileSync('app/api/whatsapp/webhook/route.js', 'utf8');
const integrations = fs.readFileSync('lib/integrations/server.js', 'utf8');
const edgeProxy = fs.readFileSync('proxy.js', 'utf8');
const sessionProxy = fs.readFileSync('lib/supabase/proxy.js', 'utf8');

assert.match(route, /export async function GET\(request\)/);
assert.match(route, /hub\.mode/);
assert.match(route, /hub\.verify_token/);
assert.match(route, /hub\.challenge/);
assert.match(route, /WHATSAPP_VERIFY_TOKEN/);
assert.match(route, /mode === "subscribe"/);
assert.match(route, /timingSafeEqual/);
assert.match(route, /export async function POST\(request\)/);
assert.match(route, /WHATSAPP_APP_SECRET/);
assert.match(route, /x-hub-signature-256/);
assert.match(route, /createHmac\("sha256"/);
assert.match(route, /payload\?\.object !== "whatsapp_business_account"/);
assert.match(route, /without logging phone numbers/);
assert.doesNotMatch(route, /console\.(log|info|debug|warn)\(/);
assert.match(route, /Cache-Control.*no-store/);
assert.match(route, /X-Content-Type-Options.*nosniff/);

// Existing outbound WhatsApp Cloud API path stays managed and readiness-gated.
assert.match(integrations, /whatsapp:\{ready:Boolean\(process\.env\.WHATSAPP_ACCESS_TOKEN&&process\.env\.WHATSAPP_PHONE_NUMBER_ID\),managed:true\}/);
assert.match(integrations, /https:\/\/graph\.facebook\.com\/v23\.0\/\$\{phoneId\}\/messages/);
assert.match(integrations, /messaging_product:"whatsapp"/);
assert.match(integrations, /replace\(\/\[\^0-9\]\/g,""\)/);
assert.match(integrations, /preview_url:false/);

// Server-to-server Meta webhook requests are allowed without weakening browser mutation protection.
assert.match(edgeProxy, /Server-to-server\/webhook requests commonly have no browser Origin\/Sec-Fetch-Site headers/);
assert.match(edgeProxy, /if\(fetchSite==="cross-site"\)return true/);
assert.match(sessionProxy, /const PUBLIC_SERVER_WEBHOOKS = new Set\(\["\/api\/whatsapp\/webhook"\]\)/);
assert.match(sessionProxy, /if \(PUBLIC_SERVER_WEBHOOKS\.has\(pathname\)\)/);
assert.match(sessionProxy, /route itself performs verify-token checks for GET and HMAC signature checks for POST/);
assert.doesNotMatch(sessionProxy, /startsWith\("\/api\/whatsapp"\)/);

console.log('✓ WhatsApp Cloud webhook verification and HMAC signature checks are present');
console.log('✓ Exact WhatsApp webhook path bypasses user session auth without opening other API routes');
console.log('✓ Outbound WhatsApp Cloud API delivery remains managed and readiness-gated');
console.log('✓ Webhook payloads are acknowledged without logging customer message content');
