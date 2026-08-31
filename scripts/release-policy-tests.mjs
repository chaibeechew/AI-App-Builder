import assert from 'node:assert/strict';
import { evaluateReleaseReadiness, RELEASE_SCORE_REQUIRED, RELEASE_DIMENSIONS_REQUIRED } from '../lib/release-readiness.js';
import { PRODUCT_POLICY } from '../config/product-policy.js';

function report(score=99){
  return {overall:score,dimensions:RELEASE_DIMENSIONS_REQUIRED.map(id=>({id,score}))};
}

assert.equal(RELEASE_SCORE_REQUIRED,99,'Release target must remain 99.');
assert.deepEqual(RELEASE_DIMENSIONS_REQUIRED,["stability","security","privacy","comfort","beauty","naturalness"]);

assert.equal(evaluateReleaseReadiness(report(99)).releaseReady,true,'A complete 99 report should pass.');
assert.equal(evaluateReleaseReadiness(report(98)).releaseReady,false,'Overall 98 must fail.');

const oneWeak=report(99);
oneWeak.dimensions=oneWeak.dimensions.map(x=>x.id==='security'?{...x,score:98}:x);
const weakResult=evaluateReleaseReadiness(oneWeak);
assert.equal(weakResult.releaseReady,false,'Any quality dimension below 99 must fail.');
assert.deepEqual(weakResult.belowTarget,['security']);

const missing=report(99);
missing.dimensions=missing.dimensions.filter(x=>x.id!=='privacy');
const missingResult=evaluateReleaseReadiness(missing);
assert.equal(missingResult.releaseReady,false,'Missing dimensions must fail closed.');
assert.deepEqual(missingResult.missing,['privacy']);

assert.equal(PRODUCT_POLICY.promotion.freeFirstProject.enabled,true);
assert.equal(PRODUCT_POLICY.promotion.freeFirstProject.projectsPerEligibleCustomer,1);
assert.equal(PRODUCT_POLICY.promotion.freeFirstProject.includesAppAndWebsiteGeneration,true);
assert.equal(PRODUCT_POLICY.promotion.freeFirstProject.includesReasonableAiModificationUntilReady,true);
assert.equal(PRODUCT_POLICY.promotion.freeFirstProject.endsWhenProjectIsPublished,true);

assert.equal(PRODUCT_POLICY.pricing.standard.priceUsd,10);
assert.equal(PRODUCT_POLICY.pricing.standard.billing,'one_time');
assert.equal(PRODUCT_POLICY.pricing.professional.priceUsd,68);
assert.equal(PRODUCT_POLICY.pricing.professional.accessDays,365);
assert.equal(PRODUCT_POLICY.pricing.professional.autoRenew,false);
assert.equal(PRODUCT_POLICY.pricing.reviewPolicy.reviewIntervalYears,3);
assert.equal(PRODUCT_POLICY.pricing.reviewPolicy.increaseIsOptional,true);

assert.equal(PRODUCT_POLICY.publishing.externalStoreFees.chargedByAiAppBuilder,false);
assert.equal(PRODUCT_POLICY.publishing.externalStoreFees.collectedByAiAppBuilder,false);
assert.equal(PRODUCT_POLICY.publishing.customerMustReviewBeforeSubmission,true);

assert.equal(PRODUCT_POLICY.monetization.buyout.oneAppOneLicense,true);
assert.equal(PRODUCT_POLICY.monetization.buyout.personal.priceUsd,49);
assert.equal(PRODUCT_POLICY.monetization.buyout.business.priceUsd,199);
assert.equal(PRODUCT_POLICY.monetization.buyout.enterprise.priceUsd,499);

console.log('✓ Release evaluator fails closed below 99 or with missing dimensions');
console.log('✓ Free-first-project promotion policy remains intact');
console.log('✓ Standard / Pro / 3-year review pricing policy remains intact');
console.log('✓ Apple / Google external fee separation remains intact');
console.log('✓ Existing buyout license plan remains intact');
