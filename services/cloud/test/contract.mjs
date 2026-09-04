import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { validateCloudServiceRequest,CLOUD_SERVICE_CONTRACT } from '../../../lib/cloud-service/contract.js';
import { verifyLaneriqMainProductionPeer } from '../lib/vercel-oidc.js';

const root=process.cwd(),read=p=>fs.readFileSync(path.join(root,p),'utf8');
const gateway=read('lib/cloud-service/gateway.js'),operate=read('services/cloud/api/operate.js'),security=read('services/cloud/lib/security.js'),oidc=read('services/cloud/lib/vercel-oidc.js'),status=read('services/cloud/api/status.js'),hostStatus=read('app/api/cloud/service-status/route.js'),manifest=JSON.parse(read('services/cloud/deployment.manifest.json'));

assert.equal(CLOUD_SERVICE_CONTRACT.version,'csvc1');assert.equal(CLOUD_SERVICE_CONTRACT.arbitraryQueryAllowed,false);
assert.equal(validateCloudServiceRequest({operation:'project.read',requestId:'req-1',tenantId:'tenant-1',userId:'user-1',projectId:'project-1',payload:{}}).ok,true);
assert.equal(validateCloudServiceRequest({operation:'project.read',requestId:'req-1',tenantId:'',userId:'user-1',projectId:'project-1',payload:{}}).code,'INVALID_SCOPE_IDENTITY');
assert.equal(validateCloudServiceRequest({operation:'project.write',requestId:'req-1',tenantId:'tenant-1',userId:'user-1',projectId:'project-1',payload:{service_role:'x'}}).code,'RAW_SECRET_FORBIDDEN');
assert.equal(validateCloudServiceRequest({operation:'project.write',requestId:'req-1',tenantId:'tenant-1',userId:'user-1',projectId:'project-1',payload:{query:'delete from users'}}).code,'ARBITRARY_QUERY_FORBIDDEN');

