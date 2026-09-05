const freeze=value=>Object.freeze(value);

export function buildCreativeMediaReferenceManifest({session,references=[]}={}){
  if(!session?.sessionId) throw new Error('MEDIA_EXECUTION_SESSION_REQUIRED');
  const allowedKinds=new Set(['image','video','audio','mask','style','background','first-frame','last-frame']);
  const refs=(Array.isArray(references)?references:[]).map((item,index)=>{
    const assetId=String(item?.assetId||'').trim();
    const kind=String(item?.kind||'').trim().toLowerCase();
    if(!session.inputAssetIds.includes(assetId)) throw new Error(`MEDIA_EXECUTION_REFERENCE_NOT_IN_SESSION:${assetId}`);
    if(!allowedKinds.has(kind)) throw new Error(`MEDIA_EXECUTION_REFERENCE_KIND_INVALID:${kind}`);
    const securityOk=item.ownerScopeVerified===true&&item.mimeValidated===true&&item.malwareScanPassed===true;
    if(!securityOk) throw new Error(`MEDIA_EXECUTION_REFERENCE_SECURITY_REQUIRED:${index}`);
    return freeze({assetId,kind,ownerScopeVerified:true,mimeValidated:true,malwareScanPassed:true});
  });
  return freeze({sessionId:session.sessionId,references:freeze(refs),allReferencesSecurityValidated:true,externalUrlsAccepted:false});
}
