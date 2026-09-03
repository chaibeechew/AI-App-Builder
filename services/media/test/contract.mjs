import fs from "node:fs";
const files=["services/media/lib/security.js","services/media/api/operate.js","services/media/api/status.js","services/media/package.json","services/media/vercel.json"];
for(const f of files)if(!fs.existsSync(f))throw new Error(`missing ${f}`);
const security=fs.readFileSync(files[0],"utf8"),operate=fs.readFileSync(files[1],"utf8");
for(const s of ["msvc1","INVALID_SIGNATURE","RAW_SECRET_FIELD_FORBIDDEN","PAYLOAD_TOO_LARGE"])if(!security.includes(s))throw new Error(`media contract missing ${s}`);
for(const s of ["https:","MEDIA_ENGINE_ADAPTER_NOT_READY","CODE_READY","no-store"])if(!operate.includes(s))throw new Error(`media operate missing ${s}`);
console.log("Independent Media Service contract: PASS");
