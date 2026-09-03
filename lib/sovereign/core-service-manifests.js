import {defineSovereignServiceManifest} from "./service-manifest.js";

export const IDENTITY_SERVICE_MANIFEST=defineSovereignServiceManifest({serviceId:"identity",displayName:"LANERIQ Identity Service",version:"1.0",requiredByLaneriq:true,currentMode:"embedded",deploymentModes:["embedded","remote"],capabilities:["resolve_session","authorize","revoke_session","capabilities"],dependencies:[],fallbackModes:["embedded","fail_closed"],dataBoundary:"identity_contract_only",providerBoundary:"authority_adapter_only"});

export const WORKFLOW_SERVICE_MANIFEST=defineSovereignServiceManifest({serviceId:"workflow",displayName:"LANERIQ Workflow Service",version:"1.0",requiredByLaneriq:false,currentMode:"embedded",deploymentModes:["embedded","remote"],capabilities:["plan","run","resume","cancel","status"],dependencies:["identity"],fallbackModes:["embedded","degraded"],dataBoundary:"workflow_contract_only",providerBoundary:"engine_adapter_only"});

export const MEDIA_SERVICE_MANIFEST=defineSovereignServiceManifest({serviceId:"media",displayName:"LANERIQ Media Service",version:"1.0",requiredByLaneriq:false,currentMode:"embedded",deploymentModes:["embedded","remote"],capabilities:["image_generate","video_generate","avatar_generate","transform","status"],dependencies:["identity"],fallbackModes:["embedded","degraded"],dataBoundary:"media_contract_only",providerBoundary:"engine_adapter_only"});

export const GAME_SERVICE_MANIFEST=defineSovereignServiceManifest({serviceId:"game",displayName:"LANERIQ Game Runtime Service",version:"1.0",requiredByLaneriq:false,currentMode:"embedded",deploymentModes:["embedded","remote"],capabilities:["build","simulate","matchmake","state_sync","verify","status"],dependencies:["identity"],fallbackModes:["embedded","degraded"],dataBoundary:"game_contract_only",providerBoundary:"engine_adapter_only"});

export const CORE_EXTRACTABLE_SERVICES=Object.freeze([IDENTITY_SERVICE_MANIFEST,WORKFLOW_SERVICE_MANIFEST,MEDIA_SERVICE_MANIFEST,GAME_SERVICE_MANIFEST]);
