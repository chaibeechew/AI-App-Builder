import { UNIFIED_TRUTH_LEVELS } from './unified-intelligence-contract.js';

const freeze=value=>Object.freeze(value);
const clean=(value,max=160)=>String(value??'').replace(/[\u0000-\u001f\u007f]/g,'').trim().slice(0,max);
const ID=/^[A-Za-z0-9._:-]{1,160}$/;
const OPTIONAL_IDS=['characterId','assetId','sceneId','timelineId','evidenceId'];

function requiredId(value,code){const id=clean(value);if(!ID.test(id))throw new Error(code);return id;}
function optionalId(value,code){const id=clean(value);if(!id)return null;if(!ID.test(id))throw new Error(code);return id;}

export function createRealityContext(input={}){
  const worldId=requiredId(input.worldId,'UNIFIED_CONTEXT_WORLD_ID_INVALID');
  const projectId=requiredId(input.projectId,'UNIFIED_CONTEXT_PROJECT_ID_INVALID');
  const worldVersion=Math.max(1,Math.floor(Number(input.worldVersion)||1));
  const result={
    schemaVersion:1,
    contextVersion:'laneriq-reality-context-v1',
    worldId,worldVersion,projectId,
    branchId:optionalId(input.branchId||'main','UNIFIED_CONTEXT_BRANCH_ID_INVALID')||'main',
    privacyScope:'project',
    truth:UNIFIED_TRUTH_LEVELS.CODE_READY,
  };
  for(const key of OPTIONAL_IDS)result[key]=optionalId(input[key],`UNIFIED_CONTEXT_${key.replace(/Id$/,'').toUpperCase()}_ID_INVALID`);
  return freeze(result);
}

export function bindRealityContext(context,patch={}){
  if(!context?.worldId||!context?.projectId)throw new Error('UNIFIED_CONTEXT_INVALID');
  const next={...context,...patch,worldId:context.worldId,projectId:context.projectId,privacyScope:'project'};
  return createRealityContext(next);
}

export function assertRealityContextMatches(context,{worldId,projectId,worldVersion}={}){
  if(!context?.worldId||!context?.projectId)throw new Error('UNIFIED_CONTEXT_INVALID');
  if(worldId&&clean(worldId)!==context.worldId)throw new Error('UNIFIED_CONTEXT_WORLD_MISMATCH');
  if(projectId&&clean(projectId)!==context.projectId)throw new Error('UNIFIED_CONTEXT_PROJECT_MISMATCH');
  if(worldVersion!==undefined&&Math.floor(Number(worldVersion))!==context.worldVersion)throw new Error('UNIFIED_CONTEXT_WORLD_VERSION_MISMATCH');
  return true;
}
