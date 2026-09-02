// Soolen Platform Operator
// LANERIQ AI is the only customer-facing control plane. Infrastructure vendors are replaceable adapters.

export const SOOLEN_PLATFORM_OPERATOR_VERSION = "1.0.0";
export const USER_PLATFORM_STAGES = Object.freeze(["Build","Verify","Deploy","Publish"]);

export const PLATFORM_OPERATOR_POLICY = Object.freeze({
  customerFacingProduct:"LANERIQ AI",
  operator:"SoolenAI Platform Operator",
  oneAppExperience:true,
  oneSentenceAutomation:true,
  providerOpaqueToCustomer:true,
  providerNamesHiddenFromStandardUI:true,
  infrastructureAdaptersReplaceable:true,
  userMustLinkInfrastructureApps:false,
  ordinaryUserNeedsApiKeys:false,
  secretsServerOnly:true,
  secretsNeverReturnedToClient:true,
  failClosedWhenProviderNotReady:true,
  paidSmsEnabled:false,
  paidSmsFallback:false,
  launchYearPlatformFee:0,
  launchYearMonths:12,
  autoChargeCustomer:false,
});

const INTERNAL_DOMAINS = Object.freeze({
  identity:{label:"Identity",capabilities:["session","authorization","verification"]},
  communications:{label:"Communications",capabilities:["email","whatsapp","templates","fair-use","idempotency"]},
  repository:{label:"Repository",capabilities:["versioning","change-set","rollback"]},
  ci:{label:"Quality",capabilities:["tests","security-gates","build-gates"]},
  deploy:{label:"Deployment",capabilities:["preview","production","rollback"]},
  publish:{label:"Publishing",capabilities:["web","app-store-preparation","release-evidence"]},
  secrets:{label:"Secure Configuration",capabilities:["readiness","rotation-boundary","server-only-access"]},
});

function yes(value){return value===true;}

export function platformReadiness(env=process.env){
  const emailReady=Boolean(env.RESEND_API_KEY||env.SMTP_HOST||env.EMAIL_PROVIDER_URL);
  const whatsappReady=Boolean(env.WHATSAPP_ACCESS_TOKEN&&env.WHATSAPP_PHONE_NUMBER_ID);
  const verificationReady=emailReady||whatsappReady||Boolean(env.NEXT_PUBLIC_SUPABASE_URL&&env.SUPABASE_SERVICE_ROLE_KEY);
  const repoReady=Boolean(env.GITHUB_TOKEN||env.GITHUB_APP_ID||env.LANERIQ_REPOSITORY_BROKER_URL);
  const deployReady=Boolean(env.VERCEL_TOKEN||env.LANERIQ_DEPLOY_BROKER_URL||env.VERCEL_PROJECT_ID);
  return {
    verification:verificationReady,
    communications:emailReady||whatsappReady,
    repository:repoReady,
    ci:true,
    deployment:deployReady,
    publishing:true,
    secrets:true,
  };
}

export function publicPlatformStatus({env=process.env,liveEvidence={}}={}){
  const readiness=platformReadiness(env);
  const stage=[
    {id:"build",label:"Build",ready:true},
    {id:"verify",label:"Verify",ready:readiness.verification},
    {id:"deploy",label:"Deploy",ready:readiness.deployment},
    {id:"publish",label:"Publish",ready:readiness.publishing},
  ];
  return {
    service:"SoolenAI Platform Operator",
    version:SOOLEN_PLATFORM_OPERATOR_VERSION,
    experience:"one-app",
    stages:stage,
    readyCount:stage.filter((item)=>item.ready).length,
    totalStages:stage.length,
    verification:{email:Boolean(liveEvidence.email),whatsapp:Boolean(liveEvidence.whatsapp),codeReady:readiness.verification},
    policy:{
      providerOpaque:true,
      infrastructureLinkingRequired:false,
      apiKeysRequiredFromOrdinaryUsers:false,
      paidSmsFallback:false,
      launchYearPlatformFee:0,
      autoChargeCustomer:false,
    },
  };
}

export function createPlatformOperation({intent,projectId=null,requestedStages=USER_PLATFORM_STAGES}={}){
  const cleanIntent=String(intent||"").trim().slice(0,4000);
  if(!cleanIntent) throw new Error("SOOLEN_PLATFORM_INTENT_REQUIRED");
  const allowed=new Set(USER_PLATFORM_STAGES);
  const stages=[...new Set((Array.isArray(requestedStages)?requestedStages:USER_PLATFORM_STAGES).filter((stage)=>allowed.has(stage)))];
  return {
    operator:"SoolenAI Platform Operator",
    projectId:projectId||null,
    intent:cleanIntent,
    userStages:stages,
    internalDomains:Object.keys(INTERNAL_DOMAINS),
    providerOpaque:true,
    ordinaryUserSetup:"describe-once",
    status:"planned",
  };
}

export function acceptPlatformEvidence(evidence={}){
  return {
    code:yes(evidence.code),
    database:yes(evidence.database),
    ci:yes(evidence.ci),
    production:yes(evidence.production),
    emailLive:yes(evidence.emailLive),
    whatsappLive:yes(evidence.whatsappLive),
  };
}

export const INTERNAL_PLATFORM_DOMAINS=INTERNAL_DOMAINS;