assert.match(gateway,/VERCEL_OIDC_TOKEN/);assert.match(gateway,/x-vercel-oidc-token/);assert.match(gateway,/"x-laneriq-cloud-contract":CONTRACT/);assert.match(gateway,/headers\.authorization=`Bearer \$\{oidc\}`/);assert.match(gateway,/secret\.length>=32/);assert.match(gateway,/remote-unavailable/);assert.match(gateway,/CLOUD_SERVICE_AUTH_REQUIRED/);assert.match(gateway,/productionRuntime\(\)/);assert.match(gateway,/CLOUD_SERVICE_UNREACHABLE/);const ci=gateway.indexOf('catch(error)');assert.ok(ci>=0);assert.doesNotMatch(gateway.slice(ci),/return embedded\(/);
assert.match(security,/timingSafeEqual/);assert.match(operate,/verifyLaneriqMainProductionPeer/);assert.match(operate,/verifySignedCloudRequest\(req, raw\)/);assert.match(operate,/hmac-sha256-migration/);assert.match(operate,/authenticationMigrationCompatibility/);assert.match(operate,/HMAC_MIGRATION_FALLBACK/);assert.doesNotMatch(operate,/error: "OIDC_REQUIRED"/);assert.match(operate,/requestAuthenticationMode/);assert.match(operate,/serviceReleaseSha/);assert.match(operate,/serviceEnvironment/);assert.match(operate,/CLOUD_STORAGE_ADAPTER_NOT_READY/);assert.match(operate,/LANERIQ_CLOUD_STORAGE_ADAPTER_SECRET\|\|process\.env\.LANERIQ_CLOUD_SERVICE_SECRET/);assert.match(operate,/"authorization":`Bearer \$\{adapterSecret\}`/);
assert.match(oidc,/LANERIQ_MAIN_PROJECT_ID = "prj_Q6mR7lmYGGKCW0ARu2Fgm9Pyzfcl"/);assert.match(oidc,/LANERIQ_MAIN_PROJECT_NAME = "laneriq-ai"/);assert.match(oidc,/environment: "production"/);assert.match(oidc,/crypto\.verify\("RSA-SHA256"/);
assert.match(hostStatus,/PRODUCTION_CLOUD_OIDC_REQUIRED/);assert.match(hostStatus,/PRODUCTION_LIVE_OIDC_EXACT_SHA/);assert.match(hostStatus,/exactReleaseIdentity/);assert.match(hostStatus,/localReleaseSha/);assert.match(hostStatus,/remoteReleaseSha/);assert.match(hostStatus,/secretlessPeerAuthentication/);assert.match(hostStatus,/expectedAuthenticationMode = oidc\.token \? "VERCEL_OIDC" : "HMAC_SHA256"/);assert.match(hostStatus,/expectedAuthenticationMode !== "VERCEL_OIDC"/);
assert.match(status,/peerAuthenticationPreferred: "VERCEL_OIDC"/);assert.match(status,/HMAC_SHA256_MIGRATION_ONLY/);assert.match(status,/productionOidcRequirementScope: "LIVE_EVIDENCE"/);assert.match(status,/productionOidcRequiredForTraffic: false/);assert.match(status,/productionOidcRequiredForLive: true/);assert.match(status,/rollingUpgradeNoDowntime: true/);assert.match(status,/legacyHmacRemovalGate: "OIDC_EXACT_SHA_LIVE_EVIDENCE"/);assert.match(status,/exactReleaseIdentityRequiredForLive: true/);assert.match(status,/live: false/);

assert.deepEqual(manifest.requiredEnvironment,["LANERIQ_CLOUD_STORAGE_ADAPTER_URL"]);assert.deepEqual(manifest.requiredAnyOf,[["LANERIQ_CLOUD_STORAGE_ADAPTER_SECRET","LANERIQ_CLOUD_SERVICE_SECRET"]]);assert.ok(manifest.optionalEnvironment.includes('LANERIQ_CLOUD_SERVICE_SECRET'));assert.ok(manifest.optionalEnvironment.includes('LANERIQ_CLOUD_STORAGE_ADAPTER_SECRET'));
assert.equal(manifest.peerAuthentication.preferred,'VERCEL_OIDC');assert.equal(manifest.peerAuthentication.fallback,'HMAC_SHA256_MIGRATION_ONLY');assert.equal(manifest.peerAuthentication.productionRequiresOidcForLive,true);assert.equal(manifest.peerAuthentication.productionAllowsSignedHmacDuringRollingUpgrade,true);assert.equal(manifest.peerAuthentication.legacyHmacRemovalGate,'OIDC_EXACT_SHA_LIVE_EVIDENCE');assert.equal(manifest.peerAuthentication.sharedPeerSecretRequired,false);
assert.equal(manifest.security.oidcIdentityVerification,true);assert.equal(manifest.security.productionOidcFailClosedForLive,true);assert.equal(manifest.security.rollingUpgradeNoDowntime,true);assert.equal(manifest.security.tripleScopeRequired,true);assert.equal(manifest.security.arbitraryQueryAllowed,false);assert.equal(manifest.security.rawProviderCredentialsForbidden,true);assert.equal(manifest.evidence.exactReleaseIdentityRequiredForLive,true);assert.equal(manifest.evidence.productionRuntimeEvidenceRequired,true);assert.equal(manifest.evidence.hmacCompatibilityDoesNotCountAsLive,true);assert.equal(manifest.evidence.standaloneLive,false);
for(const source of [gateway,operate,security])assert.doesNotMatch(source,/@supabase|SUPABASE_SERVICE|VERCEL_TOKEN|AWS_|cloudflare/i,'Cloud service boundary must remain provider-opaque.');

const originalFetch=globalThis.fetch;
try{
  const {publicKey,privateKey}=crypto.generateKeyPairSync('rsa',{modulusLength:2048});
  const jwk=publicKey.export({format:'jwk'});jwk.kid='laneriq-cloud-test';jwk.alg='RS256';jwk.use='sig';
  globalThis.fetch=async()=>({ok:true,json:async()=>({keys:[jwk]})});
  const now=Math.floor(Date.now()/1000);
  const header=Buffer.from(JSON.stringify({typ:'JWT',alg:'RS256',kid:jwk.kid})).toString('base64url');
  const makeToken=(environment)=>{
    const payload=Buffer.from(JSON.stringify({
      iss:'https://oidc.vercel.com/bryanbtxz-7929s-projects',
      aud:'https://vercel.com/bryanbtxz-7929s-projects',
      sub:`owner:bryanbtxz-7929s-projects:project:laneriq-ai:environment:${environment}`,
      owner:'bryanbtxz-7929s-projects',owner_id:'team_r2xREQWKQzVw1bdswbpW5j8Y',
      project:'laneriq-ai',project_id:'prj_Q6mR7lmYGGKCW0ARu2Fgm9Pyzfcl',environment,iat:now,nbf:now,exp:now+600,
    })).toString('base64url');
    const input=`${header}.${payload}`;
    const signature=crypto.sign('RSA-SHA256',Buffer.from(input),privateKey).toString('base64url');
    return `${input}.${signature}`;
  };
  const verified=await verifyLaneriqMainProductionPeer({headers:{authorization:`Bearer ${makeToken('production')}`}});
  assert.equal(verified.ok,true);assert.equal(verified.identity.project,'laneriq-ai');assert.equal(verified.identity.environment,'production');
  const previewRejected=await verifyLaneriqMainProductionPeer({headers:{authorization:`Bearer ${makeToken('preview')}`}});
  assert.equal(previewRejected.ok,false);assert.equal(previewRejected.status,401);
}finally{globalThis.fetch=originalFetch;}

console.log('✓ Cloud Data contract requires tenant + user + project scope and forbids arbitrary queries');
console.log('✓ Rolling Production upgrades prefer OIDC but keep signed HMAC migration compatibility so independent projects do not create downtime');
console.log('✓ HMAC migration compatibility never counts as OIDC LIVE evidence; Production LIVE still requires verified OIDC plus exact main/Cloud SHA');
console.log('✓ OIDC peer verification pins the LANERIQ main Production project identity and rejects Preview identity');
console.log('✓ Storage adapter authentication remains separately credentialed and provider-opaque');
