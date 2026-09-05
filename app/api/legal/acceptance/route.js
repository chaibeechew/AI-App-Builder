import { createHash, randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import {
  getActiveLegalDocument,
  getAppOwner,
  getCurrentLegalAssurance,
  getCurrentLegalPrincipal,
  getLegalSaleTransaction,
  insertLegalAcceptanceEvent,
} from "../../../../lib/cloud/legal-runtime.js";

export const runtime="nodejs";

const DOCUMENT_KEY=/^[a-z0-9][a-z0-9_]{1,79}$/;
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SHA256=/^[0-9a-f]{64}$/;
const SCOPE=/^[A-Za-z0-9._:/-]{1,120}$/;
const ACTOR_ROLES=new Set(["account_holder","seller","buyer"]);
const UI_SURFACES=new Set(["web","ios","android","desktop"]);
const NO_STORE={"Cache-Control":"private, no-store","X-Content-Type-Options":"nosniff"};

function cleanText(value,max=120){
  return String(value||"").trim().slice(0,max);
}
function sha256(value){
  return createHash("sha256").update(String(value||""),"utf8").digest("hex");
}
function parsePresentedAt(value){
  const date=new Date(value);
  if(Number.isNaN(date.getTime()))return null;
  const now=Date.now();
  if(date.getTime()<now-(24*60*60*1000)||date.getTime()>now+(5*60*1000))return null;
  return date.toISOString();
}

export async function POST(request){
  try{
    const length=Number(request.headers.get("content-length")||0);
    if(length>32768){
      return NextResponse.json({error:"Legal acceptance request is too large."},{status:413,headers:NO_STORE});
    }

    const {user,error:authError}=await getCurrentLegalPrincipal();
    if(authError||!user){
      return NextResponse.json({error:"Authentication required."},{status:401,headers:NO_STORE});
    }

    const body=await request.json();
    const documentKey=cleanText(body?.documentKey,80);
    const version=cleanText(body?.version,120);
    const documentHash=cleanText(body?.documentHash,64).toLowerCase();
    const actorRole=cleanText(body?.actorRole,40);
    const transactionId=body?.transactionId==null?null:cleanText(body.transactionId,36);
    let appId=body?.appId==null?null:cleanText(body.appId,36);
    const acceptanceScope=cleanText(body?.acceptanceScope||documentKey,120);
    const termsPresentedAt=parsePresentedAt(body?.termsPresentedAt);
    const uiSurface=UI_SURFACES.has(cleanText(body?.uiSurface,20))?cleanText(body.uiSurface,20):"web";

    if(!DOCUMENT_KEY.test(documentKey)||!version||!SHA256.test(documentHash)){
      return NextResponse.json({error:"Exact legal document key, version, and SHA-256 hash are required."},{status:400,headers:NO_STORE});
    }
    if(!ACTOR_ROLES.has(actorRole)){
      return NextResponse.json({error:"Unsupported self-service legal actor role."},{status:400,headers:NO_STORE});
    }
    if(!SCOPE.test(acceptanceScope)||!termsPresentedAt){
      return NextResponse.json({error:"Fresh terms presentation evidence and a valid acceptance scope are required."},{status:400,headers:NO_STORE});
    }
    if(appId&& !UUID.test(appId)){
      return NextResponse.json({error:"Invalid app identifier."},{status:400,headers:NO_STORE});
    }
    if(transactionId&& !UUID.test(transactionId)){
      return NextResponse.json({error:"Invalid transaction identifier."},{status:400,headers:NO_STORE});
    }

    const {data:doc,error:docError}=await getActiveLegalDocument(documentKey);
    if(docError){
      console.error("LEGAL_ACCEPTANCE_DOCUMENT_LOOKUP_ERROR",docError.code||"unknown");
      return NextResponse.json({error:"Legal runtime is not ready."},{status:503,headers:NO_STORE});
    }
    if(!doc){
      return NextResponse.json({error:"No ACTIVE legal version is available for acceptance."},{status:409,headers:NO_STORE});
    }
    if(doc.version!==version||doc.document_hash!==documentHash){
      return NextResponse.json({error:"Legal terms changed. Reload the exact ACTIVE version before accepting."},{status:409,headers:NO_STORE});
    }

    if(actorRole==="seller"||actorRole==="buyer"){
      if(!transactionId){
        return NextResponse.json({error:"Material transaction acceptance requires a transaction identifier."},{status:400,headers:NO_STORE});
      }
      const {data:tx,error:txError}=await getLegalSaleTransaction(transactionId);
      if(txError||!tx){
        return NextResponse.json({error:"Sale transaction not found."},{status:404,headers:NO_STORE});
      }
      const expectedUser=actorRole==="seller"?tx.seller_user_id:tx.buyer_user_id;
      if(expectedUser!==user.id){
        return NextResponse.json({error:"You are not authorized for this transaction role."},{status:403,headers:NO_STORE});
      }
      if(tx.status==="completed"||tx.status==="cancelled"){
        return NextResponse.json({error:"This transaction no longer accepts new signing events."},{status:409,headers:NO_STORE});
      }
      if(appId&&appId!==tx.app_id){
        return NextResponse.json({error:"Transaction and app identifiers do not match."},{status:409,headers:NO_STORE});
      }
      appId=tx.app_id;
    }else if(appId){
      const {data:app}=await getAppOwner(appId);
      if(!app||app.owner_id!==user.id){
        return NextResponse.json({error:"You are not authorized for this app."},{status:403,headers:NO_STORE});
      }
    }

    let assuranceLevel="aal1";
    let reauthMethod="session";
    let highAssuranceVerified=false;

    if(doc.acceptance_level==="strong"||doc.acceptance_level==="bilateral"){
      const {data:aal,error:aalError}=await getCurrentLegalAssurance();
      if(aalError||aal?.currentLevel!=="aal2"){
        return NextResponse.json({
          error:"High-assurance reauthentication is required before this legal document can be signed.",
          requiredAssuranceLevel:"aal2"
        },{status:409,headers:NO_STORE});
      }
      assuranceLevel="aal2";
      reauthMethod="mfa";
      highAssuranceVerified=true;
    }

    const acceptedAt=new Date().toISOString();
    const requestId=randomUUID();
    const locale=cleanText(request.headers.get("accept-language")?.split(",")[0]||"und",20).replace(/[^A-Za-z0-9_-]/g,"")||"und";
    const userAgentHash=sha256(request.headers.get("user-agent")||"unknown");

    const {data:event,error:insertError}=await insertLegalAcceptanceEvent({
      user_id:user.id,
      document_version_id:doc.id,
      document_key_snapshot:doc.document_key,
      version_snapshot:doc.version,
      document_hash_snapshot:doc.document_hash,
      acceptance_level:doc.acceptance_level,
      actor_role:actorRole,
      app_id:appId,
      transaction_id:transactionId,
      acceptance_scope:acceptanceScope,
      reauth_method:reauthMethod,
      terms_presented_at:termsPresentedAt,
      accepted_at:acceptedAt,
      evidence:{
        request_id:requestId,
        ui_surface:uiSurface,
        locale,
        user_agent_hash:userAgentHash,
        assurance_level:assuranceLevel,
        high_assurance_verified:highAssuranceVerified,
        session_user_id:user.id
      }
    });

    if(insertError){
      console.error("LEGAL_ACCEPTANCE_INSERT_ERROR",insertError.code||"unknown");
      return NextResponse.json({error:"Legal acceptance could not be recorded. Reload the terms and try again."},{status:409,headers:NO_STORE});
    }

    return NextResponse.json({
      recorded:true,
      acceptanceEventId:event.id,
      acceptedAt:event.accepted_at,
      documentKey:event.document_key_snapshot,
      version:event.version_snapshot,
      documentHash:event.document_hash_snapshot,
      acceptanceLevel:event.acceptance_level,
      actorRole:event.actor_role,
      appId:event.app_id,
      transactionId:event.transaction_id
    },{status:201,headers:NO_STORE});
  }catch(error){
    console.error("LEGAL_ACCEPTANCE_API_ERROR",error?.name||"unknown");
    return NextResponse.json({error:"Unable to record legal acceptance."},{status:500,headers:NO_STORE});
  }
}
