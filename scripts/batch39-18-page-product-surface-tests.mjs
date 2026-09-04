import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  LANERIQ_18_PAGES,
  LANERIQ_18_PAGE_AI_RULES,
  LANERIQ_18_PAGE_DESIGN_RULES,
  LANERIQ_CORE_CREATION_CHAIN,
  LANERIQ_POWER_WORKSPACE_CHAIN,
  LANERIQ_REAL_EXECUTION_CHAIN,
  LANERIQ_GLOBAL_NAV,
  LANERIQ_APPROVED_CREATION_JOURNEY,
  LANERIQ_APPROVED_HOME_STACK,
  resolveMasterProductPage,
} from '../lib/product/laneriq-18-page-master.js';

assert.equal(LANERIQ_18_PAGES.length,18,'Master product surface must contain exactly 18 pages');
assert.deepEqual(LANERIQ_18_PAGES.map(page=>page.id),Array.from({length:18},(_,i)=>i+1),'Page IDs must remain ordered 1..18');
assert.equal(new Set(LANERIQ_18_PAGES.map(page=>page.id)).size,18,'Page IDs must be unique');
assert.equal(new Set(LANERIQ_18_PAGES.map(page=>page.slug)).size,18,'Page slugs must be unique');
assert.ok(LANERIQ_18_PAGES.every(page=>page.name&&page.route&&page.routeFile&&page.purpose&&page.primaryAction),'Every page needs name, route, physical route file, purpose and primary action');
assert.ok(LANERIQ_18_PAGES.every(page=>Array.isArray(page.userActions)&&page.userActions.length>0),'Every page needs user actions');
assert.ok(LANERIQ_18_PAGES.every(page=>Array.isArray(page.aiActions)&&page.aiActions.length>0),'Every page needs AI actions');
assert.ok(LANERIQ_18_PAGES.every(page=>Array.isArray(page.data)&&page.data.length>0),'Every page needs a data contract');
assert.ok(LANERIQ_18_PAGES.every(page=>Array.isArray(page.states)&&page.states.includes('error')&&page.states.includes('retry')&&page.states.includes('success')),'Every page needs error/retry/success states');
for(const page of LANERIQ_18_PAGES) assert.ok(fs.existsSync(page.routeFile),`Physical route file missing for page ${page.id}: ${page.routeFile}`);

assert.deepEqual(LANERIQ_CORE_CREATION_CHAIN,[1,2,3,4,5,6]);
assert.deepEqual(LANERIQ_POWER_WORKSPACE_CHAIN,[13,17,18]);
assert.deepEqual(LANERIQ_REAL_EXECUTION_CHAIN,[1,2,3,13,17,18]);
assert.deepEqual(LANERIQ_GLOBAL_NAV.map(item=>item.label),['Home','Projects','Create','Templates','More']);
assert.deepEqual(LANERIQ_APPROVED_CREATION_JOURNEY,['Idea','Plan','Build','Preview','Launch','Manage']);
assert.deepEqual(LANERIQ_APPROVED_HOME_STACK,['Hero','Intent Composer','Create Image / Design UI','Style','Templates','Build CTA']);

assert.equal(resolveMasterProductPage(1)?.slug,'home');
assert.equal(resolveMasterProductPage('17')?.slug,'ai-testing-self-heal');
assert.equal(resolveMasterProductPage('publish-deployment-center')?.id,18);
assert.equal(resolveMasterProductPage('missing'),null);

const root=fs.readFileSync('app/page.js','utf8');
for(const marker of ['/api/orchestrate','/api/generate']) assert.ok(root.includes(marker),`Pages 1-3 must remain wired to ${marker}`);
assert.match(root,/stableCreateRequestId/,'Build flow must reuse a stable create request ID for recovery');
assert.match(root,/CREATE_REQUEST_KEY/,'Build flow must persist the pending create request key');
assert.match(root,/GENERATION_REQUEST_IN_PROGRESS|generation_request_in_progress/i,'Build flow must explicitly recover an in-progress generation request');
assert.match(root,/without creating a duplicate/i,'Recovery UX must preserve the no-duplicate contract');

const page8=resolveMasterProductPage(8);
assert.match(page8.aiActions.join(' '),/3000\+/i);
assert.match(page8.aiActions.join(' '),/secondary inspiration/i);
assert.match(page8.aiActions.join(' '),/anti-clone/i);

const page13=resolveMasterProductPage(13);
assert.equal(page13.route,'/editor/[id]');
assert.equal(page13.humanApproval,true);
assert.match(page13.aiActions.join(' '),/version/i);
assert.match(page13.aiActions.join(' '),/undo/i);

const page16=resolveMasterProductPage(16);
assert.equal(page16.route,'/database/[id]');
assert.equal(page16.risk,'critical');
assert.equal(page16.humanApproval,true);
assert.match(page16.aiActions.join(' '),/RLS/i);
assert.match(page16.aiActions.join(' '),/destructive/i);

