const freeze=value=>Object.freeze(value);
const SHA256=/^[a-f0-9]{64}$/i;

export function evaluateCreativeMediaExecutionResult({
  session,
  result={},
  providerEvidence={},
  runtimeEvidence={},
}={}){
  if(!session?.sessionId) throw new Error('MEDIA_EXECUTION_SESSION_REQUIRED');
  const assetId=String(result.persistedAssetId||'').trim();
  const artifactHash=String(result.artifactHash||'').trim();
  const provenanceId=String(result.provenanceId||'').trim();
  const durable=Boolean(assetId)&&SHA256.test(artifactHash)&&Boolean(provenanceId);
  const safetyPassed=result.safetyPassed===true;
  const qualityPassed=result.qualityPassed===true;
  const outputValidated=result.outputValidated===true;
  const providerLive=Boolean(providerEvidence.productionEvidenceId)&&providerEvidence.outputVerified===true&&Boolean(providerEvidence.providerRequestId);
  const productionVerified=durable&&safetyPassed&&qualityPassed&&outputValidated&&Boolean(runtimeEvidence.productionDeploymentId)&&runtimeEvidence.runtimeVerified===true;
  let truth='CODE_READY';
  if(durable&&safetyPassed&&qualityPassed&&outputValidated) truth='CI_READY';
  if(providerLive) truth='LIVE_PROVIDER_VERIFIED';
  if(productionVerified) truth='PRODUCTION_VERIFIED';
  return freeze({
    ok:durable&&safetyPassed&&qualityPassed&&outputValidated,
    truth,
    durableResultCaptured:durable,
    safetyPassed,
    qualityPassed,
    outputValidated,
    liveProviderVerified:providerLive,
    productionVerified,
    realOutputQualityVerified:result.realOutputQualityMeasured===true&&qualityPassed,
    code:!durable?'MEDIA_EXECUTION_DURABLE_RESULT_REQUIRED':(!safetyPassed?'MEDIA_EXECUTION_SAFETY_REQUIRED':(!qualityPassed?'MEDIA_EXECUTION_QUALITY_REQUIRED':(!outputValidated?'MEDIA_EXECUTION_OUTPUT_VALIDATION_REQUIRED':null))),
  });
}
