import {NextResponse} from "next/server";
import {createClient} from "../../../../lib/supabase/server.js";
import {createAdminClient} from "../../../../lib/supabase/admin.js";

const MAX_BYTES=24*1024,CHARACTER_ID=/^[A-Za-z0-9._:-]{1,96}$/,DEVICE_HASH=/^[a-f0-9]{64}$/;
function noStore(payload,status=200){return NextResponse.json(payload,{status,headers:{"Cache-Control":"private, no-store, max-age=0","Pragma":"no-cache","X-Content-Type-Options":"nosniff"}});}
function clean(v,max=160){return String(v||"").replace(/[\u0000-\u001f\u007f]/g," ").trim().slice(0,max);}
async function principal(){const supabase=await createClient();const{data:{user},error}=await supabase.auth.getUser();if(error||!user)return null;if(!user.confirmed_at&&!user.email_confirmed_at&&!user.phone_confirmed_at)return null;return user;}
function snapshotOk(snapshot,characterId){if(!snapshot||typeof snapshot!=="object"||Array.isArray(snapshot))return false;if(snapshot.contract!=="laneriq-character-continuity-v1"||snapshot.characterId!==characterId)return false;if(snapshot?.privacy?.persistentMemoryIncluded===true||snapshot?.privacy?.rawAssetIncluded===true)return false;return Buffer.byteLength(JSON.stringify(snapshot),"utf8")<=16384;}

export async function GET(request){
  try{
    const user=await principal();if(!user)return noStore({error:"Authentication required."},401);const url=new URL(request.url),characterId=clean(url.searchParams.get("characterId"),96);if(!CHARACTER_ID.test(characterId))return noStore({error:"A valid character ID is required."},400);
    const admin=createAdminClient();const{data,error}=await admin.from("living_character_devices").select("device_id_hash,device_class,continuity_snapshot,revision,last_seen_at").eq("user_id",user.id).eq("character_id",characterId).order("revision",{ascending:false}).order("last_seen_at",{ascending:false}).limit(12);
    if(error)return noStore({error:"Unable to load character continuity."},500);return noStore({success:true,characterId,devices:(data||[]).map(row=>({deviceIdHash:row.device_id_hash,deviceClass:row.device_class,snapshot:row.continuity_snapshot,revision:row.revision,lastSeenAt:row.last_seen_at}))});
  }catch{return noStore({error:"Unable to load character continuity."},500);}
}

export async function PUT(request){
  try{
    const length=Number(request.headers.get("content-length")||0);if(length>MAX_BYTES)return noStore({error:"Continuity payload is too large."},413);const user=await principal();if(!user)return noStore({error:"Authentication required."},401);
    const body=await request.json().catch(()=>null);if(!body)return noStore({error:"Invalid continuity payload."},400);if(Buffer.byteLength(JSON.stringify(body),"utf8")>MAX_BYTES)return noStore({error:"Continuity payload is too large."},413);
    const characterId=clean(body.characterId,96),deviceIdHash=clean(body.deviceIdHash,64).toLowerCase(),deviceClass=clean(body.deviceClass,40)||"unknown",snapshot=body.snapshot;
    if(!CHARACTER_ID.test(characterId)||!DEVICE_HASH.test(deviceIdHash))return noStore({error:"Valid character and device identifiers are required."},400);if(!snapshotOk(snapshot,characterId))return noStore({error:"Invalid continuity snapshot."},400);
    const revision=Math.max(0,Math.floor(Number(snapshot.revision)||0));const admin=createAdminClient();
    const{data:character,error:characterError}=await admin.from("living_characters").select("id").eq("user_id",user.id).eq("character_id",characterId).maybeSingle();if(characterError)return noStore({error:"Unable to validate character."},500);if(!character)return noStore({error:"Save the character before syncing devices."},409);
    const now=new Date().toISOString();const{data,error}=await admin.from("living_character_devices").upsert({user_id:user.id,character_id:characterId,device_id_hash:deviceIdHash,device_class:deviceClass,continuity_snapshot:snapshot,revision,last_seen_at:now},{onConflict:"user_id,character_id,device_id_hash"}).select("device_id_hash,device_class,continuity_snapshot,revision,last_seen_at").single();
    if(error)return noStore({error:"Unable to sync character continuity."},500);return noStore({success:true,characterId,deviceIdHash:data.device_id_hash,deviceClass:data.device_class,snapshot:data.continuity_snapshot,revision:data.revision,lastSeenAt:data.last_seen_at});
  }catch{return noStore({error:"Unable to sync character continuity."},500);}
}
