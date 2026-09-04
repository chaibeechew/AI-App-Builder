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
const pricing=read('app/pricing/page.js');
const readme=read('README.md');

const terms=PRODUCT_POLICY.monetization.gameCommercialization;
assert.equal(terms.professionalOnly,true);
assert.equal(terms.buyoutLicenseAvailable,false);
assert.equal(terms.platformSalesSharePercent,5);
assert.equal(terms.salesShareBasis,'gross_game_sales_revenue_excluding_taxes_refunds_chargebacks');
assert.equal(terms.appliesTo,'laneriq_ai_generated_games');
assert.equal(terms.appliesAcrossAllSalesChannels,true);
assert.equal(terms.platformAndStoreCommissionsDoNotReduceShareBasis,true);
assert.equal(terms.continuesAfterProfessionalAccessEnds,true);
assert.equal(terms.cannotBeRemovedByBuyout,true);
assert.equal(terms.customerGameOwnershipPreserved,true);
assert.equal(terms.legalSalesReportingDefinitionRequiredBeforeProduction,true);
for(const channel of ['apple_app_store','google_play','steam','independent_website','direct_sales'])assert.ok(terms.includedSalesChannels.includes(channel));
assert.match(terms.note,/5% share of game sales revenue/i);
assert.match(terms.note,/including outside LANERIQ AI/i);
assert.doesNotMatch(terms.note,/share of game profit|game-profit/i);

const noBuyout=PRODUCT_POLICY.monetization.buyoutLicense;
assert.equal(noBuyout.enabled,false);
assert.equal(noBuyout.customerFacingOption,false);
assert.equal(noBuyout.purchasable,false);
assert.equal(noBuyout.revenueShareRemovalAvailable,false,'No project type may use a buyout to remove continuing revenue share.');
assert.deepEqual(noBuyout.appliesToProjectTypes,[]);

const gameTerms=GAME_CREATOR_POLICY.commercialTerms;
assert.equal(GAME_CREATOR_POLICY.accessTier,'professional');
assert.equal(gameTerms.buyoutLicenseAvailable,false);
assert.equal(gameTerms.platformSalesSharePercent,5);
assert.equal(gameTerms.salesShareBasis,'gross_game_sales_revenue_excluding_taxes_refunds_chargebacks');
assert.equal(gameTerms.appliesAcrossAllSalesChannels,true);
assert.equal(gameTerms.platformAndStoreCommissionsDoNotReduceShareBasis,true);
assert.equal(gameTerms.continuesAfterProfessionalAccessEnds,true);
assert.equal(gameTerms.cannotBeRemovedByBuyout,true);
assert.equal(gameTerms.customerGameOwnershipPreserved,true);
assert.equal(gameTerms.legalSalesReportingDefinitionRequiredBeforeProduction,true);
assert.match(gameTerms.customerFacingSummary,/owned by the creator/i);
assert.match(gameTerms.customerFacingSummary,/5% LANERIQ AI share of game sales revenue/i);
assert.match(gameTerms.customerFacingSummary,/outside LANERIQ AI/i);

assert.match(gameRoute,/PRO_GAME_CREATOR_REQUIRED/);
assert.match(gameRoute,/gameCommercialTerms\(\)/);
assert.match(gameRoute,/X-LANERIQ-Game-Buyout","unavailable"/);
assert.match(gameRoute,/X-LANERIQ-Game-Sales-Share","5-percent-all-sales-channels"/);
assert.doesNotMatch(gameRoute,/X-LANERIQ-Game-Profit-Share/);

// Main generation route cannot bypass the creator-plan Game gateway, and the gate remains before any entitlement/credit reservation using the Cloud-resolved identity.
assert.match(mainGenerate,/PRO_GAME_CREATOR_REQUIRED/);
assert.match(mainGenerate,/trustedGameGateway/);
assert.match(mainGenerate,/const access=inputs\.builderAccess/);
assert.ok(mainGenerate.indexOf('if(isMobileGameIdea(combinedInput))') < mainGenerate.indexOf('consumeAppBuilderEntitlement(userId'));

assert.match(gameGate,/Game creation needs a creator plan/);
assert.match(gameGate,/You keep ownership of your game/);
assert.match(gameGate,/5% share of game sales revenue/i);
assert.match(gameGate,/App Store, Google Play, Steam, independent websites and direct sales/i);
assert.match(gameGate,/continues after creator-plan access ends/i);
assert.doesNotMatch(gameGate,/share of game profit|game-profit/i);

assert.match(gameTermsNotice,/LANERIQ AI encourages creation/);
assert.match(gameTermsNotice,/5% LANERIQ AI share of game sales revenue/i);
assert.match(gameTermsNotice,/including sales outside LANERIQ AI/i);
assert.match(gameTermsNotice,/continues after creator-plan access ends/i);
assert.doesNotMatch(gameTermsNotice,/share of game profit|game-profit/i);

assert.match(pricing,/You own your game/);
assert.match(pricing,/gameTerms\.platformSalesSharePercent/);
assert.match(pricing,/no matter where the game is sold/i);
assert.match(pricing,/Apple App Store, Google Play, Steam/);
assert.match(pricing,/independent website or direct sales/i);
assert.match(pricing,/Store\/platform commissions and creator operating costs do not reduce the sales-share basis/i);

assert.match(readme,/Creator-first Game policy/);
assert.match(readme,/5% share of game sales revenue/i);
assert.match(readme,/all sales channels/i);
assert.match(readme,/direct\/off-platform sales/i);
assert.doesNotMatch(readme,/game-profit-share/i);

console.log('✓ Game creators retain ownership and Game buyout remains unavailable');
console.log('✓ Global policy exposes no customer-facing or purchasable Buyout License option');
console.log('✓ Commercialized LANERIQ AI-generated games use a continuing 5% share of game sales revenue across every sales channel');
console.log('✓ Taxes, refunds and chargebacks are excluded while store/platform commissions do not reduce the sales-share basis');
console.log('✓ Main Generate keeps the creator-plan Game gate before Cloud-resolved finance reservations');
console.log('✓ Customer UI, server headers, pricing and README all carry the same all-channel sales-share policy');
