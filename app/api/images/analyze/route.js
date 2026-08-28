import { NextResponse } from "next/server";

function pngSize(buf){return buf.slice(0,8).toString("hex")==="89504e470d0a1a0a"?{width:buf.readUInt32BE(16),height:buf.readUInt32BE(20)}:null;}
function jpegSize(buf){let i=2;while(i<buf.length){if(buf[i]!==0xff){i++;continue}const marker=buf[i+1];const len=buf.readUInt16BE(i+2);if(marker>=0xc0&&marker<=0xc3)return{height:buf.readUInt16BE(i+5),width:buf.readUInt16BE(i+7)};i+=2+len}return null;}
function sizeFromBase64(b64){try{const b=Buffer.from(b64,"base64");return pngSize(b)||jpegSize(b)||null}catch{return null}}
export async function POST(request){
  try{
    const {imageData,mimeType="image/jpeg",uiAnalysis={}}=await request.json();
    if(!imageData)return NextResponse.json({error:"Image is required."},{status:400});
    const base64=String(imageData).replace(/^data:[^;]+;base64,/,'');
    if(base64.length>8_000_000)return NextResponse.json({error:"Image is too large. Please use an image under 6 MB."},{status:413});
    const dimensions=sizeFromBase64(base64);
    const analysis={
      type:"uploaded-image",
      mimeType,
      dimensions,
      likelyUI: Boolean(uiAnalysis?.likelyUI),
      detectedRegions:Array.isArray(uiAnalysis?.detectedRegions)?uiAnalysis.detectedRegions.slice(0,30):[],
      dominantColors:Array.isArray(uiAnalysis?.dominantColors)?uiAnalysis.dominantColors.slice(0,12):[],
      textHints:Array.isArray(uiAnalysis?.textHints)?uiAnalysis.textHints.slice(0,30):[],
      notes:["Processed without a paid image API.","Use this visual analysis as reference input for Soolen AI modification.","No private-person identification is performed."]
    };
    return NextResponse.json({success:true,engine:"Soolen AI Local Vision",cost:"0",result:JSON.stringify(analysis)});
  }catch(error){console.error("SOOLEN_LOCAL_VISION_ERROR:",error);return NextResponse.json({error:error?.message||"Unable to analyze image."},{status:500});}
}
