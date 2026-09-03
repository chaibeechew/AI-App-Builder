import fs from "node:fs";
const files=["services/game/lib/security.js","services/game/api/operate.js","services/game/api/status.js","services/game/package.json","services/game/vercel.json"];
for(const f of files)if(!fs.existsSync(f))throw new Error(`missing ${f}`);
const security=fs.readFileSync(files[0],"utf8"),operate=fs.readFileSync(files[1],"utf8");
for(const s of ["gmsvc1","INVALID_SIGNATURE","RAW_SECRET_FIELD_FORBIDDEN","PAYLOAD_TOO_LARGE"])if(!security.includes(s))throw new Error(`game contract missing ${s}`);
for(const s of ["https:","GAME_ENGINE_ADAPTER_NOT_READY","CODE_READY","no-store"])if(!operate.includes(s))throw new Error(`game operate missing ${s}`);
console.log("Independent Game Service contract: PASS");
