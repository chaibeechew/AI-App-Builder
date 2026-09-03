import assert from 'node:assert/strict';
import { INDUSTRIES, TEMPLATE_CATALOG_STATS } from '../lib/templateCatalog.js';
import { TRENDING_APP_REFERENCE_PATTERNS } from '../lib/trendingAppReferences.js';
import { buildTemplateIntelligenceFusion } from '../lib/ai/template-intelligence-fusion.js';
import { buildServiceHealthSnapshot, planFabricRecovery } from '../lib/fabric/service-observability.js';
import { evaluateCommunicationsCutover } from '../lib/communications/cutover-readiness.js';
import { enrichGenerationPrompt } from '../lib/ai/provider-prompt-intelligence.js';

assert.equal(TEMPLATE_CATALOG_STATS.templates,3000);
assert.equal(INDUSTRIES.length,50);
assert.equal(TRENDING_APP_REFERENCE_PATTERNS.length,100);
const fusion=buildTemplateIntelligenceFusion('Build a premium Malaysia real estate agent CRM with properties, viewing appointments, commissions and analytics',{variantKey:'gvar1-1234567890abcdef'});
assert.equal(fusion.detectedIndustry,'Real Estate');
assert.ok(fusion.catalog.length>=3);
assert.ok(fusion.catalog.every(x=>x.industry==='Real Estate'));
assert.ok(fusion.catalog[0].priority>fusion.references[0].priority);
assert.ok(fusion.rules.some(x=>/exact layouts/.test(x)));

const raw='USER IDEA:\n"Build a real estate CRM with properties and viewing appointments"\n\nVOICE INPUT:\n"None"\n\nINDUSTRY PATTERNS:\n[]';
const enriched=enrichGenerationPrompt(raw);
assert.match(enriched,/LANERIQ Template Intelligence Fusion/);
assert.match(enriched,/Primary LANERIQ templates/);
assert.match(enriched,/Secondary trend patterns/);

const healthy=buildServiceHealthSnapshot({communications:{status:'healthy'},generation:{status:'healthy'},memory:{status:'healthy'},cloud:{status:'healthy'},publish:{status:'healthy'}});
assert.equal(healthy.length,5);
assert.ok(healthy.every(x=>x.evidenceLevel==='CODE_EMBEDDED'));
const recovery=planFabricRecovery({communications:{mode:'remote',status:'down',liveVerified:false},generation:{status:'healthy'}});
assert.equal(recovery.overall,'degraded');
assert.equal(recovery.actions.find(x=>x.service==='communications').action,'block_remote_mutation_and_require_evidence');

const blocked=evaluateCommunicationsCutover({httpsProduction:true,channel:'in_app',externalSpend:0});
assert.equal(blocked.liveReady,false);
assert.ok(blocked.missing.includes('signedCanary'));
const ready=evaluateCommunicationsCutover({httpsProduction:true,signedCanary:true,replayBlocked:true,idempotencyConflictBlocked:true,cleanRuntimeLogs:true,channel:'in_app',externalSpend:0});
assert.equal(ready.liveReady,true);
assert.equal(ready.state,'LIVE_STANDALONE_ELIGIBLE');
assert.match(ready.note,/not a claim/i);

console.log('✓ 3,000 LANERIQ templates are primary while 100 trend references remain secondary inspiration');
console.log('✓ Template Intelligence Fusion is injected into provider generation prompts');
console.log('✓ Observability covers all five sovereign service boundaries with fail-closed recovery planning');
console.log('✓ Communications cannot become LIVE-eligible without signed RM0 canary, replay/idempotency and clean-runtime evidence');
