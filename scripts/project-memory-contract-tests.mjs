import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { sanitizeMemoryJson, mergeProjectMemory, buildProjectMemoryBrief } from '../lib/project-memory.js';

const root=process.cwd();
const read=p=>fs.readFileSync(path.join(root,p),'utf8');

const route=read('app/api/apps/[id]/memory/route.js');
const generate=read('app/api/generate/route.js');
const modify=read('app/api/modify/route.js');
const bootstrap=read('app/api/apps/[id]/bootstrap/route.js');
const migration=read('supabase/migrations/20260901105712_harden_project_memory_contract.sql');

const dirty={
  requested_name:'Memory Project',
  brand_preferences:{primaryColor:'#123456',api_token:'must-not-survive',nested:{bad:true}},
  visual_preferences:{themeMode:'dark',wallpaperPreset:'moon-city'},
  user_preferences:{density:'comfortable'},
  workflow_preferences:{approvalMode:'manual'},
  content_guidance:'x'.repeat(7000),
  media_preferences:Array.from({length:35},(_,i)=>({assetId:`asset-${i}`,page:'Home',secret:'drop-me'})),
  industry_plan:{profile_id:'real-estate',label:'Property',pages:Array.from({length:35},(_,i)=>`Page ${i}`),data:['clients','properties'],workflows:['lead follow-up'],roles:['agent']},
  learned_from:Array.from({length:20},(_,i)=>`source-${i}`),
  rawPrivateAssetsReusableAcrossCustomers:true,
  unknownPrivateBlob:'drop-me',
};
const clean=sanitizeMemoryJson(dirty);
assert.equal(clean.requestedName,'Memory Project');
assert.equal(clean.brandPreferences.primaryColor,'#123456');
assert.equal('api_token' in clean.brandPreferences,false);
assert.equal('nested' in clean.brandPreferences,false);
assert.equal(clean.contentGuidance.length,6000);
assert.equal(clean.mediaPreferences.length,30);
assert.equal(clean.mediaPreferences.some(item=>'secret' in item),false);
assert.equal(clean.industryPlan.profileId,'real-estate');
assert.equal(clean.industryPlan.pages.length,30);
assert.equal(clean.learnedFrom.length,12);
assert.equal(clean.rawPrivateAssetsReusableAcrossCustomers,false);
assert.equal('unknownPrivateBlob' in clean,false);

const merged=mergeProjectMemory({brandPreferences:{primaryColor:'#111111',brandVoice:'warm'},visualPreferences:{themeMode:'light'}},{brandPreferences:{primaryColor:'#222222'},visualPreferences:{wallpaperPreset:'city'},mediaPreferences:[{assetId:'owned-asset',page:'Home',role:'hero'}]});
assert.equal(merged.brandPreferences.primaryColor,'#222222');
assert.equal(merged.brandPreferences.brandVoice,'warm');
assert.equal(merged.visualPreferences.themeMode,'light');
assert.equal(merged.visualPreferences.wallpaperPreset,'city');
assert.equal(merged.mediaPreferences[0].assetId,'owned-asset');
const brief=buildProjectMemoryBrief({memory_json:merged});
assert.match(brief,/PROJECT MEMORY/);
assert.match(brief,/Brand preferences/);
assert.match(brief,/customer-owned media\/reference placement preferences/i);
assert.match(brief,/not permission to reuse private assets across customers/i);

assert.match(route,/auth\.getUser\(\)/);
assert.match(route,/\.eq\("owner_id",user\.id\)/);
assert.match(route,/MAX_MEMORY_REQUEST_BYTES=262144/);
assert.match(route,/Buffer\.byteLength\(JSON\.stringify\(patch\),"utf8"\)/);
assert.match(route,/sanitizeMemoryJson/);
assert.match(route,/Cache-Control":"no-store"/);

assert.match(generate,/mergeProjectMemory/);
assert.match(generate,/brandPreferences:brandKit/);
assert.match(generate,/industryPlan:industryPlan\.matched/);
assert.match(generate,/mediaPreferences:mediaAssignments\.map/);
assert.match(generate,/learning_scope:memoryScope/);
assert.match(generate,/projectLearning:\{scope:memoryScope,saved:!memoryError\}/);

assert.match(modify,/buildProjectMemoryBrief/);
assert.match(modify,/from\("project_memory"\).*eq\("app_id",appId\).*eq\("owner_id",user\.id\)/s);
assert.match(modify,/const memoryBrief=buildProjectMemoryBrief\(memoryRow\)/);
assert.match(modify,/memoryBrief\?`\\n\$\{memoryBrief\}\\n`/);
assert.match(modify,/mergeProjectMemory\(memoryRow\?\.memory_json/);
assert.match(modify,/lastModificationInstruction:instruction/);

assert.match(migration,/project_memory_json_is_safe/);
assert.match(migration,/octet_length\(p_memory::text\) > 131072/);
assert.match(migration,/rawPrivateAssetsReusableAcrossCustomers/);
assert.match(migration,/password\|passwd\|secret\|token\|api\[_-\]\?key/);
assert.match(migration,/project_memory_json_safe_check/);
assert.match(migration,/exists \(select 1 from public\.apps a where a\.id = project_memory\.app_id and a\.owner_id = \(select auth\.uid\(\)\)\)/);
assert.match(migration,/revoke all on public\.project_memory from anon/);
assert.match(migration,/grant select, insert, update, delete on public\.project_memory to authenticated/);
assert.match(migration,/revoke truncate, references, trigger on public\.project_memory from authenticated/);

assert.match(bootstrap,/Sensitive writes require server-side validation/);
assert.match(bootstrap,/No API keys, passwords or payment credentials in generated business tables/);
assert.match(bootstrap,/Deletion\/export paths should exist for personal data where relevant/);

console.log('✓ Project Memory sanitizes and bounds brand, visual, user, workflow, industry and media/reference preferences');
console.log('✓ Project Memory is owner-scoped, no-store, request-bounded and database-constrained');
console.log('✓ Generate persists canonical project memory and Modify reads it into the AI prompt before saving updates');
console.log('✓ Private assets/secrets cannot become reusable cross-customer memory');
console.log('✓ Bootstrap database policy remains aligned with the hardened Database/Supabase contract');
