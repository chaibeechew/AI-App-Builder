import fs from "node:fs";
const files=["services/workflow/lib/security.js","services/workflow/api/operate.js","services/workflow/api/status.js","services/workflow/package.json","services/workflow/vercel.json"];
for(const f of files)if(!fs.existsSync(f))throw new Error(`missing ${f}`);
const security=fs.readFileSync(files[0],"utf8"),operate=fs.readFileSync(files[1],"utf8");
for(const s of ["wsvc1","INVALID_SIGNATURE","RAW_SECRET_FIELD_FORBIDDEN","PAYLOAD_TOO_LARGE"])if(!security.includes(s))throw new Error(`workflow contract missing ${s}`);
for(const s of ["https:","WORKFLOW_ENGINE_ADAPTER_NOT_READY","CODE_READY","no-store"])if(!operate.includes(s))throw new Error(`workflow operate missing ${s}`);
console.log("Independent Workflow Service contract: PASS");
