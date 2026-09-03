import { publicServiceManifest } from "./service-manifest.js";

const HEALTH=new Set(["ready","degraded","offline","unknown"]);

export function createCapabilityRegistry(manifests=[]){
  const services=new Map();
  for(const manifest of manifests){
    if(!manifest?.serviceId)throw new Error("Invalid LANERIQ service manifest.");
    if(services.has(manifest.serviceId))throw new Error(`Duplicate LANERIQ service: ${manifest.serviceId}`);
    services.set(manifest.serviceId,{manifest,health:"unknown",endpoint:null,updatedAt:null});
  }

  function registerRuntime(serviceId,{health="unknown",endpoint=null,updatedAt=new Date().toISOString()}={}){
    const record=services.get(String(serviceId||""));
    if(!record)throw new Error("Unknown LANERIQ service.");
    if(!HEALTH.has(health))throw new Error("Invalid LANERIQ service health.");
    let safeEndpoint=null;
    if(endpoint){
      const url=new URL(String(endpoint));
      if(url.protocol!=="https:"&&!(["localhost","127.0.0.1"].includes(url.hostname)))throw new Error("Service endpoint must use HTTPS.");
      url.username="";url.password="";url.search="";url.hash="";
      safeEndpoint=url.toString();
    }
    services.set(record.manifest.serviceId,{...record,health,endpoint:safeEndpoint,updatedAt:String(updatedAt)});
  }

  function resolveCapability(capability){
    const target=String(capability||"").trim();
    const candidates=[];
    for(const record of services.values()){
      if(record.manifest.capabilities.includes(target)){
        candidates.push({serviceId:record.manifest.serviceId,health:record.health,currentMode:record.manifest.currentMode,endpoint:record.endpoint});
      }
    }
    const rank={ready:0,degraded:1,unknown:2,offline:3};
    return candidates.sort((a,b)=>(rank[a.health]??9)-(rank[b.health]??9))[0]||null;
  }

  function snapshot(){
    return Object.freeze([...services.values()].map(record=>Object.freeze({
      ...publicServiceManifest(record.manifest),
      health:record.health,
      endpointConfigured:Boolean(record.endpoint),
      updatedAt:record.updatedAt,
    })));
  }

  return Object.freeze({registerRuntime,resolveCapability,snapshot});
}
