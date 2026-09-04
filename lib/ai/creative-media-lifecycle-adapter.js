import { createClient as createProviderClient } from '../supabase/server.js';
import { buildAppBuilderMediaInsertContract,buildCreativeMediaExportManifest } from './creative-media-lifecycle.js';

function fail(code,detail=null){return Object.freeze({ok:false,code,detail});}
function success(payload={}){return Object.freeze({ok:true,...payload});}
function clean(value,max=240){return String(value||'').replace(/[\u0000-\u001f\u007f]/g,'').trim().slice(0,max);}
const ID=/^[A-Za-z0-9._:-]{1,180}$/;

async function resolvePrincipal(client){try{const{data,error}=await client.auth.getUser();const user=data?.user;if(error||!user?.id)return fail('AUTHENTICATION_REQUIRED');if(!user.confirmed_at&&!user.email_confirmed_at&&!user.phone_confirmed_at)return fail('ACCOUNT_VERIFICATION_REQUIRED');return success({userId:user.id});}catch{return fail('AUTHENTICATION_REQUIRED');}}
function safeIntel(value){const intel=value&&typeof value==='object'&&!Array.isArray(value)?value:{};return Object.freeze({purpose:clean(intel.purpose,80)||null,source:clean(intel.source,60)||null,mode:clean(intel.mode,60)||null,generationRequestId:ID.test(clean(intel.generationRequestId,180))?clean(intel.generationRequestId,180):null,parentAssetIds:Object.freeze((Array.isArray(intel.parentAssetIds)?intel.parentAssetIds:[]).map(v=>clean(v,180)).filter(v=>ID.test(v)).slice(0,24)),providerOutput:intel.providerOutput===true,privateCustomerAsset:intel.privateCustomerAsset!==false,reusableAcrossUsers:false,rawPrivateAssetsReusableAcrossCustomers:false});}
function safeAsset(row){return Object.freeze({id:row.id,fileName:clean(row.file_name,180)||null,mimeType:clean(row.mime_type,120)||null,fileSize:Number(row.file_size)||null,category:clean(row.category,60)||null,createdAt:row.created_at||null,contentFingerprint:/^[0-9a-f]{64}$/i.test(clean(row.content_fingerprint,64))?clean(row.content_fingerprint,64).toLowerCase():null,intelligence:safeIntel(row.intelligence),signedUrl:null});}

export function createCreativeMediaLifecycleAdapter({createClient=createProviderClient}={}){
  return Object.freeze({
    id:'creative-media-lifecycle-adapter-v1',
    async loadOwnerHistory({limit=50,category=null}={}){
      const client=await createClient();const principal=await resolvePrincipal(client);if(!principal.ok)return principal;const bounded=Math.max(1,Math.min(100,Number(limit)||50));let query=client.from('asset_library').select('id,file_name,mime_type,file_size,category,created_at,content_fingerprint,intelligence').eq('user_id',principal.userId).order('created_at',{ascending:false}).limit(bounded);if(category)query=query.eq('category',clean(category,60));const{data,error}=await query;if(error)return fail('MEDIA_HISTORY_LOAD_FAILED',error.code||null);return success({assets:Object.freeze((data||[]).map(safeAsset)),rawPromptReturned:false,signedUrlReturned:false});
    },
    async attachAssetToProject(input={}){
      let contract;try{contract=buildAppBuilderMediaInsertContract(input);}catch(error){return fail(error?.message||'MEDIA_HANDOFF_INVALID');}
      const client=await createClient();const principal=await resolvePrincipal(client);if(!principal.ok)return principal;const userId=principal.userId;
      const [{data:project,error:projectError},{data:asset,error:assetError}]=await Promise.all([client.from('apps').select('id').eq('id',contract.projectId).eq('owner_id',userId).maybeSingle(),client.from('asset_library').select('id,file_name,mime_type,category').eq('id',contract.assetId).eq('user_id',userId).maybeSingle()]);
      if(projectError||!project)return fail('MEDIA_PROJECT_NOT_FOUND');if(assetError||!asset)return fail('MEDIA_ASSET_NOT_FOUND');
      const row={app_id:contract.projectId,owner_id:userId,asset_id:contract.assetId,suggested_page:contract.suggestedPage,suggested_role:contract.suggestedRole,placement_reason:contract.placementReason};const{error}=await client.from('project_assets').upsert(row,{onConflict:'app_id,asset_id'});if(error)return fail('MEDIA_PROJECT_ATTACH_FAILED',error.code||null);return success({contract,asset:Object.freeze({id:asset.id,fileName:asset.file_name,mimeType:asset.mime_type,category:asset.category}),attached:true,ownerValidated:true});
    },
    async detachAssetFromProject({projectId,assetId}={}){
      const project=clean(projectId,180),asset=clean(assetId,180);if(!ID.test(project)||!ID.test(asset))return fail('MEDIA_HANDOFF_ID_INVALID');const client=await createClient();const principal=await resolvePrincipal(client);if(!principal.ok)return principal;const userId=principal.userId;const{data:owned}=await client.from('apps').select('id').eq('id',project).eq('owner_id',userId).maybeSingle();if(!owned)return fail('MEDIA_PROJECT_NOT_FOUND');const{error}=await client.from('project_assets').delete().eq('app_id',project).eq('asset_id',asset).eq('owner_id',userId);if(error)return fail('MEDIA_PROJECT_DETACH_FAILED',error.code||null);return success({projectId:project,assetId:asset,detached:true,destructiveAssetDelete:false});
    },
    async loadProjectMedia({projectId,limit=100}={}){
      const project=clean(projectId,180);if(!ID.test(project))return fail('MEDIA_PROJECT_ID_INVALID');const client=await createClient();const principal=await resolvePrincipal(client);if(!principal.ok)return principal;const userId=principal.userId;const{data:owned}=await client.from('apps').select('id').eq('id',project).eq('owner_id',userId).maybeSingle();if(!owned)return fail('MEDIA_PROJECT_NOT_FOUND');const{data:links,error}=await client.from('project_assets').select('asset_id,suggested_page,suggested_role,placement_reason').eq('app_id',project).eq('owner_id',userId).limit(Math.max(1,Math.min(100,Number(limit)||100)));if(error)return fail('MEDIA_PROJECT_LINKS_LOAD_FAILED',error.code||null);const assetIds=(links||[]).map(v=>v.asset_id).filter(Boolean);let assets=[];if(assetIds.length){const{data,error:assetError}=await client.from('asset_library').select('id,file_name,mime_type,file_size,category,created_at,content_fingerprint,intelligence').eq('user_id',userId).in('id',assetIds);if(assetError)return fail('MEDIA_PROJECT_ASSETS_LOAD_FAILED',assetError.code||null);assets=(data||[]).map(safeAsset);}const byId=new Map(assets.map(v=>[v.id,v]));const items=(links||[]).map(link=>Object.freeze({asset:byId.get(link.asset_id)||null,suggestedPage:link.suggested_page||null,suggestedRole:link.suggested_role||null,placementReason:link.placement_reason||null})).filter(v=>v.asset);return success({projectId:project,items:Object.freeze(items),signedUrlReturned:false});
    },
    async buildProjectExportManifest({projectId}={}){
      const loaded=await this.loadProjectMedia({projectId,limit:100});if(!loaded.ok)return loaded;const manifest=buildCreativeMediaExportManifest({projectId,assets:loaded.items.map(item=>item.asset)});return success({manifest});
    },
  });
}
