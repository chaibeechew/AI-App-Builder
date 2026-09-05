import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const base = 'http://127.0.0.1:3000';
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: 'en-MY' });
const page = await context.newPage();
const unexpected = [];
page.on('pageerror', error => unexpected.push(`pageerror:${error.message}`));
page.on('response', response => {
  const url = new URL(response.url());
  const expectedCiReadiness503 = response.status() === 503 && url.pathname === '/api/auth/verification/status';
  if (response.status() >= 500 && !expectedCiReadiness503) unexpected.push(`${response.status()}:${response.url()}`);
});

async function open(path) {
  const response = await page.goto(`${base}${path}`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  assert(response, `No document response for ${path}`);
  assert(response.status() < 500, `${path} returned ${response.status()}`);
  await page.waitForTimeout(350);
  const text = await page.locator('body').innerText();
  assert(text.trim().length > 20, `${path} rendered an empty shell`);
  assert(!/Application error|Internal Server Error|Unhandled Runtime Error/i.test(text), `${path} rendered a runtime error surface`);
  return { text, url: page.url(), status: response.status() };
}

const auth = await open('/auth');
assert.match(auth.text, /Enter Your Email/);
assert.match(auth.text, /A BRIGHTER TOMORROW TOGETHER/);
assert.match(auth.text, /8-digit verification code/);
assert.match(auth.text, /Email address/);
assert.match(auth.text, /Encrypted session/);
assert.match(auth.text, /One-time code/);
assert.doesNotMatch(auth.text, /SMS Code/);

const home = await open('/');
assert.match(home.text, /LANERIQ AI/i);

const templates = await open('/templates');
assert.match(templates.text, /Templates/);
assert.match(templates.text, /Build From Scratch/);
assert.match(templates.text, /Trending/);
assert.match(templates.text, /All Templates/);

const studio = await open('/studio');
if (studio.url.includes('/auth')) {
  assert.match(studio.text, /Enter Your Email/);
} else {
  assert.match(studio.text, /More & Settings/);
  assert.match(studio.text, /AI Photo & Video Generator/);
  assert.match(studio.text, /Pro Game Creator/);
}

const protectedPage = await open('/my-apps');
assert(protectedPage.url.includes('/auth'), 'Signed-out /my-apps must redirect to the LANERIQ auth boundary.');
assert.match(protectedPage.text, /Enter Your Email/);

const sessionResponse = await context.request.get(`${base}/api/auth/session`, { failOnStatusCode: false });
assert.equal(sessionResponse.status(), 401, 'Signed-out session endpoint must remain 401.');
const session = await sessionResponse.json().catch(() => ({}));
assert.notEqual(session?.authenticated, true, 'Signed-out browser must never be reported authenticated.');

assert.deepEqual(unexpected, [], `Unexpected runtime/browser errors: ${unexpected.join(', ')}`);
await browser.close();
console.log('✓ Exact-head Chromium smoke rendered approved mobile Login, Home and Templates surfaces');
console.log('✓ More/Settings is either rendered with restored cross-feature entries or correctly session-gated');
console.log('✓ Signed-out /my-apps and /api/auth/session preserve LANERIQ session boundaries');
console.log('✓ No unexpected 5xx or browser page errors were observed (CI placeholder readiness 503 classified separately)');
