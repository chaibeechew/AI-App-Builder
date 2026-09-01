import {NextResponse} from "next/server";
import {POST as generateApp} from "../../generate/route.js";
import {createClient} from "../../../../lib/supabase/server.js";
import {createAdminClient} from "../../../../lib/supabase/admin.js";
import {getAppBuilderAccess} from "../../../../lib/app-builder-access.js";
import {isMobileGameIdea} from "../../../../lib/ai/mobile-game-knowledge.js";
import {GAME_CREATOR_POLICY,gameFairUseMessage,gameCommercialTerms} from "../../../../lib/game/pro-policy.js";

const MAX_REQUEST_BYTES=32*1024;
const REQUEST_ID=/^[A-Za-z0-9._:-]{1,160}$/;
function json(payload,status=200){return NextResponse.json(payload,{status,headers:{"Cache-Control":"private, no-store, max-age=0","Pragma":"no-cache","X-Content-Type-Options":"nosniff"}});}
async function releaseReservation(admin,userId,requestId){if(!admin||!userId||!requestId)return;try{await admin.rpc("server_release_game_creation",{p_user_id:userId,p_request_id:requestId});}catch{}}

export async function POST(request){
  let admin=null,userId=null,requestId="",reservationActive=false;
  try{
    const contentLength=Number(request.headers.get("content-length")||0);
    if(contentLength>MAX_REQUEST_BYTES)return json({success:false,error:"Game creation request is too large."},413);

    const supabase=await createClient();
    const {data:{user},error}=await supabase.auth.getUser();
    if(error||!user)return json({success:false,error:"Authentication required."},401);
    userId=user.id;
    if(!user.confirmed_at&&!user.email_confirmed_at&&!user.phone_confirmed_at)return json({success:false,error:"Account verification is required."},403);

    const access=await getAppBuilderAccess(supabase,user.id);
    if(!access.professional.active)return json({
      success:false,
      code:"PRO_GAME_CREATOR_REQUIRED",
      error:"Game creation requires Pro. Become Pro to continue.",
      policy:gameFairUseMessage(),
      commercialTerms:gameCommercialTerms(),
      upgradePath:"/pricing"
    },403);

    const body=await request.json().catch(()=>null);
    if(!body)return json({success:false,error:"Invalid game creation request."},400);
    if(Buffer.byteLength(JSON.stringify(body),"utf8")>MAX_REQUEST_BYTES)return json({success:false,error:"Game creation request is too large."},413);
    requestId=String(body?.requestId||"").trim();
    if(!REQUEST_ID.test(requestId))return json({success:false,error:"A stable Game Creator request ID is required."},400);
    const idea=String(body?.idea||body?.prompt||body?.voiceTranscript||"").trim();
    if(!idea||idea.length>8000||!isMobileGameIdea(idea))return json({success:false,error:"Describe the mobile game you want LANERIQ AI to build."},400);

    admin=createAdminClient();
    const {data:reservation,error:reservationError}=await admin.rpc("server_reserve_game_creation",{
      p_user_id:user.id,
      p_request_id:requestId,
      p_hourly_limit:GAME_CREATOR_POLICY.fairUse.maxNewGameStartsPerHour
    });
    if(reservationError)throw new Error("GAME_RESERVATION_FAILED");
    if(reservation?.status==="completed"&&reservation?.app_id){
      return json({success:true,replayed:true,app:{id:reservation.app_id},gameCreator:{reservation:"completed",policy:gameFairUseMessage(),commercialTerms:gameCommercialTerms()}});
    }
    if(!reservation?.allowed){
      if(reservation?.reason==="in_progress")return json({success:false,code:"GAME_REQUEST_IN_PROGRESS",error:"This Game Creator request is already running. The same request ID will not start a duplicate game."},409);
      return json({success:false,code:"GAME_FAIR_USE_TEMPORARY_LIMIT",error:"Game creation is temporarily limited to protect shared compute. Your existing projects are unchanged.",policy:gameFairUseMessage(),commercialTerms:gameCommercialTerms()},429);
    }
    reservationActive=true;

    const headers=new Headers(request.headers);
    headers.set("content-type","application/json");
    headers.delete("content-length");
    headers.set("x-soolen-game-gateway","professional-fair-use");
    const forwarded=new Request(request.url,{method:"POST",headers,body:JSON.stringify({
      ...body,
      requestId,
      industry:"games",
      productType:"mobile_game",
      gameCreatorPolicy:{accessTier:"professional",fairUse:true,commercialTerms:gameCommercialTerms()}
    })});
    const response=await generateApp(forwarded);
    const payload=await response.clone().json().catch(()=>null);
    if(response.ok&&payload?.app?.id){
      const {error:finalizeError}=await admin.rpc("server_finalize_game_creation",{p_user_id:user.id,p_request_id:requestId,p_app_id:payload.app.id});
      if(finalizeError)console.error("GAME_RESERVATION_FINALIZE_ERROR");
      else reservationActive=false;
    }else{
      await releaseReservation(admin,user.id,requestId);
      reservationActive=false;
    }
    response.headers.set("Cache-Control","private, no-store, max-age=0");
    response.headers.set("Pragma","no-cache");
    response.headers.set("X-Content-Type-Options","nosniff");
    response.headers.set("X-LANERIQ-Game-Access","professional-only");
    response.headers.set("X-LANERIQ-Game-Buyout","unavailable");
    response.headers.set("X-LANERIQ-Game-Profit-Share","5-percent");
    return response;
  }catch(error){
    if(reservationActive)await releaseReservation(admin,userId,requestId);
    console.error("PRO_GAME_GENERATION_ERROR",error?.code||error?.name||"unknown");
    return json({success:false,error:"Unable to start the LANERIQ AI Professional Game Creator right now."},500);
  }
}