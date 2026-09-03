module.exports = async function handler(req,res){
  if(req.method!=="GET")return res.status(405).json({ok:false,error:"GET only"});
  const supabaseUrl=String(process.env.SUPABASE_URL||process.env.NEXT_PUBLIC_SUPABASE_URL||"").trim();
  const serviceKey=String(process.env.SUPABASE_SECRET_KEY||process.env.SUPABASE_SERVICE_ROLE_KEY||"").trim();
  const authSecret=String(process.env.LANERIQ_COMMUNICATIONS_SERVICE_SECRET||"").trim();
  const clientId=String(process.env.LANERIQ_COMMUNICATIONS_SERVICE_CLIENT_ID||"laneriq-ai").trim();
  const databaseReady=Boolean(supabaseUrl&&serviceKey);
  const signedDispatchReady=authSecret.length>=32&&/^[A-Za-z0-9._:-]{1,180}$/.test(clientId);
  res.setHeader("Cache-Control","private, no-store, max-age=0");
  return res.status(200).json({
    ok:true,
    service:"LANERIQ OmniChannel Communication Service",
    version:"1.0",
    architecture:"standalone_service_host",
    deploymentMode:"independent_root_ready",
    evidenceLevel:"CODE",
    liveVerified:false,
    databaseReady,
    signedDispatchReady,
    externalSpendCap:0,
    automaticFallbackAfterRemoteAttempt:false,
    channels:{
      in_app:{costClass:"free",runtimeReady:databaseReady,providerReady:databaseReady,liveVerified:false},
      whatsapp:{costClass:"customer_or_provider",runtimeReady:false,providerReady:false,liveVerified:false},
      telegram:{costClass:"free_or_customer",runtimeReady:false,providerReady:false,liveVerified:false},
      line:{costClass:"customer_or_provider",runtimeReady:false,providerReady:false,liveVerified:false},
      wechat:{costClass:"customer_or_provider",runtimeReady:false,providerReady:false,liveVerified:false},
      sms:{costClass:"paid",runtimeReady:false,providerReady:false,liveVerified:false,blockedByDefault:true}
    }
  });
};
