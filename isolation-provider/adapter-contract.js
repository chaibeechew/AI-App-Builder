// Real infrastructure adapter contract. Never execute generated code in this service process.
const REQUIRED=["create","putFiles","build","browserTest","destroy"];
export function validatePlatformAdapter(adapter){const missing=REQUIRED.filter(k=>typeof adapter?.[k]!=="function");return {passed:missing.length===0,missing};}
export function createFailClosedPlatformAdapter(){const unavailable=async()=>{throw new Error("REAL_ISOLATION_PLATFORM_NOT_CONFIGURED");};return {create:unavailable,putFiles:unavailable,build:unavailable,browserTest:unavailable,destroy:async()=>({passed:true,status:"nothing-to-destroy"})};}
export function assertIsolationResult(result,kind){if(!result||typeof result!=="object")return {passed:false,status:`invalid-${kind}-result`,errors:[`${kind}-result-not-object`]};if(result.passed!==true&&result.passed!==false&&result.passed!==null)return {passed:false,status:`invalid-${kind}-result`,errors:[`${kind}-passed-invalid`]};return result;}
