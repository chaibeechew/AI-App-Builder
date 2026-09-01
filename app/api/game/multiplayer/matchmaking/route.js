import {NextResponse} from "next/server";
import {createClient} from "../../../../../lib/supabase/server.js";
import {createAdminClient} from "../../../../../lib/supabase/admin.js";
import {getAppBuilderAccess} from "../../../../../lib/app-builder-access.js";
import {cancelMultiplayerTicket,checkMultiplayerTicket,createMultiplayerTicket,getMultiplayerProviderConfig,MultiplayerGatewayError} from "../../../../../lib/game/multiplayer-provider-gateway.js";

const MAX_REQUEST_BYTES=24*1024;
const REQUEST_ID=/^[A-Za-z0-9._:-]{1,160}$/;
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
function json(payload,status=200){return NextResponse.json(payload,{status,headers:{"Cache-Control":"private, no-store, max-age=0","Pragma":"no-cache","X-Content-Type-Options":"nosniff"}});}
function publicSession(row){return{requestId:row?.request_id,status:row?.status||"reserved",matchReady:row?.status==="matched",region:row?.region||null,liveProviderConnected:true,productionEvidenceVerified:false};}
async function ownedGame(supabase,userId,appId){const{data:app}=await supabase.from("apps").select("id,current_version_id").eq("id",appId).eq("owner_id",userId).maybeSingle();if(!app?.current_version_id)return null;const{data:version}=await supabase.from("app_versions").select("id,specification").eq("id",app.current_version_id).eq("app_id",app.id).maybeSingle();const spec=version?.specification||{};return spec?.productType==="mobile_game"||spec?.game?.enabled===true?{app,version}:null;}

export async function POST(request){
  try{
    const length=Number(request.headers.get("content-length")||0);if(length>MAX_REQUEST_BYTES)return json({error:"Multiplayer request is too large."},413);
    const supabase=await createClient();const{data:{user},error:userError}=await supabase.auth.getUser();if(userError||!user)return json({error:"Authentication required."},401);if(!user.confirmed_at&&!user.email_confirmed_at&&!user.phone_confirmed_at)return json({error:"Account verification is required."},403);
    const access=await getAppBuilderAccess(supabase,user.id);if(!access.professional.active)return json({error:"Live multiplayer integration is a Professional Game Creator capability.",code:"PRO_GAME_CREATOR_REQUIRED"},403);
    const body=await request.json().catch(()=>null);if(!body)return json({error:"Invalid multiplayer request."},400);if(Buffer.byteLength(JSON.stringify(body),"utf8")>MAX_REQUEST_BYTES)return json({error:"Multiplayer request is too large."},413);
    const appId=String(body?.appId||"").trim(),requestId=String(body?.requestId||"").trim(),action=["start","check","cancel"].includes(body?.action)?body.action:"start";if(!UUID.test(appId))return json({error:"A valid Game project is required."},400);if(!REQUEST_ID.test(requestId))return json({error:"A stable multiplayer request ID is required."},400);
    const game=await ownedGame(supabase,user.id,appId);if(!game)return json({error:"Owned mobile Game project not found."},404);
    const config=getMultiplayerProviderConfig();if(config.blockedByCostPolicy)return json({error:"Live multiplayer is unavailable under the current cost policy.",code:"MULTIPLAYER_COST_POLICY_BLOCKED"},403);if(!config.configured)return json({error:"Live 5v5 multiplayer is not connected yet. Local/bot game preview remains available, but LANERIQ AI will not claim real-player matchmaking.",code:"LIVE_MULTIPLAYER_NOT_CONNECTED",live:false},503);

    const admin=createAdminClient();
    if(action==="start"){
      const{data:reservation,error:reserveError}=await admin.rpc("server_reserve_multiplayer_session",{p_user_id:user.id,p_app_id:appId,p_request_id:requestId});if(reserveError)throw new Error("MULTIPLAYER_SESSION_RESERVE_FAILED");
      if(reservation?.replayed){const{data:existing}=await admin.from("multiplayer_session_requests").select("request_id,status,region").eq("user_id",user.id).eq("app_id",appId).eq("request_id",requestId).maybeSingle();return json({success:true,replayed:true,session:publicSession(existing),note:"The exact matchmaking request was already recorded; no duplicate provider ticket was created."});}
      try{
        const ticket=await createMultiplayerTicket({requestId,appId,playerId:user.id,mode:String(body?.mode||"5v5").slice(0,48),region:String(body?.region||"auto").slice(0,64),partySize:body?.partySize,teamSize:5});
        const{error:updateError}=await admin.rpc("server_update_multiplayer_session",{p_user_id:user.id,p_app_id:appId,p_request_id:requestId,p_status:ticket.status,p_provider_ticket_id:ticket.ticketId,p_match_id:ticket.matchId,p_region:ticket.region});if(updateError)throw new Error("MULTIPLAYER_SESSION_UPDATE_FAILED");
        return json({success:true,replayed:false,session:{requestId,status:ticket.status,matchReady:ticket.status==="matched",region:ticket.region||null,liveProviderConnected:true,productionEvidenceVerified:false},note:"A real provider ticket was accepted. Production 5v5 remains evidence-gated until relay, load/failover and real-device tests pass."});
      }catch(error){await admin.rpc("server_update_multiplayer_session",{p_user_id:user.id,p_app_id:appId,p_request_id:requestId,p_status:"failed",p_provider_ticket_id:null,p_match_id:null,p_region:null}).catch(()=>{});throw error;}
    }

    const{data:record}=await admin.from("multiplayer_session_requests").select("request_id,status,provider_ticket_id,match_id,region").eq("user_id",user.id).eq("app_id",appId).eq("request_id",requestId).maybeSingle();if(!record)return json({error:"Multiplayer matchmaking request not found."},404);if(!record.provider_ticket_id)return json({success:true,session:publicSession(record),note:"No live provider ticket exists for this request."});
    if(action==="cancel"){
      if(!["cancelled","failed","matched"].includes(record.status)){await cancelMultiplayerTicket(record.provider_ticket_id);await admin.rpc("server_update_multiplayer_session",{p_user_id:user.id,p_app_id:appId,p_request_id:requestId,p_status:"cancelled",p_provider_ticket_id:record.provider_ticket_id,p_match_id:record.match_id,p_region:record.region});record.status="cancelled";}
      return json({success:true,session:publicSession(record)});
    }
    if(["matched","cancelled","failed"].includes(record.status))return json({success:true,checked:false,session:publicSession(record)});
    const checked=await checkMultiplayerTicket(record.provider_ticket_id);await admin.rpc("server_update_multiplayer_session",{p_user_id:user.id,p_app_id:appId,p_request_id:requestId,p_status:checked.status,p_provider_ticket_id:record.provider_ticket_id,p_match_id:checked.matchId,p_region:checked.region});record.status=checked.status;record.region=checked.region||record.region;return json({success:true,checked:true,session:publicSession(record),note:checked.status==="matched"?"Matchmaking reported a real match. Production readiness still requires verified live relay/device evidence.":"The real provider ticket remains in progress."});
  }catch(error){console.error("MULTIPLAYER_MATCHMAKING_ERROR",error?.code||error?.name||"unknown");if(error instanceof MultiplayerGatewayError)return json({error:"The live multiplayer service is unavailable right now.",code:error.code},error.status);return json({error:"Unable to process multiplayer matchmaking right now."},500);}
}