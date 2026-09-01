import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const read=p=>fs.readFileSync(path.join(root,p),'utf8');

const policy=read('lib/pro-mode.js');
const access=read('lib/app-builder-access.js');
const tier=read('lib/soolen/user-tier.js');
const runtime=read('supabase/migrations/20260831120000_preview_access_credit_runtime.sql');
const serverEntitlement=read('supabase/migrations/20260831170000_server_only_entitlements_and_credits.sql');
const proPage=read('app/pro/[id]/page.js');
const gameRoute=read('app/api/game/generate/route.js');
const generate=read('app/api/generate/route.js');
const gameGate=read('app/components/GameProGate.js');

// Commercial Pro product definition is stable and explicit.
assert.match(policy,/id:\s*"professional"/);
assert.match(policy,/professionalUsd:\s*68/);
assert.match(policy,/professionalAccessDays:\s*365/);
assert.match(policy,/professionalAutoRenew:\s*false/);
assert.match(policy,/accessTier:\s*"professional"/);
assert.match(policy,/sameProjectAsStandard:\s*true/);
assert.match(policy,/professionalModeDoesNotUnlockBasicQuality:\s*true/);
assert.match(policy,/professionalModeUnlocksDeeperControl:\s*true/);

// Account access is active only while the server-stored expiry is in the future.
assert.match(access,/pro_valid_from,pro_valid_until/);
assert.match(access,/const active = Number\.isFinite\(untilMs\) && untilMs > now/);
assert.match(access,/daysRemaining: active \? Math\.max\(1, Math\.ceil\(\(untilMs - now\) \/ 86400000\)\) : 0/);
assert.match(tier,/if\(access\.professional\.active\)/);
assert.match(tier,/planCode:"professional_365"/);
assert.match(tier,/professionalActive:true/);
assert.match(tier,/professionalActive:false/);

// Granting Pro is privileged, bounded and extends from the later of now/current expiry.
assert.match(runtime,/function public\.grant_pro_access\(p_user_id uuid, p_days integer default 365\)/);
assert.match(runtime,/p_days < 1 or p_days > 730/);
assert.match(runtime,/greatest\(now\(\), coalesce\(pro_valid_until, now\(\)\)\)/);
assert.match(runtime,/revoke all on function public\.grant_pro_access\(uuid,integer\) from public, anon, authenticated/);
assert.match(runtime,/grant execute on function public\.grant_pro_access\(uuid,integer\) to service_role/);

// Pro project access expires safely and cannot be bound after account access expires.
assert.match(serverEntitlement,/account_row\.pro_valid_until is not null and account_row\.pro_valid_until>now\(\)/);
assert.match(serverEntitlement,/tier:='professional'/);
assert.match(serverEntitlement,/Professional access expired before project binding/);
assert.match(serverEntitlement,/project_row\.access_tier='professional' and project_row\.valid_until is not null and project_row\.valid_until>now\(\)/);

// Pro workspace is authenticated, owner-scoped and visibly locks advanced workspace when Pro is inactive.
assert.match(proPage,/auth\.getUser\(\)/);
assert.match(proPage,/\.eq\("id",id\)\.eq\("owner_id",user\.id\)/);
assert.match(proPage,/getAppBuilderAccess/);
assert.match(proPage,/if\(!access\.professional\.active\)/);
assert.match(proPage,/Professional access is not active for this account/);
assert.match(proPage,/only advanced Pro service access ends — your project is never deleted/);
assert.match(proPage,/access\.professional\.daysRemaining/);

// Game creation is double-gated: dedicated Game API and main Generate route both require active Pro.
assert.match(gameRoute,/auth\.getUser\(\)/);
assert.match(gameRoute,/getAppBuilderAccess/);
assert.match(gameRoute,/if\(!access\.professional\.active\)/);
assert.match(gameRoute,/PRO_GAME_CREATOR_REQUIRED/);
assert.match(gameRoute,/headers\.set\("x-soolen-game-gateway","professional-fair-use"\)/);
assert.match(generate,/if\(isMobileGameIdea\(combinedInput\)\)/);
assert.match(generate,/getAppBuilderAccess\(supabase,user\.id\)/);
assert.match(generate,/trustedGameGateway=request\.headers\.get\("x-soolen-game-gateway"\)==="professional-fair-use"/);
assert.match(generate,/!access\.professional\.active\|\|!trustedGameGateway/);
assert.match(generate,/PRO_GAME_CREATOR_REQUIRED/);
assert.ok(generate.indexOf('if(isMobileGameIdea(combinedInput))') < generate.indexOf('consumeAppBuilderEntitlement(user.id'),'Game Pro gate must run before entitlement/credit consumption.');

// Normal-mode UI does not pretend Game is free/standard and gives a clear upgrade route.
assert.match(gameGate,/LANERIQ AI · PRO MODE/);
assert.match(gameGate,/Game creation requires Pro/);
assert.match(gameGate,/href="\/pricing"/);
assert.match(gameGate,/Continue with App \/ Website/);

console.log('✓ Professional pricing/access duration/no-auto-renew policy is explicit');
console.log('✓ Pro is active only for an unexpired server-stored entitlement and user tier downgrades safely');
console.log('✓ Pro grants are service-role only, bounded and extend safely without shortening existing access');
console.log('✓ Professional project access is exact-expiry bound and refuses expired binding');
console.log('✓ Pro workspace authenticates, owner-scopes and locks advanced access when inactive');
console.log('✓ Game creation has server-side double Pro gating before any entitlement/credit consumption');
console.log('✓ Normal-mode Game requests expose the clear Become Pro path');
