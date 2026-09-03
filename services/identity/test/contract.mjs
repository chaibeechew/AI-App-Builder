import fs from "node:fs";
const files=["services/identity/lib/security.js","services/identity/api/operate.js","services/identity/api/status.js","services/identity/package.json","services/identity/vercel.json"];
for(const f of files)if(!fs.existsSync(f))throw new Error(`missing ${f}`);
const security=fs.readFileSync(files[0],"utf8"),operate=fs.readFileSync(files[1],"utf8");
for(const s of ["isvc1","INVALID_SIGNATURE","STALE_OR_INVALID_TIMESTAMP","RAW_SECRET_FIELD_FORBIDDEN","PAYLOAD_TOO_LARGE"])if(!security.includes(s))throw new Error(`identity contract missing ${s}`);
for(const s of ["https:","IDENTITY_AUTHORITY_ADAPTER_NOT_READY","CODE_READY","no-store"])if(!operate.includes(s))throw new Error(`identity operate missing ${s}`);
console.log("Independent Identity Service contract: PASS");
