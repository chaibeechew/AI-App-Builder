import { notFound } from "next/navigation";
import { createClient } from "../../../lib/supabase/server.js";
import GeneratedAppClient from "./GeneratedAppClient";
import GameRuntimeClient from "./GameRuntimeClient";
import MobaRuntimeClient from "./MobaRuntimeClient";
import AirCombatRuntimeClient from "./AirCombatRuntimeClient";
import SpecialistRuntimeClient from "./SpecialistRuntimeClient";
import AdvancedGenreRuntimeClient from "./AdvancedGenreRuntimeClient";
import AnalyticsTracker from "../../components/AnalyticsTracker.js";

const SPECIALIST_RUNTIME_EVENTS=Object.freeze({rpg:"rpg_runtime_view",puzzle:"puzzle_runtime_view",action:"action_runtime_view"});
const ADVANCED_RUNTIME_EVENTS=Object.freeze({strategy:"strategy_runtime_view",racing:"racing_runtime_view",simulation:"simulation_runtime_view",card:"card_runtime_view",sports:"sports_runtime_view",rhythm:"rhythm_runtime_view",survival:"survival_runtime_view"});

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

function inferAdvancedType(archetype,genre){
  const combined=`${archetype} ${genre}`;const rules=[
    ["strategy",/strategy|slg|tactics|策略|战略|戰略/],["racing",/racing|race|driving|赛车|賽車/],["simulation",/simulation|tycoon|\bsim\b|经营|經營/],
    ["card",/card|deck|卡牌/],["sports",/sports|football|basketball|soccer|体育|體育/],["rhythm",/rhythm|music game|节奏|節奏/],["survival",/survival|roguelike|roguelite|生存/]
  ];return rules.find(([,pattern])=>pattern.test(combined))?.[0]||"";
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
  const specification=current.specification;
  const isGame=specification?.productType==="mobile_game"||specification?.game?.enabled===true;
  const archetype=String(specification?.game?.archetype||"").toLowerCase();
  const genre=String(specification?.game?.genre||"").toLowerCase();
  const isMoba=isGame&&(archetype==="moba"||genre.includes("moba"));
  const isAirCombat=isGame&&!isMoba&&(archetype==="air_combat"||genre.includes("air combat")||genre.includes("flight"));
  const specialistType=isGame&&!isMoba&&!isAirCombat?(archetype==="rpg"||genre.includes("rpg")||genre.includes("role-playing")?"rpg":archetype==="puzzle"||genre.includes("puzzle")||genre.includes("brain")||genre.includes("益智")||genre.includes("智力")?"puzzle":archetype==="action"||genre.includes("action")?"action":""):"";
  const isSpecialist=Boolean(specialistType);
  const advancedType=isGame&&!isMoba&&!isAirCombat&&!isSpecialist?inferAdvancedType(archetype,genre):"";
  const isAdvanced=Boolean(advancedType);
  const runtime=isMoba?<MobaRuntimeClient appId={id} app={app} specification={specification} customerMedia={media}/>:isAirCombat?<AirCombatRuntimeClient appId={id} app={app} specification={specification} customerMedia={media}/>:isSpecialist?<SpecialistRuntimeClient appId={id} app={app} specification={{...specification,game:{...(specification.game||{}),archetype:specialistType}}} customerMedia={media}/>:isAdvanced?<AdvancedGenreRuntimeClient appId={id} app={app} specification={{...specification,game:{...(specification.game||{}),archetype:advancedType}}} customerMedia={media}/>:isGame?<GameRuntimeClient appId={id} app={app} specification={specification} customerMedia={media}/>:<GeneratedAppClient appId={id} app={app} specification={specification} customerMedia={media}/>;
  const eventName=isMoba?"moba_runtime_view":isAirCombat?"air_combat_runtime_view":isSpecialist?SPECIALIST_RUNTIME_EVENTS[specialistType]:isAdvanced?ADVANCED_RUNTIME_EVENTS[advancedType]:isGame?"game_runtime_view":"app_view";
  return <><AnalyticsTracker appId={id} channel={isGame?"game":"app"} eventName={eventName}/>{runtime}</>;
}
