const freeze=value=>Object.freeze(value);

export function resolveCreativeMediaExecutionReplay({existing=null,session}={}){
  if(!session?.sessionId||!session?.requestId) throw new Error('MEDIA_EXECUTION_SESSION_REQUIRED');
  if(!existing) return freeze({action:'create',replay:false,conflict:false});
  const sameRequest=existing.requestId===session.requestId;
  const sameSession=existing.sessionId===session.sessionId;
  if(sameRequest&&sameSession) return freeze({action:'replay',replay:true,conflict:false,existing});
  if(sameRequest&&!sameSession) return freeze({action:'reject',replay:false,conflict:true,code:'MEDIA_EXECUTION_IDEMPOTENCY_CONFLICT'});
  return freeze({action:'create',replay:false,conflict:false});
}
