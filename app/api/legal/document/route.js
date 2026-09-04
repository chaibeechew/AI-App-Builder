import { NextResponse } from "next/server";
import { getActiveLegalDocument } from "../../../../lib/cloud/legal-runtime.js";

const DOCUMENT_KEY=/^[a-z0-9][a-z0-9_]{1,79}$/;
const HEADERS={"Cache-Control":"public, max-age=0, must-revalidate","X-Content-Type-Options":"nosniff"};

export async function GET(request){
  try{
    const url=new URL(request.url);
    const documentKey=String(url.searchParams.get("key")||"").trim();
    if(!DOCUMENT_KEY.test(documentKey)){
      return NextResponse.json({active:false,error:"Valid legal document key required."},{status:400,headers:HEADERS});
    }

    const {data,error}=await getActiveLegalDocument(documentKey);

    if(error){
      console.error("LEGAL_DOCUMENT_LOOKUP_ERROR",error.code||"unknown");
      return NextResponse.json({active:false,error:"Legal runtime is not ready."},{status:503,headers:HEADERS});
    }

    if(!data){
      return NextResponse.json({active:false,documentKey},{status:404,headers:HEADERS});
    }

    return NextResponse.json({
      active:true,
      documentKey:data.document_key,
      version:data.version,
      documentHash:data.document_hash,
      acceptanceLevel:data.acceptance_level,
      effectiveAt:data.effective_at,
      activatedAt:data.activated_at
    },{headers:HEADERS});
  }catch(error){
    console.error("LEGAL_DOCUMENT_API_ERROR",error?.name||"unknown");
    return NextResponse.json({active:false,error:"Unable to read legal document status."},{status:500,headers:HEADERS});
  }
}
