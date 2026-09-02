import crypto from "node:crypto";
import { createAdminClient } from "../supabase/admin.js";

export const LANERIQ_SESSION_COOKIE="laneriq_session";
export const LANERIQ_SESSION_MODE_COOKIE="laneriq_session_mode";
export const LANERIQ_SESSION_MODE_VALUE="primary";
export const LANERIQ_SESSION_TTL_SECONDS=7*24*60*60;

function sessionSecret(){
  const secret=String(
    process.env.LANERIQ_SESSION_SECRET||
    process.env.LANERIQ_VERIFICATION_SECRET||
    process.env.LANERIQ_COMMUNICATION_PRIVACY_SECRET||
    ""
  );
  if(secret.length<32)throw new Error("LANERIQ session secret is not configured.");
  return crypto.createHmac("sha256",secret).update("laneriq-session-authority-v1").digest();
}

function tokenHash(token){
  return crypto.createHmac("sha256",sessionSecret()).update(`session:${String(token||"")}`).digest("hex");
}

function validRawToken(token){return /^[A-Za-z0-9_-]{43}$/.test(String(token||""));}

export function laneriqSessionCookieOptions(){
  return {
    httpOnly:true,
    secure:process.env.NODE_ENV==="production",
    sameSite:"lax",
    path:"/",
    maxAge:LANERIQ_SESSION_TTL_SECONDS,
  };
}

export function laneriqSessionModeCookieOptions(){
  return {
    httpOnly:true,
    secure:process.env.NODE_ENV==="production",
    sameSite:"lax",
    path:"/",
    maxAge:365*24*60*60,
  };
}

export function laneriqSessionClearCookieOptions(){
  return {
    httpOnly:true,
    secure:process.env.NODE_ENV==="production",
    sameSite:"lax",
    path:"/",
    maxAge:0,
    expires:new Date(0),
  };
}

export function isLaneriqPrimarySessionMode(value){return String(value||"")===LANERIQ_SESSION_MODE_VALUE;}

export async function createLaneriqSession(userId){
  const normalized=String(userId||"").trim();
  if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(normalized))throw new Error("Invalid LANERIQ session subject.");
  const token=crypto.randomBytes(32).toString("base64url");
  const id=crypto.randomUUID();
  const expiresAt=new Date(Date.now()+LANERIQ_SESSION_TTL_SECONDS*1000).toISOString();
  const admin=createAdminClient();
  const {data,error}=await admin.rpc("laneriq_create_session",{
    p_id:id,
    p_token_hash:tokenHash(token),
    p_user_id:normalized,
    p_expires_at:expiresAt,
  });
  const row=Array.isArray(data)?data[0]:null;
  if(error||!row?.session_id||String(row.user_id)!==normalized)throw new Error("LANERIQ session could not be created.");
  return {token,userId:normalized,sessionId:String(row.session_id),expiresAt:String(row.expires_at||expiresAt)};
}

export async function validateLaneriqSessionToken(token){
  if(!validRawToken(token))return null;
  const admin=createAdminClient();
  const {data,error}=await admin.rpc("laneriq_validate_session",{p_token_hash:tokenHash(token)});
  if(error)throw new Error("LANERIQ session validation is unavailable.");
  const row=Array.isArray(data)?data[0]:null;
  if(!row?.session_id||!row?.user_id)return null;
  return {sessionId:String(row.session_id),userId:String(row.user_id),expiresAt:String(row.expires_at||"")};
}

export async function revokeLaneriqSessionToken(token){
  if(!validRawToken(token))return false;
  const admin=createAdminClient();
  const {data,error}=await admin.rpc("laneriq_revoke_session",{p_token_hash:tokenHash(token)});
  if(error)throw new Error("LANERIQ session revocation is unavailable.");
  return data===true;
}

export function laneriqSessionStatus(){
  return {
    service:"LANERIQ Session Authority",
    authority:"laneriq",
    opaqueToken:true,
    tokenStoredAsHmacOnly:true,
    httpOnlyCookie:true,
    primaryModeMarker:true,
    staleCompatibilityFallbackBlocked:true,
    infrastructureFailuresFailClosed:true,
    sameSite:"lax",
    ttlSeconds:LANERIQ_SESSION_TTL_SECONDS,
    storageAdapter:"replaceable",
  };
}
