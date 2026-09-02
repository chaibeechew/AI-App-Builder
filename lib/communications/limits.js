const LIMITS=Object.freeze({
  verification:Object.freeze({
    email:Object.freeze({cooldownSeconds:60,hourly:8,daily:30}),
    whatsapp:Object.freeze({cooldownSeconds:60,hourly:5,daily:12}),
  }),
  transactional:Object.freeze({
    email:Object.freeze({cooldownSeconds:2,hourly:120,daily:1000}),
    whatsapp:Object.freeze({cooldownSeconds:5,hourly:60,daily:500}),
  }),
  automation:Object.freeze({
    email:Object.freeze({cooldownSeconds:2,hourly:120,daily:1000}),
    whatsapp:Object.freeze({cooldownSeconds:5,hourly:60,daily:500}),
  }),
});

const PURPOSES=new Set(Object.keys(LIMITS));
const CHANNELS=new Set(["email","whatsapp"]);

export function communicationLimit({purpose="transactional",channel}){
  const safePurpose=String(purpose||"").trim().toLowerCase();
  const safeChannel=String(channel||"").trim().toLowerCase();
  if(!PURPOSES.has(safePurpose))throw new Error("Unsupported LANERIQ communication purpose.");
  if(!CHANNELS.has(safeChannel))throw new Error("Unsupported LANERIQ communication channel.");
  return LIMITS[safePurpose][safeChannel];
}

export function communicationLimits(){return LIMITS;}
