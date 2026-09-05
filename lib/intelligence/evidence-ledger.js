import crypto from 'node:crypto';
import { UNIFIED_TRUTH_LEVELS } from './unified-intelligence-contract.js';

const freeze=value=>Object.freeze(value);
const clean=(value,max=500)=>String(value??'').replace(/[\u0000-\u001f\u007f]/g,'').trim().slice(0,max);
const ID=/^[A-Za-z0-9._:-]{1,160}$/;
const SHA=/^[a-f0-9]{64}$/;
const LEVELS=Object.freeze({CODE:0,PROVIDED:1,OBSERVED:2,SIGNED_OBSERVED:3,INDEPENDENT_VERIFIED:4,LIVE_VERIFIED:5});
const FORBIDDEN_KEYS=/^(raw|rawPrompt|prompt|privateContent|fileContent|mediaBytes|secret|password|token|apiKey|credential|userIdentity|chatContent)$/i;

function canonical(value){if(Array.isArray(value))return value.map(canonical);if(value&&typeof value==='object')return Object.fromEntries(Object.keys(value).sort().map(key=>[key,canonical(value[key])]));return value;}
function digest(value){return crypto.createHash('sha256').update(JSON.stringify(canonical(value))).digest('hex');}
function safeId(value,code){const id=clean(value,160);if(!ID.test(id))throw new Error(code);return id;}
function safeMetadata(value,depth=0){
  if(depth>6)throw new Error('UNIFIED_EVIDENCE_METADATA_DEPTH');
  if(value===null||['string','number','boolean'].includes(typeof value))return typeof value==='string'?clean(value,500):value;
  if(Array.isArray(value))return value.slice(0,64).map(item=>safeMetadata(item,depth+1));
  if(value&&typeof value==='object'){
    const out={};for(const [key,item] of Object.entries(value)){if(FORBIDDEN_KEYS.test(key))throw new Error('UNIFIED_EVIDENCE_PRIVATE_FIELD_FORBIDDEN');out[clean(key,80)]=safeMetadata(item,depth+1);}return out;
  }
  return null;
}
function freezeLedger(ledger){return freeze({...ledger,entries:freeze(ledger.entries.map(row=>freeze({...row,metadata:freeze(row.metadata)})))});}

export const EVIDENCE_LEVELS=freeze({...LEVELS});

export function createEvidenceLedger({worldId,projectId}={}){
  return freezeLedger({schemaVersion:1,worldId:safeId(worldId,'UNIFIED_EVIDENCE_WORLD_ID_INVALID'),projectId:safeId(projectId,'UNIFIED_EVIDENCE_PROJECT_ID_INVALID'),entries:[],headHash:'0'.repeat(64),appendOnly:true,privacyScope:'project',truth:UNIFIED_TRUTH_LEVELS.CODE_READY});
}

