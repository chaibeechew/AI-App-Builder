const IMAGE_RE=/^image\//i;

function str(value){return String(value??"").trim();}
function lower(value){return str(value).toLowerCase();}
function present(value){return str(value).length>0;}
function list(value){return Array.isArray(value)?value:[];}

function assetText(asset={}){
  return [asset.file_name,asset.category,asset.placement,asset.suggested_role,asset.role].map(lower).filter(Boolean).join(" ");
}

function isImage(asset={}){
  return IMAGE_RE.test(str(asset.mime_type||asset.mimeType))||/image|photo|picture|screenshot|icon|logo/.test(assetText(asset));
}

export function classifyStoreAssets(assets=[]){
  const rows=list(assets);
  const icons=rows.filter(asset=>isImage(asset)&&/(^|\s)(app[-_ ]?icon|icon|logo)(\s|$)/.test(assetText(asset)));
  const screenshots=rows.filter(asset=>isImage(asset)&&/(screenshot|store[-_ ]?preview|app[-_ ]?preview|iphone[-_ ]?preview|android[-_ ]?preview)/.test(assetText(asset)));
  const generalImages=rows.filter(isImage);
  return {
    total:rows.length,
    imageCount:generalImages.length,
    iconCount:icons.length,
    screenshotCount:screenshots.length,
    iconReady:icons.length>0,
    screenshotsReady:screenshots.length>=2,
  };
}

export function detectPermissionNeeds(specification={}){
  const raw=JSON.stringify(specification||{}).toLowerCase();
  const definitions=[
    {key:"camera",label:"Camera",patterns:[/camera/,/take photo/,/scan qr/,/barcode/]},
    {key:"microphone",label:"Microphone",patterns:[/microphone/,/voice input/,/voice recording/,/record audio/]},
    {key:"location",label:"Location",patterns:[/geolocation/,/\bgps\b/,/location permission/,/current location/,/nearby/]},
    {key:"photos",label:"Photos / media library",patterns:[/photo library/,/media library/,/upload photo/,/image upload/]},
    {key:"notifications",label:"Notifications",patterns:[/push notification/,/notifications? permission/]},
  ];
  return definitions.filter(item=>item.patterns.some(pattern=>pattern.test(raw))).map(item=>({
    key:item.key,
    label:item.label,
    detected:true,
    customerConfirmationRequired:true,
    reason:`${item.label} capability appears in the project. Store privacy/permission declarations must describe the real customer-facing purpose and cannot be invented by AI.`,
  }));
}

export function buildStoreReadiness({specification={},listing=null,assets=[],inferredAnswers={}}={}){
  const apple=listing?.apple||{};
  const google=listing?.google_play||{};
  const assetState=classifyStoreAssets(assets);
  const permissionRequirements=detectPermissionNeeds(specification);
  const checks=[];
  const push=(key,label,status,owner,reason)=>checks.push({key,label,status,owner,reason});

  push("app_name","App name",present(apple.name||google.title)?"ready":"preparable","ai",present(apple.name||google.title)?"Store name is prepared.":"SoolenAI can prepare the store name from the saved project.");
  push("store_description","Store description",present(apple.description||google.fullDescription)?"ready":"preparable","ai",present(apple.description||google.fullDescription)?"Store description is prepared.":"SoolenAI can prepare store descriptions from the saved project.");
  push("app_icon","App icon",assetState.iconReady?"ready":"preparable","ai",assetState.iconReady?"A likely app icon asset is linked to this project.":"No dedicated app icon asset was detected. Image Studio can prepare one, but it must be reviewed before store upload.");
  push("screenshots","Store screenshots",assetState.screenshotsReady?"ready":"preparable","ai",assetState.screenshotsReady?`${assetState.screenshotCount} likely store screenshots are linked.`:"At least two dedicated store screenshot assets were not detected. SoolenAI can prepare screenshot guidance/candidates, but real device layouts must be reviewed.");
  push("privacy_policy","Privacy Policy URL",present(inferredAnswers.privacyPolicyUrl)?"ready":"customer_required","customer",present(inferredAnswers.privacyPolicyUrl)?"A privacy policy URL is present.":"A real reachable Privacy Policy URL must be supplied or confirmed by the customer.");
  push("support","Support contact + URL",present(inferredAnswers.supportEmail)&&present(inferredAnswers.supportUrl)?"ready":"customer_required","customer",present(inferredAnswers.supportEmail)&&present(inferredAnswers.supportUrl)?"Support contact information is present.":"Stores require real support contact details; AI must not invent them.");
  push("target_audience","Target audience",present(inferredAnswers.targetAudience)?"ready":"customer_required","customer",present(inferredAnswers.targetAudience)?"Target audience is present.":"Audience and age suitability are customer/product declarations.");
  push("age_rating","Age / content rating", "customer_required","customer","Age/content-rating questionnaires must be answered truthfully in the official Apple/Google consoles.");
  push("terms","Terms / EULA decision","customer_required","customer","The customer must confirm whether the platform default EULA is sufficient or a custom Terms/EULA URL is required.");
  for(const permission of permissionRequirements)push(`permission_${permission.key}`,`${permission.label} permission purpose`,"customer_required","customer",permission.reason);
  push("apple_account","Apple Developer account","external_required","apple","A valid Apple Developer account and platform fees/signing remain with the customer and Apple.");
  push("apple_bundle","Apple Bundle ID + signing","external_required","apple","Bundle ID, certificates/signing and official App Store Connect actions require the customer's Apple developer account.");
  push("google_account","Google Play developer account","external_required","google","A valid Google Play Console account and platform registration remain with the customer and Google.");
  push("android_package","Android package name + signing","external_required","google","Package/application ID, Android signing key and official Play Console actions require customer-controlled release credentials.");
  push("versioning","Store version/build numbers","preparable","ai","SoolenAI can prepare version/build-number suggestions, but the final submitted values must match the signed release package.");

  const blocking=checks.filter(item=>item.status!=="ready");
  const preparable=checks.filter(item=>item.status==="preparable");
  const customerRequired=checks.filter(item=>item.status==="customer_required");
  const externalRequired=checks.filter(item=>item.status==="external_required");
  const readyCount=checks.length-blocking.length;
  const readinessScore=checks.length?Math.round((readyCount/checks.length)*100):0;
  return {checks,blocking,preparable,customerRequired,externalRequired,permissionRequirements,assets:assetState,readinessScore,readyForCustomerReview:customerRequired.length===0&&preparable.length===0,readyForOfficialSubmission:false};
}
