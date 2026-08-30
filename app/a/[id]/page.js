import { notFound } from "next/navigation";
import { createClient } from "../../../lib/supabase/server.js";
import GeneratedAppClient from "./GeneratedAppClient";
import AnalyticsTracker from "../../components/AnalyticsTracker.js";

export async function generateMetadata({ params }) {
  const { id } = await params;
  return { title: "Generated App", manifest: `/a/${id}/manifest.webmanifest`, appleWebApp: { capable: true, statusBarStyle: "default", title: "Generated App" } };
}

async function loadProjectMedia(supabase,id){
  const {data:links}=await supabase.from("project_assets").select("asset_id,suggested_page,suggested_role,placement_reason").eq("app_id",id).limit(20);
  const ids=(links||[]).map(x=>x.asset_id).filter(Boolean);if(!ids.length)return [];
  const {data:assets}=await supabase.from("asset_library").select("id,file_name,storage_path,mime_type,category,alt_text").in("id",ids);
  const map=new Map((assets||[]).map(a=>[a.id,a]));const result=[];
  for(const link of links||[]){const asset=map.get(link.asset_id);if(!asset)continue;const {data:signed}=await supabase.storage.from("user-assets").createSignedUrl(asset.storage_path,900);if(!signed?.signedUrl)continue;result.push({id:asset.id,name:asset.file_name,mimeType:asset.mime_type,category:asset.category,alt:asset.alt_text||asset.file_name,url:signed.signedUrl,page:link.suggested_page,role:link.suggested_role,reason:link.placement_reason});}
  return result;
}

export default async function GeneratedAppPage({ params }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: app } = await supabase.from("apps").select("id,owner_id,name,description,current_version_id,visibility,publish_status").eq("id", id).single();
  if (!app) notFound();
  const canView = app.owner_id === user?.id || app.visibility === "public" || app.publish_status === "published";
  if (!canView) notFound();
  const { data: versions } = await supabase.from("app_versions").select("id,version_no,specification").eq("app_id", id).order("version_no", { ascending: false });
  const current = versions?.find((version) => version.id === app.current_version_id) || versions?.[0];
  if (!current?.specification) notFound();
  const media=await loadProjectMedia(supabase,id);
  return <><AnalyticsTracker appId={id} channel="app" eventName="app_view"/><GeneratedAppClient appId={id} app={app} specification={current.specification} customerMedia={media}/></>;
}
