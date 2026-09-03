export default function handler(_req,res){
 const secretReady=String(process.env.LANERIQ_GENERATION_SERVICE_SECRET||"").length>=32;
 const adapterUrl=String(process.env.LANERIQ_GENERATION_ENGINE_ADAPTER_URL||"").trim();
 let adapterReady=false;try{adapterReady=new URL(adapterUrl).protocol==="https:"}catch{}
 res.setHeader("Cache-Control","no-store");
 res.status(200).json({service:"laneriq-generation",contract:"gsvc1",mode:"standalone",signedRequestsRequired:true,providerOpaque:true,serviceSecretReady:secretReady,engineAdapterReady:adapterReady,evidenceLevel:"CODE_READY",live:false});
}
