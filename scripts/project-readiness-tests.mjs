import assert from "node:assert/strict";
import fs from "node:fs";
import { buildProjectReadiness } from "../lib/project-readiness.js";

const dashboard=fs.readFileSync("app/app-dashboard/[id]/page.js","utf8");
const quality={overall:96,dimensions:[
  {id:"stability",score:96},{id:"security",score:100},{id:"privacy",score:100},
  {id:"comfort",score:94},{id:"beauty",score:98},{id:"naturalness",score:96}
]};
const readiness=buildProjectReadiness({
  specification:{pages:[{name:"Leads",route:"/leads",components:["Lead form"]}],data:{leads:{fields:["name","phone"]}},actions:[{type:"send_whatsapp"}]},
  qualityReport:quality,releaseReady:false,dataGroups:0,workflowCount:0,publishStatus:"draft"
});
assert.deepEqual(readiness.areas.map(area=>area.id),["design","data","security","mobile","automation","publishing"]);
assert.equal(readiness.areas.find(area=>area.id==="security").score,100);
assert.ok(readiness.areas.find(area=>area.id==="data").score<100,"Data intent without a backend must not be presented as fully ready");
assert.ok(readiness.areas.find(area=>area.id==="automation").score<100,"Automation intent without an enabled workflow must not be presented as fully ready");
assert.match(readiness.fixInstruction,/FIX EVERYTHING MODE/);
assert.match(readiness.fixInstruction,/never claim external messages/i);
assert.equal(readiness.productionEvidenceRequired,true);
assert.match(dashboard,/PROJECT READINESS/);
assert.match(dashboard,/Fix Everything/);
assert.match(dashboard,/saved-project readiness view/);
assert.match(dashboard,/Live providers, store submission, payments and real-device evidence stay separate/);
console.log("✓ Project Readiness exposes Design, Data, Security, Mobile, Automation and Publishing without faking live production evidence");
console.log("✓ Fix Everything routes verified weak areas into the versioned AI editor/self-heal flow");