export function appendEvidence(ledger,input={}){
  if(!ledger?.worldId||!Array.isArray(ledger.entries)||!SHA.test(String(ledger.headHash||'')))throw new Error('UNIFIED_EVIDENCE_LEDGER_INVALID');
  const evidenceId=safeId(input.evidenceId,'UNIFIED_EVIDENCE_ID_INVALID');if(ledger.entries.some(row=>row.evidenceId===evidenceId))throw new Error('UNIFIED_EVIDENCE_REPLAY');
  const level=clean(input.level,40).toUpperCase();if(!(level in LEVELS))throw new Error('UNIFIED_EVIDENCE_LEVEL_INVALID');
  const artifactHash=clean(input.artifactHash||input.sha256,64).toLowerCase();
  if(LEVELS[level]>=LEVELS.OBSERVED&&!SHA.test(artifactHash))throw new Error('UNIFIED_EVIDENCE_ARTIFACT_HASH_REQUIRED');
  const observedAt=clean(input.observedAt,40)||new Date().toISOString();if(!Number.isFinite(Date.parse(observedAt)))throw new Error('UNIFIED_EVIDENCE_TIMESTAMP_INVALID');
  const expiresAt=clean(input.expiresAt,40)||null;if(expiresAt&&!Number.isFinite(Date.parse(expiresAt)))throw new Error('UNIFIED_EVIDENCE_EXPIRY_INVALID');
  const independent=input.independent===true;const signed=input.signed===true;const provenanceVerified=input.provenanceVerified===true;
  if(LEVELS[level]>=LEVELS.SIGNED_OBSERVED&&!signed)throw new Error('UNIFIED_EVIDENCE_SIGNATURE_REQUIRED');
  if(LEVELS[level]>=LEVELS.INDEPENDENT_VERIFIED&&(!independent||!provenanceVerified))throw new Error('UNIFIED_EVIDENCE_INDEPENDENT_PROVENANCE_REQUIRED');
  const metadata=safeMetadata(input.metadata&&typeof input.metadata==='object'?input.metadata:{});
  const core={
    evidenceId,claimId:clean(input.claimId,160)||null,type:clean(input.type||'observation',80)||'observation',level,
    artifactHash:SHA.test(artifactHash)?artifactHash:null,observerId:clean(input.observerId,160)||null,
    sourceId:clean(input.sourceId,160)||null,observedAt,expiresAt,independent,signed,provenanceVerified,
    uncertainty:Number.isFinite(Number(input.uncertainty))?Math.max(0,Math.min(1,Number(input.uncertainty))):null,
    previousHash:ledger.headHash,metadata,
  };
  const entryHash=digest(core);return freezeLedger({...ledger,headHash:entryHash,entries:[...ledger.entries,{...core,entryHash}]});
}

export function assessEvidence(ledger,{evidenceIds=[],minimumLevel='OBSERVED',now=Date.now(),requireIndependent=false,artifactHash=null}={}){
  if(!ledger?.entries)throw new Error('UNIFIED_EVIDENCE_LEDGER_INVALID');
  const minimum=clean(minimumLevel,40).toUpperCase();if(!(minimum in LEVELS))throw new Error('UNIFIED_EVIDENCE_LEVEL_INVALID');
  const wanted=[...new Set((Array.isArray(evidenceIds)?evidenceIds:[]).map(value=>clean(value,160)).filter(Boolean))];
  const rows=wanted.length?ledger.entries.filter(row=>wanted.includes(row.evidenceId)):ledger.entries;
  const targetHash=artifactHash?clean(artifactHash,64).toLowerCase():null;
  const eligible=rows.filter(row=>LEVELS[row.level]>=LEVELS[minimum]&&(!requireIndependent||row.independent===true)&&(!row.expiresAt||Date.parse(row.expiresAt)>Number(now))&&(!targetHash||row.artifactHash===targetHash));
  const missing=wanted.filter(id=>!eligible.some(row=>row.evidenceId===id));
  const highest=eligible.reduce((best,row)=>LEVELS[row.level]>LEVELS[best]?row.level:best,'CODE');
  return freeze({ok:eligible.length>0&&missing.length===0,minimumLevel:minimum,highestLevel:highest,eligible:freeze(eligible),missing:freeze(missing),staleOrInsufficient:freeze(rows.filter(row=>!eligible.includes(row)).map(row=>row.evidenceId)),truth:eligible.length?UNIFIED_TRUTH_LEVELS.OBSERVED_VERIFIED:UNIFIED_TRUTH_LEVELS.EVIDENCE_REQUIRED});
}

export function verifyEvidenceLedger(ledger){
  if(!ledger?.entries)return freeze({ok:false,reason:'invalid-ledger'});let previous='0'.repeat(64);
  for(const row of ledger.entries){const core={evidenceId:row.evidenceId,claimId:row.claimId??null,type:row.type,level:row.level,artifactHash:row.artifactHash??null,observerId:row.observerId??null,sourceId:row.sourceId??null,observedAt:row.observedAt,expiresAt:row.expiresAt??null,independent:row.independent===true,signed:row.signed===true,provenanceVerified:row.provenanceVerified===true,uncertainty:row.uncertainty??null,previousHash:row.previousHash,metadata:row.metadata||{}};if(row.previousHash!==previous||digest(core)!==row.entryHash)return freeze({ok:false,reason:'hash-chain-invalid',evidenceId:row.evidenceId});previous=row.entryHash;}
  return freeze({ok:previous===ledger.headHash,entryCount:ledger.entries.length,headHash:previous});
}
