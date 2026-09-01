import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { PRODUCT_POLICY } from '../config/product-policy.js';
import { GAME_CREATOR_POLICY } from '../lib/game/pro-policy.js';

const root=process.cwd();
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const gameRoute=read('app/api/game/generate/route.js');
const mainGenerate=read('app/api/generate/route.js');
const gameGate=read('app/components/GameProGate.js');
const gameTermsNotice=read('app/components/GameCommercialTermsNotice.js');
const readme=read('README.md');

const terms=PRODUCT_POLICY.monetization.gameCommercialization;
assert.equal(terms.professionalOnly,true);
assert.equal(terms.buyoutLicenseAvailable,false);
assert.equal(terms.platformProfitSharePercent,5);
assert.equal(terms.profitShareBasis,'game_profit');
assert.equal(terms.appliesTo,'laneriq_ai_generated_games');
assert.equal(terms.continuesAfterProfessionalAccessEnds,true);
assert.equal(terms.cannotBeRemovedByBuyout,true);
assert.equal(terms.customerGameOwnershipPreserved,true);
assert.equal(terms.legalProfitDefinitionRequiredBeforeProduction,true);
assert.match(terms.note,/5% share of game profit/i);
assert.doesNotMatch(terms.note,/5%[^.]{0,80}(?:gross revenue|revenue share)/i);

assert.equal(PRODUCT_POLICY.monetization.buyout.gameBuyoutAvailable,false);
assert.ok(PRODUCT_POLICY.monetization.buyout.excludedProjectTypes.includes('game'));
assert.equal(PRODUCT_POLICY.monetization.buyout.futureRevenueShareAfterBuyoutPercent,0,'Non-game buyout policy must remain separate from Game policy.');

const gameTerms=GAME_CREATOR_POLICY.commercialTerms;
assert.equal(GAME_CREATOR_POLICY.accessTier,'professional');
assert.equal(gameTerms.buyoutLicenseAvailable,false);
assert.equal(gameTerms.platformProfitSharePercent,5);
assert.equal(gameTerms.profitShareBasis,'game_profit');
assert.equal(gameTerms.continuesAfterProfessionalAccessEnds,true);
assert.equal(gameTerms.cannotBeRemovedByBuyout,true);
assert.equal(gameTerms.customerGameOwnershipPreserved,true);
assert.equal(gameTerms.legalProfitDefinitionRequiredBeforeProduction,true);
assert.match(gameTerms.customerFacingSummary,/Pro-only/i);
assert.match(gameTerms.customerFacingSummary,/do not offer a buyout license/i);
assert.match(gameTerms.customerFacingSummary,/continuing 5% LANERIQ AI profit share/i);

// Server response carries the same immutable commercial markers for generated Game requests.
assert.match(gameRoute,/PRO_GAME_CREATOR_REQUIRED/);
assert.match(gameRoute,/gameCommercialTerms\(\)/);
assert.match(gameRoute,/X-LANERIQ-Game-Access","professional-only"/);
assert.match(gameRoute,/X-LANERIQ-Game-Buyout","unavailable"/);
assert.match(gameRoute,/X-LANERIQ-Game-Profit-Share","5-percent"/);
assert.match(gameRoute,/gameCreatorPolicy:\{accessTier:"professional",fairUse:true,commercialTerms:gameCommercialTerms\(\)\}/);

// Main generation route cannot bypass the Pro Game gateway.
assert.match(mainGenerate,/PRO_GAME_CREATOR_REQUIRED/);
assert.match(mainGenerate,/trustedGameGateway/);
assert.ok(mainGenerate.indexOf('if(isMobileGameIdea(combinedInput))') < mainGenerate.indexOf('consumeAppBuilderEntitlement(user.id'));

// Customer-facing upgrade dialog states the exact Game commercial rules.
assert.match(gameGate,/Game creation requires Pro/);
assert.match(gameGate,/No buyout license/);
assert.match(gameGate,/continuing 5% share of game profit/i);
assert.match(gameGate,/continues after Pro access ends/i);
assert.doesNotMatch(gameGate,/5% of (?:gross )?revenue/i);
assert.match(gameGate,/BECOME PRO/);

// Persistent Game Builder notice carries the same continuing terms.
assert.match(gameTermsNotice,/Pro Mode only/);
assert.match(gameTermsNotice,/No buyout license/);
assert.match(gameTermsNotice,/Continuing 5% LANERIQ AI share of game profit/i);
assert.match(gameTermsNotice,/continues after Pro access ends/i);
assert.doesNotMatch(gameTermsNotice,/5% of (?:gross )?revenue/i);

// Public repository description of the policy matches the code contract.
assert.match(readme,/Game creation is a \*\*Pro feature\*\*/);
assert.match(readme,/no buyout license/i);
assert.match(readme,/continuing 5% game-profit-share policy/i);

console.log('✓ Game creation is contractually and technically Professional-only');
console.log('✓ Game buyout is unavailable and kept separate from non-game buyout licensing');
console.log('✓ Commercialized LANERIQ AI-generated games use a continuing 5% share of game profit, not revenue');
console.log('✓ Customer-facing Game UI explicitly states that the continuing profit share survives Pro expiry');
console.log('✓ Game ownership remains with the customer while the continuing profit-share obligation remains');
console.log('✓ Production legal terms are explicitly required to define permitted deductions/profit calculation before launch');
console.log('✓ Game API, main gateway, customer UI and README all carry the same commercial policy');
