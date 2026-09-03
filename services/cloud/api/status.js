export default function handler(_req,res){
 const secretReady=String(process.env.LANERIQ_CLOUD_SERVICE_SECRET||"").length>=32;
 const adapterUrl=String(process.env.LANERIQ_CLOUD_STORAGE_ADAPTER_URL||"").trim();
 let adapterReady=false;try{adapterReady=new URL(adapterUrl).protocol==="https:"}catch{}
 res.setHeader("Cache-Control","no-store");
 res.status(200).json({service:"laneriq-cloud-data",contract:"csvc1",mode:"standalone",signedRequestsRequired:true,tripleScopeRequired:true,arbitraryQueryAllowed:false,providerOpaque:true,serviceSecretReady:secretReady,storageAdapterReady:adapterReady,evidenceLevel:"CODE_READY",live:false});
}
