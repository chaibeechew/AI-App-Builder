const HEALTH_RANK={ready:0,degraded:1,unknown:2,offline:3};

export function planGracefulDegradation({registrySnapshot=[],requiredCapabilities=[],optionalCapabilities=[]}={}){
  const byCapability=new Map();
  for(const service of Array.isArray(registrySnapshot)?registrySnapshot:[]){
    for(const capability of service.capabilities||[]){
      const list=byCapability.get(capability)||[];
      list.push(service);
      byCapability.set(capability,list);
    }
  }

  function choose(capability){
    const candidates=[...(byCapability.get(capability)||[])].sort((a,b)=>(HEALTH_RANK[a.health]??9)-(HEALTH_RANK[b.health]??9));
    return candidates[0]||null;
  }

  const required=requiredCapabilities.map(capability=>({capability,service:choose(capability)}));
  const optional=optionalCapabilities.map(capability=>({capability,service:choose(capability)}));
  const missingRequired=required.filter(item=>!item.service||item.service.health==="offline");
  const degradedRequired=required.filter(item=>item.service&&["degraded","unknown"].includes(item.service.health));
  const unavailableOptional=optional.filter(item=>!item.service||item.service.health==="offline");

  const mode=missingRequired.length?"safe_degraded":degradedRequired.length?"degraded":"normal";
  return Object.freeze({
    protocol:"laneriq.degradation-plan.v1",
    mode,
    canContinue:true,
    hardStop:false,
    missingRequired:missingRequired.map(item=>item.capability),
    degradedRequired:degradedRequired.map(item=>item.capability),
    unavailableOptional:unavailableOptional.map(item=>item.capability),
    actions:[
      ...(missingRequired.length?["disable_affected_actions","preserve_local_state","queue_recovery_probe"]:[]),
      ...(degradedRequired.length?["prefer_local_or_cached_path","reduce_background_work"]:[]),
      ...(unavailableOptional.length?["hide_optional_capability"]:[]),
    ],
  });
}

export function requireCapabilityOrDegrade(registry,capability){
  const resolved=registry.resolveCapability(capability);
  if(!resolved||resolved.health==="offline")return {available:false,mode:"safe_degraded",capability};
  return {available:true,mode:resolved.health==="ready"?"normal":"degraded",capability,serviceId:resolved.serviceId};
}
