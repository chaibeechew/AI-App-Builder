import {NextResponse} from "next/server";
import {createClient} from "../../../../lib/supabase/server.js";
import {createAdminClient} from "../../../../lib/supabase/admin.js";

const MAX_BYTES=48*1024;
const CHARACTER_ID=/^[A-Za-z0-9._:-]{1,96}$/;
function noStore(payload,status=200){return NextResponse.json(payload,{status,headers:{"Cache-Control":"private, no-store, max-age=0","Pragma":"no-cache","X-Content-Type-Options":"nosniff"}});}
function clean(v,max=160){return String(v||"").replace(/[\u0000-\u001f\u007f]/g," ").trim().slice(0,max);}
function manifestOk(manifest,characterId){if(!manifest||typeof manifest!=="object"||Array.isArray(manifest))return false;if(manifest.schema!=="laneriq.living-character")return false;if(manifest.characterId!==characterId)return false;const version=Number(manifest.schemaVersion);return Number.isInteger(version)&&version>=2&&version<=3&&Buffer.byteLength(JSON.stringify(manifest),"utf8")<=32768;}
async function principal(){const supabase=await createClient();const{data:{user},error}=await supabase.auth.getUser();if(error||!user)return null;if(!user.confirmed_at&&!user.email_confirmed_at&&!user.phone_confirmed_at)return null;return user;}

export async function GET(request){
  try{
    const user=await principal();if(!user)return noStore({error:"Authentication required."},401);
    const characterId=clean(new URL(request.url).searchParams.get("characterId"),96);if(!CHARACTER_ID.test(characterId))return noStore({error:"A valid character ID is required."},400);
    const admin=createAdminClient();const{data,error}=await admin.from("living_characters").select("character_id,manifest,revision,persistent_memory_opt_in,memory_binding_id,updated_at").eq("user_id",user.id).eq("character_id",characterId).maybeSingle();
    if(error)return noStore({error:"Unable to load character."},500);if(!data)return noStore({error:"Character not found."},404);
    return noStore({success:true,characterId:data.character_id,manifest:data.manifest,revision:data.revision,persistentMemoryOptIn:data.persistent_memory_opt_in,memoryBindingId:data.memory_binding_id||null,updatedAt:data.updated_at});
  }catch{return noStore({error:"Unable to load character."},500);}
}

export async function PUT(request){
  try{
    const length=Number(request.headers.get("content-length")||0);if(length>MAX_BYTES)return noStore({error:"Character payload is too large."},413);
    const user=await principal();if(!user)return noStore({error:"Authentication required."},401);
    const body=await request.json().catch(()=>null);if(!body)return noStore({error:"Invalid character payload."},400);if(Buffer.byteLength(JSON.stringify(body),"utf8")>MAX_BYTES)return noStore({error:"Character payload is too large."},413);
    const characterId=clean(body.characterId,96);if(!CHARACTER_ID.test(characterId))return noStore({error:"A valid character ID is required."},400);
    const manifest=body.manifest;if(!manifestOk(manifest,characterId))return noStore({error:"Invalid Living Character manifest."},400);
    const expectedRevision=Number(body.expectedRevision);const hasExpected=Number.isInteger(expectedRevision)&&expectedRevision>=0;
    const memoryBindingId=clean(body.memoryBindingId,160)||null,persistentMemoryOptIn=Boolean(body.persistentMemoryOptIn);
    const admin=createAdminClient();const{data:existing,error:lookupError}=await admin.from("living_characters").select("id,revision").eq("user_id",user.id).eq("character_id",characterId).maybeSingle();
    if(lookupError)return noStore({error:"Unable to save character."},500);
    if(existing){
      if(hasExpected&&expectedRevision!==Number(existing.revision))return noStore({error:"Character changed on another device.",code:"CHARACTER_REVISION_CONFLICT",revision:existing.revision},409);
      const nextRevision=Number(existing.revision)+1;let query=admin.from("living_characters").update({manifest,revision:nextRevision,persistent_memory_opt_in:persistentMemoryOptIn,memory_binding_id:memoryBindingId,updated_at:new Date().toISOString()}).eq("id",existing.id).eq("user_id",user.id).eq("revision",existing.revision);
      const{data,error}=await query.select("character_id,manifest,revision,persistent_memory_opt_in,memory_binding_id,updated_at").maybeSingle();if(error||!data)return noStore({error:"Character changed while saving.",code:"CHARACTER_REVISION_CONFLICT"},409);
      return noStore({success:true,characterId:data.character_id,manifest:data.manifest,revision:data.revision,persistentMemoryOptIn:data.persistent_memory_opt_in,memoryBindingId:data.memory_binding_id||null,updatedAt:data.updated_at});
    }
    if(hasExpected&&expectedRevision!==0)return noStore({error:"Character does not exist at the expected revision.",code:"CHARACTER_REVISION_CONFLICT",revision:0},409);
    const{data,error}=await admin.from("living_characters").insert({user_id:user.id,character_id:characterId,manifest,revision:1,persistent_memory_opt_in:persistentMemoryOptIn,memory_binding_id:memoryBindingId}).select("character_id,manifest,revision,persistent_memory_opt_in,memory_binding_id,updated_at").single();
    if(error)return noStore({error:"Unable to save character."},500);
    return noStore({success:true,characterId:data.character_id,manifest:data.manifest,revision:data.revision,persistentMemoryOptIn:data.persistent_memory_opt_in,memoryBindingId:data.memory_binding_id||null,updatedAt:data.updated_at},201);
  }catch{return noStore({error:"Unable to save character."},500);}
}
