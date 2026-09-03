const ID_PATTERN=/^[a-z0-9][a-z0-9._-]{1,79}$/;
const VERSION_PATTERN=/^\d+\.\d+(?:\.\d+)?$/;

function requiredText(value,label,max=160){
  const text=String(value||"").trim();
  if(!text||text.length>max)throw new Error(`${label} is invalid.`);
  return text;
}
function uniqueStrings(values=[],max=64){
  const out=[];
  for(const value of Array.isArray(values)?values:[]){
    const text=String(value||"").trim();
    if(text&&!out.includes(text))out.push(text.slice(0,160));
    if(out.length>=max)break;
  }
  return Object.freeze(out);
}

export function defineSovereignServiceManifest(input={}){
  const serviceId=requiredText(input.serviceId,"serviceId",80).toLowerCase();
  if(!ID_PATTERN.test(serviceId))throw new Error("serviceId is invalid.");
  const version=requiredText(input.version||"1.0","version",24);
  if(!VERSION_PATTERN.test(version))throw new Error("version is invalid.");
  const deploymentModes=uniqueStrings(input.deploymentModes||["embedded"]);
  if(!deploymentModes.length)throw new Error("deploymentModes are required.");
  const manifest={
    protocol:"laneriq.sovereign-service.v1",
    serviceId,
    displayName:requiredText(input.displayName||serviceId,"displayName",120),
    version,
    requiredByLaneriq:input.requiredByLaneriq===true,
    currentMode:requiredText(input.currentMode||deploymentModes[0],"currentMode",64),
    deploymentModes,
    capabilities:uniqueStrings(input.capabilities),
    consumesEvents:uniqueStrings(input.consumesEvents),
    emitsEvents:uniqueStrings(input.emitsEvents),
    dependencies:uniqueStrings(input.dependencies),
    fallbackModes:uniqueStrings(input.fallbackModes||["degraded"]),
    dataBoundary:requiredText(input.dataBoundary||"contract_only","dataBoundary",80),
    providerBoundary:requiredText(input.providerBoundary||"adapter_only","providerBoundary",80),
  };
  if(!manifest.deploymentModes.includes(manifest.currentMode))throw new Error("currentMode must be a declared deployment mode.");
  return Object.freeze(manifest);
}

export function publicServiceManifest(manifest){
  return Object.freeze({
    protocol:manifest.protocol,
    serviceId:manifest.serviceId,
    displayName:manifest.displayName,
    version:manifest.version,
    requiredByLaneriq:Boolean(manifest.requiredByLaneriq),
    currentMode:manifest.currentMode,
    deploymentModes:[...manifest.deploymentModes],
    capabilities:[...manifest.capabilities],
    fallbackModes:[...manifest.fallbackModes],
    dataBoundary:manifest.dataBoundary,
    providerBoundary:manifest.providerBoundary,
  });
}
