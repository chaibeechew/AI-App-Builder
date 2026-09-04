import assert from 'node:assert/strict';
import { evaluateReleaseReadiness, evaluateProductionEvidence, RELEASE_SCORE_REQUIRED, RELEASE_DIMENSIONS_REQUIRED, PRODUCTION_EVIDENCE_REQUIREMENTS } from '../lib/release-readiness.js';
import { assessBuildQuality } from '../lib/buildStandards.js';
import { applySoolenMaxSecurity } from '../lib/ai/soolenai-max-security.js';
import { PRODUCT_POLICY, BUYOUT_LICENSE_POLICY } from '../config/product-policy.js';
import { BUYOUT_LICENSE_ISSUANCE_POLICY } from '../config/buyout-license-policy.js';

function report(score=100){
  return {overall:score,dimensions:RELEASE_DIMENSIONS_REQUIRED.map(id=>({id,score}))};
}

assert.equal(RELEASE_SCORE_REQUIRED,100,'Release target must remain 100.');
assert.deepEqual(RELEASE_DIMENSIONS_REQUIRED,["stability","security","privacy","comfort","beauty","naturalness"]);
assert.equal(evaluateReleaseReadiness(report(100)).releaseReady,true,'A complete 100 report should pass the deterministic score gate.');
assert.equal(evaluateReleaseReadiness(report(99)).releaseReady,false,'Overall 99 must fail the 100-point gate.');
const oneWeak=report(100);oneWeak.dimensions=oneWeak.dimensions.map(x=>x.id==='security'?{...x,score:99}:x);
const weakResult=evaluateReleaseReadiness(oneWeak);assert.equal(weakResult.releaseReady,false,'Any quality dimension below 100 must fail.');assert.deepEqual(weakResult.belowTarget,['security']);
const missing=report(100);missing.dimensions=missing.dimensions.filter(x=>x.id!=='privacy');
const missingResult=evaluateReleaseReadiness(missing);assert.equal(missingResult.releaseReady,false);assert.deepEqual(missingResult.missing,['privacy']);

const qualityWords='error loading empty retry backup offline validation status confirmation auth login permission role secure access admin token rls csrf rate ssrf csp malware privacy consent personal delete export private data mobile simple clear search filter navigation responsive accessible visual design style brand image gallery theme layout hero background premium palette color wallpaper card human natural friendly personalized context local language workflow';
const richSpec=applySoolenMaxSecurity({name:'Release Test App',description:qualityWords,designSystem:{mood:'premium natural',visualDirection:'premium visual design',backgroundDirection:'layered background image',heroDirection:'memorable hero',layoutSignature:'original responsive layout',fontDirection:'readable editorial typography',iconStyle:'clear accessible icons',themeMode:'auto',colorPreference:'industry-coordinated premium palette',paletteRationale:'high contrast palette selected for audience readability and brand mood',cardStyle:'layered glass and solid cards with clear hierarchy',imageStyle:'cinematic original imagery with product-relevant composition',wallpaperPreset:'moon-city'},qualityPlan:Object.fromEntries(RELEASE_DIMENSIONS_REQUIRED.map(id=>[id,[`${id} implementation ${qualityWords}`,`${id} recovery and validation decision`,`${id} mobile privacy accessibility workflow decision`]])),pages:Array.from({length:6},(_,i)=>({name:`Page ${i+1}`,description:qualityWords,purpose:'clear human workflow',layout:'responsive accessible layout',visualTreatment:'premium visual style',backgroundTreatment:'premium background'})),features:Array.from({length:9},(_,i)=>({name:`Feature ${i+1}`,description:qualityWords,uiPattern:'clear responsive workflow'})),data:{Customer:{fields:['id','status','permission']}},actions:[{name:'Retry safely',description:'validation confirmation retry error status'}],navigation:[{label:'Home',route:'/'}]});
const perfectQuality=assessBuildQuality(richSpec);assert.equal(perfectQuality.overall,100);assert.equal(perfectQuality.dimensions.every(x=>x.score===100),true);assert.equal(perfectQuality.security.passed,true);
const keywordOnly=assessBuildQuality({...richSpec,qualityPlan:{}});assert.equal(keywordOnly.overall<100,true);assert.equal(keywordOnly.dimensions.every(x=>x.score<=99),true);
const incompleteVisual=assessBuildQuality({...richSpec,designSystem:{...richSpec.designSystem,wallpaperPreset:'',cardStyle:''}});assert.equal(incompleteVisual.dimensions.find(x=>x.id==='beauty')?.score<=99,true,'Beauty 100 requires complete palette, card, image and wallpaper evidence.');
const noEvidence=evaluateProductionEvidence({});assert.equal(noEvidence.ready,false);assert.equal(noEvidence.missing.length,PRODUCTION_EVIDENCE_REQUIREMENTS.length);
const fullEvidence=evaluateProductionEvidence(Object.fromEntries(PRODUCTION_EVIDENCE_REQUIREMENTS.map(key=>[key,true])));assert.equal(fullEvidence.ready,true);

