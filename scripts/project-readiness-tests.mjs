import assert from "node:assert/strict";
import fs from "node:fs";
import { buildProjectReadiness } from "../lib/project-readiness.js";

const dashboard=fs.readFileSync("app/app-dashboard/[id]/page.js","utf8");
const quality={overall:96,dimensions:[
  {id:"stability",score:96},{id:"security",score:100},{id:"privacy",score:100},
  {id:"comfort",score:94},{id:"beauty",score:98},{id:"naturalness",score:96}
]};

const blocked=buildProjectReadiness({
  specification:{pages:[{name:"Leads",route:"/leads",components:["Lead form"]}],data:{leads:{fields:["name","phone"]}},actions:[{type:"send_whatsapp"}]},
  qualityReport:quality,releaseReady:false,dataGroups:0,workflowCount:0,publishStatus:"draft"
});
assert.deepEqual(blocked.areas.map(area=>area.id),["design","data","security","mobile","automation","publishing"]);
assert.equal(blocked.areas.find(area=>area.id==="security").score,100);
assert.ok(blocked.areas.find(area=>area.id==="data").score<100,"Data intent without a backend must not be presented as fully ready");
assert.ok(blocked.areas.find(area=>area.id==="automation").score<100,"Automation intent without an enabled workflow must not be presented as fully ready");
assert.ok(blocked.areas.find(area=>area.id==="publishing").score<100,"Publishing must remain blocked while the internal release gate is not ready");
assert.match(blocked.fixInstruction,/FIX EVERYTHING MODE/);
assert.match(blocked.fixInstruction,/Data \d+\/100/);
assert.match(blocked.fixInstruction,/Automation \d+\/100/);
assert.match(blocked.fixInstruction,/Publishing \d+\/100/);
assert.match(blocked.fixInstruction,/owner-scoped backend/i);
assert.match(blocked.fixInstruction,/Safe Test behavior/i);
assert.match(blocked.fixInstruction,/never claim external messages/i);
assert.match(blocked.fixInstruction,/without removing working features, customer data, ownership protections, permissions, brand identity or version history/i);
assert.match(blocked.fixInstruction,/previous known-good version/i);
assert.match(blocked.fixInstruction,/live evidence/i);
assert.equal(blocked.productionEvidenceRequired,true);

const connected=buildProjectReadiness({
  specification:{pages:[{name:"Bookings"}],dataModels:[{name:"bookings"}],workflows:[{name:"Reminder"}]},
  qualityReport:{overall:100,dimensions:[
    {id:"stability",score:100},{id:"security",score:100},{id:"privacy",score:100},
    {id:"comfort",score:100},{id:"beauty",score:100},{id:"naturalness",score:100}
  ]},
  releaseReady:true,dataGroups:2,workflowCount:1,publishStatus:"draft"
});
assert.equal(connected.overall,100,"A fully verified saved project should reach 100 readiness");
assert.equal(connected.blockers.length,0,"No readiness blockers should remain when every saved-project area is verified");
assert.equal(connected.areas.find(area=>area.id==="data").score,100);
assert.equal(connected.areas.find(area=>area.id==="automation").score,100);
assert.equal(connected.areas.find(area=>area.id==="publishing").score,100);
assert.match(connected.fixInstruction,/make only evidence-based improvements/i,"No-blocker repair must not invent work");
assert.doesNotMatch(connected.fixInstruction,/prepare the project for its owner-scoped backend/i,"Connected data must not be reported missing");

const simple=buildProjectReadiness({
  specification:{pages:[{name:"Portfolio",purpose:"Show projects and contact information"}]},
  qualityReport:{overall:100,dimensions:[
    {id:"stability",score:100},{id:"security",score:100},{id:"privacy",score:100},
    {id:"comfort",score:100},{id:"beauty",score:100},{id:"naturalness",score:100}
  ]},
  releaseReady:true,dataGroups:0,workflowCount:0,publishStatus:"draft"
});
assert.equal(simple.areas.find(area=>area.id==="data").score,100,"A project with no data intent must not be penalized for having no database");
assert.equal(simple.areas.find(area=>area.id==="automation").score,100,"A project with no automation intent must not be penalized for having no workflow");
assert.match(simple.areas.find(area=>area.id==="data").note,/No data backend is required/);
assert.match(simple.areas.find(area=>area.id==="automation").note,/No automation is required/);

assert.match(dashboard,/PROJECT READINESS/);
assert.match(dashboard,/Fix Everything/);
assert.match(dashboard,/query:\{instruction:readiness\.fixInstruction\}/,"Fix Everything must hand the evidence-based repair instruction to the versioned AI editor");
assert.match(dashboard,/href=\{`\/operations\/\$\{id\}`\}/,"Project Readiness must expose AI Testing & Self-Heal");
assert.match(dashboard,/href=\{`\/release\/\$\{id\}`\}/,"Project Readiness must expose the release gate");
assert.match(dashboard,/saved-project readiness view/);
assert.match(dashboard,/Live providers, store submission, payments and real-device evidence stay separate/);

console.log("✓ Project Readiness exposes Design, Data, Security, Mobile, Automation and Publishing without faking live production evidence");
console.log("✓ Missing data/workflow requirements become explicit blockers; genuinely unnecessary infrastructure remains ready without fabrication");
console.log("✓ Fix Everything carries exact blocker scores into the versioned AI editor and preserves working state, ownership and rollback boundaries");
console.log("✓ Fully verified saved-project readiness can reach 100 while live provider/store/device evidence remains a separate gate");
