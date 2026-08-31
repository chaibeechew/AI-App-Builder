import {NextResponse} from "next/server";
import {POST as generateApp} from "../../generate/route.js";
import {createClient} from "../../../../lib/supabase/server.js";
import {getAppBuilderAccess} from "../../../../lib/app-builder-access.js";
import {isMobileGameIdea} from "../../../../lib/ai/mobile-game-knowledge.js";
import {GAME_CREATOR_POLICY,gameFairUseMessage} from "../../../../lib/game/pro-policy.js";

function json(payload,status=200){return NextResponse.json(payload,{status,headers:{"Cache-Control":"no-store"}});}

export async function POST(request){
  try{
    const supabase=await createClient();
    const {data:{user},error}=await supabase.auth.getUser();
    if(error||!user)return json({success:false,error:"Authentication required."},401);
    const access=await getAppBuilderAccess(supabase,user.id);
    if(!access.professional.active)return json({success:false,code:"PRO_GAME_CREATOR_REQUIRED",error:"Mobile Game Creator is a Professional feature.",policy:gameFairUseMessage(),upgradePath:"/pricing"},403);

    const body=await request.json().catch(()=>({}));
    const idea=String(body?.idea||body?.prompt||body?.voiceTranscript||"").trim();
    if(!isMobileGameIdea(idea))return json({success:false,error:"Describe the mobile game you want SoolenAI to build."},400);

    const since=new Date(Date.now()-60*60*1000).toISOString();
    const {count}=await supabase.from("apps").select("id",{count:"exact",head:true}).eq("owner_id",user.id).gte("created_at",since);
    if(Number(count||0)>=GAME_CREATOR_POLICY.fairUse.maxNewGameStartsPerHour){
      return json({success:false,code:"GAME_FAIR_USE_TEMPORARY_LIMIT",error:"Game creation is temporarily limited to protect shared compute. Your existing projects are unchanged.",policy:gameFairUseMessage()},429);
    }

    const headers=new Headers(request.headers);headers.set("x-soolen-game-gateway","professional-fair-use");
    const forwarded=new Request(request.url,{method:"POST",headers,body:JSON.stringify({...body,industry:"games",productType:"mobile_game",gameCreatorPolicy:{accessTier:"professional",fairUse:true}})});
    const response=await generateApp(forwarded);
    response.headers.set("X-Soolen-Game-Access","professional-fair-use");
    return response;
  }catch(error){
    console.error("PRO_GAME_GENERATION_ERROR",error);
    return json({success:false,error:"Unable to start the Professional Game Creator right now."},500);
  }
}
