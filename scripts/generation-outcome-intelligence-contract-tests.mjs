import assert from "node:assert/strict";
import {
  assessGenerationOutcome,
  buildGenerationOutcomeDescriptor,
  buildGenerationOutcomeFingerprint,
  GENERATION_OUTCOME_INTELLIGENCE_POLICY,
} from "../lib/ai/generation-outcome-intelligence.js";
import { inspectProjectSpecification, buildSelfHealInstruction } from "../lib/ai/project-self-heal-policy.js";

function genericCrud({name="Customer Workspace",entity="Record"}={}){
  return {
    name,
    description:"A private workflow product.",
    pages:[
      {name:"Home",route:"/",components:[{type:"card"},{type:"card"}]},
      {name:"Dashboard",route:"/dashboard",components:[{type:"card"},{type:"table"}]},
      {name:`${entity} List`,route:"/records",components:[{type:"table"}]},
      {name:`${entity} Detail`,route:"/records/:id",components:[{type:"form"}]},
      {name:`Edit ${entity}`,route:"/records/edit",components:[{type:"form"}]},
    ],
    navigation:[{label:"Home",route:"/"},{label:"Dashboard",route:"/dashboard"},{label:entity,route:"/records"}],
    actions:[{name:"Create"},{name:"Update"},{name:"Delete"}],
    dataModels:[{name:entity,fields:["id","title","status","created_at"]}],
    qualityPlan:{
      comfort:["mobile responsive layout","accessible tap targets","prevent overflow"],
      stability:["loading and error states","retry unavailable requests","recoverable actions"],
    },
    designSystem:{visualDirection:"accessible contrast"},
  };
}

const renamedA=genericCrud({name:"BryanSecretProjectName",entity:"PrivateCustomerLedger"});
const renamedB=genericCrud({name:"Completely Different Visible Name",entity:"AnotherBusinessObject"});
const descriptorA=buildGenerationOutcomeDescriptor(renamedA);
const descriptorB=buildGenerationOutcomeDescriptor(renamedB);
assert.deepEqual(descriptorA,descriptorB,"Visible product/entity naming must not alter the privacy-safe structural descriptor.");
assert.equal(buildGenerationOutcomeFingerprint(renamedA),buildGenerationOutcomeFingerprint(renamedB),"Equivalent normalized structures must produce a stable outcome fingerprint.");

const genericOutcome=assessGenerationOutcome(renamedA);
assert.match(genericOutcome.fingerprint,/^gof1-[a-f0-9]{16}$/);
assert.equal(genericOutcome.privacySafe,true);
assert.equal(genericOutcome.storesRawUserText,false);
assert.equal(genericOutcome.legalOriginalityGuarantee,false);
assert.equal(genericOutcome.closestGenericReference,"dashboard-crud");
assert.ok(genericOutcome.genericSimilarity>=0.9,"Canonical generic CRUD structure should strongly match the LANERIQ-owned generic skeleton reference.");
assert.ok(genericOutcome.score<genericOutcome.target,"Generic CRUD structure should fall below the structural originality replan threshold.");
assert.equal(genericOutcome.requiresReplan,true);
const genericSerialized=JSON.stringify(genericOutcome);
assert.doesNotMatch(genericSerialized,/BryanSecretProjectName|PrivateCustomerLedger/,"Outcome evidence must not retain raw customer-visible names/entity names.");

