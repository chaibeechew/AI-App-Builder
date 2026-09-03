const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const STORE_METADATA_DRAFT_MAX_BYTES=24*1024;
export const STORE_METADATA_SAVE_MAX_BYTES=32*1024;
export const STORE_METADATA_APPROVAL_MAX_BYTES=4*1024;
export const STORE_DECLARATIONS_MAX_BYTES=12*1024;
export const STORE_LISTING_MAX_BYTES=24*1024;

function plainObject(value){return value&&typeof value==="object"&&!Array.isArray(value)?value:{};}
export function cleanStoreText(value,max=500){return String(value??"").replace(/[\u0000-\u001f\u007f]/g," ").trim().replace(/\s+/g," ").slice(0,max);}
export function isStoreUuid(value){return UUID.test(String(value||"").trim());}

export async function readBoundedStoreJson(request,maxBytes){
  const declared=Number(request.headers.get("content-length")||0);
  if(Number.isFinite(declared)&&declared>maxBytes)return{ok:false,status:413,error:"Request is too large."};
  const value=await request.json().catch(()=>null);
  if(!value||typeof value!=="object"||Array.isArray(value))return{ok:false,status:400,error:"Invalid JSON request."};
  let bytes=0;
  try{bytes=Buffer.byteLength(JSON.stringify(value),"utf8");}catch{return{ok:false,status:400,error:"Invalid JSON request."};}
  if(bytes>maxBytes)return{ok:false,status:413,error:"Request is too large."};
  return{ok:true,value,bytes};
}

const CUSTOMER_ANSWER_LIMITS={
  privacyPolicyUrl:500,
  supportUrl:500,
  websiteUrl:500,
  supportEmail:200,
  targetAudience:300,
  sellerType:40,
};
const CUSTOMER_BOOLEAN_KEYS=[
  "loginRequired","collectsPersonalData","containsAds","paidFeatures","sharesPersonalData",
  "dataEncryptedInTransit","accountDeletionAvailable","childDirected",
];
export function sanitizeStoreCustomerAnswers(value){
  const input=plainObject(value),out={};
  for(const [key,max] of Object.entries(CUSTOMER_ANSWER_LIMITS)){
    const clean=cleanStoreText(input[key],max);if(clean)out[key]=clean;
  }
  for(const key of CUSTOMER_BOOLEAN_KEYS){
    if(input[key]===true||input[key]===false)out[key]=input[key];
    else if(String(input[key]||"").toLowerCase()==="yes")out[key]=true;
    else if(String(input[key]||"").toLowerCase()==="no")out[key]=false;
  }
  return out;
}

function sanitizeApple(value){
  const input=plainObject(value);
  return{
    name:cleanStoreText(input.name,30),
    subtitle:cleanStoreText(input.subtitle,30),
    keywords:cleanStoreText(input.keywords,300),
    promotionalText:cleanStoreText(input.promotionalText,170),
    description:cleanStoreText(input.description,4000),
    category:cleanStoreText(input.category,60),
    privacyUrl:cleanStoreText(input.privacyUrl,500),
    supportUrl:cleanStoreText(input.supportUrl,500),
    marketingUrl:cleanStoreText(input.marketingUrl,500),
    reviewNotes:cleanStoreText(input.reviewNotes,1200),
  };
}

function sanitizeDataSafety(value){
  const input=plainObject(value),security=plainObject(input.securityPractices),audience=plainObject(input.audience);
  return{
    status:cleanStoreText(input.status,80)||"customer_review_required",
    autoSubmitted:false,
    collectsData:input.collectsData===true,
    sharesData:input.sharesData===true,
    securityPractices:{encryptedInTransit:security.encryptedInTransit===true,accountDeletionAvailable:security.accountDeletionAvailable===true},
    audience:{childDirected:audience.childDirected===true,targetAudience:cleanStoreText(audience.targetAudience,300)},
    source:cleanStoreText(input.source,80)||"customer_answers_draft",
    reviewNote:cleanStoreText(input.reviewNote,1200),
  };
}

function sanitizeGooglePlay(value){
  const input=plainObject(value);
  return{
    title:cleanStoreText(input.title,30),
    shortDescription:cleanStoreText(input.shortDescription,80),
    fullDescription:cleanStoreText(input.fullDescription,4000),
    category:cleanStoreText(input.category,60),
    privacyPolicyUrl:cleanStoreText(input.privacyPolicyUrl,500),
    developerWebsite:cleanStoreText(input.developerWebsite,500),
    contactEmail:cleanStoreText(input.contactEmail,200),
    audienceSummary:cleanStoreText(input.audienceSummary,300),
    dataSafety:sanitizeDataSafety(input.dataSafety),
  };
}

function sanitizeChecklist(value){
  if(!Array.isArray(value))return[];
  return value.slice(0,40).map(item=>{
    const input=plainObject(item);
    return{field:cleanStoreText(input.field,120),required:input.required===true,value:cleanStoreText(input.value,600)};
  }).filter(item=>item.field);
}

export function sanitizeStoreListingPayload({apple,googlePlay,checklist}){
  const normalized={apple:sanitizeApple(apple),googlePlay:sanitizeGooglePlay(googlePlay),checklist:sanitizeChecklist(checklist)};
  const bytes=Buffer.byteLength(JSON.stringify(normalized),"utf8");
  if(bytes>STORE_LISTING_MAX_BYTES)throw new Error("STORE_LISTING_TOO_LARGE");
  return normalized;
}

export function sanitizeStoreDraftInput(value){
  const input=plainObject(value);
  return{
    appName:cleanStoreText(input.appName,160),
    description:cleanStoreText(input.description,6000),
    category:cleanStoreText(input.category,120),
    keywords:cleanStoreText(input.keywords,1000),
    language:cleanStoreText(input.language,12)||"en",
    customerAnswers:sanitizeStoreCustomerAnswers(input.customerAnswers),
  };
}
