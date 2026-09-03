export default function handler(_req,res){
 const secretReady=String(process.env.LANERIQ_PUBLISH_SERVICE_SECRET||"").length>=32;
 const adapterUrl=String(process.env.LANERIQ_PUBLISH_DEPLOYMENT_ADAPTER_URL||"").trim();
 let adapterReady=false;try{adapterReady=new URL(adapterUrl).protocol==="https:"}catch{}
 res.setHeader("Cache-Control","no-store");
 res.status(200).json({service:"laneriq-publish",contract:"psvc1",mode:"standalone",signedRequestsRequired:true,artifactDigestRequired:true,providerOpaque:true,serviceSecretReady:secretReady,deploymentAdapterReady:adapterReady,evidenceLevel:"CODE_READY",live:false});
}
