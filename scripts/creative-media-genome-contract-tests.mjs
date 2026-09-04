import assert from 'node:assert/strict';
import { CREATIVE_GENOME_FAMILIES } from '../lib/ai/creative-genome-library.js';
import { composeCreativeGenome, deriveCreativeGenomeVariants } from '../lib/ai/creative-genome-composer.js';
import { buildCreativeGenomeTaskPlan } from '../lib/ai/creative-genome-task-planner.js';
import { estimateCreativeGenomeSpace } from '../lib/ai/creative-genome-space.js';
assert.ok(Object.keys(CREATIVE_GENOME_FAMILIES).length>=12);
const estate=composeCreativeGenome({family:'real-estate',brandKitId:'brand:laneriq',constraints:{costMode:'zero',aspectRatio:'9:16'}});
assert.equal(estate.ok,true);assert.equal(estate.compatibility.ok,true);assert.equal(estate.genes.subject,'property');assert.equal(estate.providerNativeSupportAssumed,false);assert.equal(estate.hiddenModelWeightsTransferred,false);
const estate2=composeCreativeGenome({family:'real-estate',brandKitId:'brand:laneriq',constraints:{costMode:'zero',aspectRatio:'9:16'}});assert.equal(estate.genomeId,estate2.genomeId,'Same genome inputs must produce reproducible IDs.');
const strictMissing=composeCreativeGenome({family:'product-ad'});assert.equal(strictMissing.ok,true);assert.equal(strictMissing.compatibility.ok,false);assert.ok(strictMissing.compatibility.conflicts.includes('strict-brand-requires-brand-kit'));
const badRef=composeCreativeGenome({family:'storyboard',referenceAssetIds:['https://evil.example/ref.png']});assert.equal(badRef.ok,false);assert.equal(badRef.code,'CREATIVE_GENOME_REFERENCE_ID_INVALID');
const imageMotion=composeCreativeGenome({family:'ecommerce',brandKitId:'brand:shop',genes:{motion:'reveal'}});assert.equal(imageMotion.compatibility.ok,false);assert.ok(imageMotion.compatibility.conflicts.includes('image-motion-must-be-still'));
const variants=deriveCreativeGenomeVariants({baseGenome:estate,count:5,noveltyBudget:2});assert.equal(variants.ok,true);assert.ok(variants.generated>=3);assert.equal(new Set(variants.variants.map(v=>v.genomeId)).size,variants.generated);assert.equal(variants.identityAndBrandPreservedByDefault,true);for(const variant of variants.variants){assert.equal(variant.brandKitId,estate.brandKitId);assert.equal(variant.genes.subject,estate.genes.subject);}
const plan=buildCreativeGenomeTaskPlan(estate);assert.equal(plan.ok,true);assert.ok(plan.tasks.some(row=>row.taskId==='image.generate'));assert.ok(plan.tasks.some(row=>row.taskId==='video.storyboard'));assert.ok(plan.tasks.some(row=>row.taskId==='video.generate'));assert.ok(plan.tasks.some(row=>row.taskId==='video.audio-generate'));assert.equal(plan.automaticProviderInvocation,false);assert.equal(plan.realOutputEvidenceRequired,true);
const space=estimateCreativeGenomeSpace();assert.ok(BigInt(space.rawFamilyGeneCombinations)>100000000000n);assert.match(space.note,/not a count of stored templates/i);
console.log('Creative Media Genome Reasoning Transfer contract tests passed.');