assert.equal(PRODUCT_POLICY.promotion.freeFirstProject.enabled,true);
assert.equal(PRODUCT_POLICY.promotion.freeFirstProject.projectsPerEligibleCustomer,1);
assert.equal(PRODUCT_POLICY.promotion.freeFirstProject.includesAppAndWebsiteGeneration,true);
assert.equal(PRODUCT_POLICY.promotion.freeFirstProject.includesReasonableAiModificationUntilReady,true);
assert.equal(PRODUCT_POLICY.promotion.freeFirstProject.endsWhenProjectIsPublished,true);
assert.equal(PRODUCT_POLICY.promotion.creatorEncouragementProgram.individualOnly,true);
assert.equal(PRODUCT_POLICY.promotion.creatorEncouragementProgram.buyoutLicenseAvailableForSupportedProject,false);
assert.equal(PRODUCT_POLICY.promotion.creatorEncouragementProgram.otherProjectsFollowStandardBuyoutPolicy,true);

assert.equal(PRODUCT_POLICY.pricing.standard.priceUsd,10);
assert.equal(PRODUCT_POLICY.pricing.professional.priceUsd,68);
assert.equal(PRODUCT_POLICY.pricing.fullAccess.priceUsd,199);
assert.deepEqual(PRODUCT_POLICY.pricing.professional.gameCooldownMinutes,[30,60,120,240,480]);
assert.equal(PRODUCT_POLICY.publishing.externalStoreFees.chargedByAiAppBuilder,false);
assert.equal(PRODUCT_POLICY.publishing.externalStoreFees.collectedByAiAppBuilder,false);

const buyout=PRODUCT_POLICY.monetization.buyout;
assert.equal(buyout.oneAppOneLicense,true);
assert.equal(buyout.personal.priceUsd,49);
assert.equal(buyout.business.priceUsd,199);
assert.equal(buyout.enterprise.priceUsd,499);
assert.equal(buyout.futureRevenueShareAfterBuyoutPercent,0);
assert.equal(buyout.gameBuyoutAvailable,false);
assert.ok(buyout.excludedProjectTypes.includes('game'));
assert.equal(buyout.creatorEncouragementSupportedProjectEligible,false);
assert.equal(buyout.creatorEncouragementRestrictionScope,'supported_project_only');
assert.equal(buyout.unrelatedProjectsOfCreatorRemainEligible,true);
assert.equal(BUYOUT_LICENSE_POLICY.personalPriceUsd,49);
assert.equal(BUYOUT_LICENSE_POLICY.businessPriceUsd,199);
assert.equal(BUYOUT_LICENSE_POLICY.enterprisePriceUsd,499);
assert.equal(BUYOUT_LICENSE_POLICY.encourageCreatorSupportedProjectBuyoutAvailable,false);
assert.equal(BUYOUT_LICENSE_ISSUANCE_POLICY.dashboardVisible,true);
assert.equal(BUYOUT_LICENSE_ISSUANCE_POLICY.transactionalEmailReceiptEnabled,true);
assert.equal(BUYOUT_LICENSE_ISSUANCE_POLICY.emailFailureDoesNotInvalidateLicense,true);

assert.equal(PRODUCT_POLICY.monetization.gameCommercialization.professionalOnly,true);
assert.equal(PRODUCT_POLICY.monetization.gameCommercialization.buyoutLicenseAvailable,false);
assert.equal(PRODUCT_POLICY.monetization.gameCommercialization.platformSalesSharePercent,5);
assert.equal(PRODUCT_POLICY.monetization.gameCommercialization.cannotBeRemovedByBuyout,true);

console.log('✓ Release evaluator and production evidence still fail closed');
console.log('✓ Standard / Professional / Full Access creator pricing remains intact');
console.log('✓ Buyout remains Personal US$49 / Business US$199 / Enterprise US$499 for eligible non-Game projects');
console.log('✓ The specific Encourage Creator-supported project cannot use Buyout; unrelated projects keep normal Buyout eligibility');
console.log('✓ Active Buyout License records are Dashboard-visible and support transactional email delivery');
console.log('✓ Game projects remain creator-owned with no Buyout and continuing 5% LANERIQ AI game-sales share');