const rich={
  name:"Private Notes Universe",
  pages:[
    {name:"Home",route:"/",components:[{type:"hero"},{type:"command palette"},{type:"timeline"}]},
    {name:"Discover",route:"/discover",components:[{type:"search"},{type:"filter"},{type:"map"}]},
    {name:"Booking",route:"/booking",components:[{type:"calendar"},{type:"form"}]},
    {name:"Calendar",route:"/calendar",components:[{type:"calendar"},{type:"timeline"}]},
    {name:"Community",route:"/community",components:[{type:"chat"},{type:"gallery"}]},
    {name:"Insights",route:"/analytics",components:[{type:"chart"},{type:"tabs"}]},
    {name:"Settings",route:"/settings",components:[{type:"form"},{type:"tabs"}]},
  ],
  navigation:[{route:"/"},{route:"/discover"},{route:"/booking"},{route:"/calendar"},{route:"/community"},{route:"/analytics"},{route:"/settings"}],
  actions:[{name:"Search"},{name:"Book"},{name:"Message"},{name:"Export"},{name:"Open"},{name:"Share"}],
  dataModels:[
    {name:"Note",fields:["id","body","created_at","folder_id"]},
    {name:"Folder",fields:["id","label"]},
    {name:"Event",fields:["id","starts_at","note_id"]},
  ],
  liui:{intentFirst:true,adaptiveBento:true,voiceNative:true,aiCommandLayer:true},
  designSystem:{backgroundDirection:"depth",heroDirection:"immersive",layoutSignature:"spatial-flow",themeMode:"adaptive",cardStyle:"living",imageStyle:"contextual",wallpaperPreset:"dynamic",visualDirection:"accessible contrast"},
  qualityPlan:{comfort:["mobile responsive layout","accessible tap targets","prevent overflow"],stability:["loading and error states","retry timeout recovery","offline fallback"]},
};
const richOutcome=assessGenerationOutcome(rich);
assert.equal(richOutcome.requiresReplan,false,"Meaningfully varied architecture should not be forced through a structural replan.");
assert.ok(richOutcome.score>genericOutcome.score);
assert.notEqual(richOutcome.fingerprint,genericOutcome.fingerprint,"Meaningfully different architecture must produce a different fingerprint.");
assert.ok(richOutcome.routeVariety>=6);
assert.ok(richOutcome.componentVariety>=8);

const privateNotes={...rich,name:"Private Notes",description:"Keep my personal notes organised."};
const neutralOutcome=assessGenerationOutcome(privateNotes);
assert.doesNotMatch(JSON.stringify(neutralOutcome),/real estate|property|listing/i,"Industry-neutral outcome intelligence must never inject Real Estate assumptions.");

const inspection=inspectProjectSpecification(renamedA);
assert.ok(inspection.checks.includes("structural_originality"));
assert.equal(inspection.outcome.fingerprint,genericOutcome.fingerprint);
assert.ok(inspection.issues.some(issue=>issue.code==="structural_originality"&&issue.severity==="error"),"Low structural originality must become a repair-blocking self-heal finding.");
assert.equal(inspection.passed,false);
const instruction=buildSelfHealInstruction({specification:renamedA});
assert.match(instruction,/STRUCTURAL REPLAN REQUIRED/);
assert.match(instruction,/page architecture, navigation model, composition patterns and action distribution/i);
assert.match(instruction,new RegExp(genericOutcome.fingerprint));
assert.match(instruction,/not legal originality clearance/i);

assert.equal(GENERATION_OUTCOME_INTELLIGENCE_POLICY.zeroPaidEmbeddingDependency,true);
assert.equal(GENERATION_OUTCOME_INTELLIGENCE_POLICY.privacySafeStructuralOnly,true);
assert.match(GENERATION_OUTCOME_INTELLIGENCE_POLICY.evidenceBoundary,/not a copyright/i);

console.log("✓ Outcome fingerprints are stable across customer-visible renaming and change with meaningful structure");
console.log("✓ Generic CRUD/dashboard skeletons trigger deterministic structural replan while richer architectures pass");
console.log("✓ Outcome evidence stores structural categories/counts only, with no raw customer/entity names or industry leakage");
console.log("✓ Autonomous Self-Heal now blocks low-originality structures and requests architecture-level replanning");
console.log("✓ Outcome Intelligence is zero-paid-embedding and preserves CODE vs legal originality evidence boundaries");
