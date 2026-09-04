import { buildContinuityProfile } from './creative-continuity-profile.js';
const freeze=value=>Object.freeze(value);

export function deriveContinuityProfileVersion({parentProfile,patch={},likenessConsent=false}={}){
  if(!parentProfile?.profileId||!parentProfile?.profileVersionId) throw new Error('CONTINUITY_PARENT_PROFILE_REQUIRED');
  const next=buildContinuityProfile({
    type:parentProfile.type,
    profileId:parentProfile.profileId,
    referenceAssetIds:patch.referenceAssetIds??parentProfile.referenceAssetIds,
    likenessConsent:parentProfile.type==='identity'?likenessConsent:true,
    declaredTraits:{...(parentProfile.declaredTraits||{}),...((patch&&patch.declaredTraits)||{})},
    ownerScoped:true,
  });
  return freeze({
    ...next,
    parentProfileVersionId:parentProfile.profileVersionId,
    immutableVersion:true,
    overwritesParent:false,
  });
}
