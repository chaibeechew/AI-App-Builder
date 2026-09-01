import { assessBuildQuality } from "../buildStandards.js";
import { evaluateReleaseReadiness } from "../release-readiness.js";
import { auditPremiumExperience } from "../ai/premium-experience-system.js";
import { buildStoreReadiness } from "./store-readiness-policy.js";

function safeObject(value){return value&&typeof value==="object"&&!Array.isArray(value)?value:{};}

export async function assessPublishingProject({supabase,appId,ownerId,version,listing}){
  const [{data:links},{data:memoryRow}]=await Promise.all([
    supabase.from("project_assets").select("id,asset_id,suggested_page,suggested_role,placement_reason").eq("app_id",appId).eq("owner_id",ownerId),
    supabase.from("project_memory").select("memory_json").eq("app_id",appId).eq("owner_id",ownerId).maybeSingle(),
  ]);
  const assetIds=[...new Set((links||[]).map(item=>item.asset_id).filter(Boolean))];
  let library=[];
  if(assetIds.length){const{data}=await supabase.from("asset_library").select("id,file_name,mime_type,category,alt_text").eq("user_id",ownerId).in("id",assetIds);library=data||[];}
  const byId=new Map(library.map(item=>[item.id,item]));
  const assets=(links||[]).map(item=>({...item,...(byId.get(item.asset_id)||{})}));
  const apple=listing?.apple||{},google=listing?.google_play||{};
  const inferredAnswers={supportEmail:google.contactEmail||"",privacyPolicyUrl:apple.privacyUrl||google.privacyPolicyUrl||"",supportUrl:apple.supportUrl||"",websiteUrl:apple.marketingUrl||google.developerWebsite||"",targetAudience:google.audienceSummary||"",loginRequired:Boolean(apple.loginRequired||google.loginRequired)};
  const storeReadiness=buildStoreReadiness({specification:version?.specification||{},listing,assets,inferredAnswers,customerDeclarations:safeObject(memoryRow?.memory_json?.storePublishingDeclarations)});
  const buildQuality=assessBuildQuality(version?.specification||{}),releaseQuality=evaluateReleaseReadiness(buildQuality),visualQuality=auditPremiumExperience(version?.specification||{});
  return {storeReadiness,buildQuality,releaseQuality,visualQuality,readyForCustomerReview:Boolean(listing)&&releaseQuality.releaseReady&&visualQuality.passed&&storeReadiness.customerRequired.length===0};
}