const page17=resolveMasterProductPage(17);
assert.equal(page17.route,'/operations/[id]');
assert.equal(page17.risk,'critical');
assert.match(page17.aiActions.join(' '),/self-heal/i);
assert.match(page17.aiActions.join(' '),/retest/i);
assert.match(page17.aiActions.join(' '),/never downgrade gates/i);

const page18=resolveMasterProductPage(18);
assert.equal(page18.risk,'critical');
assert.equal(page18.humanApproval,true);
assert.match(page18.aiActions.join(' '),/explicit confirmation/i);
assert.match(page18.aiActions.join(' '),/rollback/i);
assert.match(page18.evidence,/production-exact-sha/i);

assert.equal(LANERIQ_18_PAGE_AI_RULES.humanInControl,true);
assert.equal(LANERIQ_18_PAGE_AI_RULES.neverFakeCompletion,true);
assert.equal(LANERIQ_18_PAGE_AI_RULES.neverFakeLiveProvider,true);
assert.equal(LANERIQ_18_PAGE_AI_RULES.neverFakeStoreApproval,true);
assert.equal(LANERIQ_18_PAGE_AI_RULES.neverInventAnalytics,true);
assert.equal(LANERIQ_18_PAGE_AI_RULES.preserveOwnershipAndRls,true);
assert.equal(LANERIQ_18_PAGE_AI_RULES.selfHealMayNotLowerQualityGates,true);
assert.equal(LANERIQ_18_PAGE_AI_RULES.secretsStayServerSide,true);
assert.equal(LANERIQ_18_PAGE_AI_RULES.smsOnHold,true);

assert.equal(LANERIQ_18_PAGE_DESIGN_RULES.intentFirst,true);
assert.equal(LANERIQ_18_PAGE_DESIGN_RULES.contextAdaptive,true);
assert.equal(LANERIQ_18_PAGE_DESIGN_RULES.liquidIntelligenceGlass,true);
assert.equal(LANERIQ_18_PAGE_DESIGN_RULES.legacyDesignCompatibility,false);
assert.equal(LANERIQ_18_PAGE_DESIGN_RULES.homeFirstPaint,'Future City + People');
assert.match(LANERIQ_18_PAGE_DESIGN_RULES.primaryPromptSurface,/light\/warm/i);
assert.match(LANERIQ_18_PAGE_DESIGN_RULES.longPromptBehavior,/large editor/i);

const doc=fs.readFileSync('docs/LANERIQ_AI_18_PAGE_MASTER_PRODUCT_SPEC.md','utf8');
for(const title of ['Home / Idea','Create Project / Plan','Build Progress','Preview','Launch','Manage & Grow','My Projects / Creations','Templates','AI Assistant','Automation','Analytics & Growth','More & Settings','Project Detail / AI Editor','Template Detail','Workflow Editor','Database Manager','AI Testing & Self-Heal','Publish & Deployment Center']) assert.ok(doc.includes(title),`Master spec missing ${title}`);
assert.match(doc,/SMS remains ON HOLD/i);
assert.match(doc,/CODE \/ structural capability/i);
assert.match(doc,/Production exact SHA/i);
assert.match(doc,/physical iPhone\/Android device/i);
assert.match(doc,/LIUI-2026\.2 is the only active LANERIQ AI design authority/i);

const statusRoute=fs.readFileSync('app/api/product-surface/status/route.js','utf8');
assert.doesNotMatch(statusRoute,/process\.env/,'Public product-surface status must not read or expose environment secrets');
for(const forbidden of ['rawPrompt','raw prompt','userId','user_id','specification']) assert.doesNotMatch(statusRoute,new RegExp(forbidden,'i'),`Status route must not expose ${forbidden}`);
assert.match(statusRoute,/CODE_CI_PRODUCT_SURFACE_CONTRACT/);
assert.match(statusRoute,/productionRuntimeVerified:false/);
assert.match(statusRoute,/externalProviderLiveVerified:false/);
assert.match(statusRoute,/physicalDeviceVerified:false/);
assert.match(statusRoute,/storeVerified:false/);

console.log('✓ LANERIQ 18-page master surface contains exactly 18 ordered, unique pages');
console.log('✓ Approved LIUI-2026.2 navigation, home stack and Idea→Manage journey are locked');
console.log('✓ LIUI-2026.2 is the only active design authority; legacy design compatibility is disabled');
console.log('✓ Pages 1-3 remain connected to the real orchestrate/generate path and stable recovery contract');
console.log('✓ Critical Database, Self-Heal and Publish surfaces remain human-approved and recoverable');
console.log('✓ Templates keep 3000+ LANERIQ structures primary and popular apps secondary/anti-clone');
console.log('✓ Public product-surface status is privacy-safe and carries CODE/CI-only evidence labels');
console.log('✓ Evidence labels remain separated and SMS remains ON HOLD');
