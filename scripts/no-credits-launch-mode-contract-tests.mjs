import assert from "node:assert/strict";
import fs from "node:fs";
import { LAUNCH_MODE, isNoCreditsLaunchMode } from "../config/launch-mode.js";

const read = (path) => fs.readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const layout = read("app/layout.js");
const guard = read("app/components/LaunchModeGuard.js");
const creditsLayout = read("app/credits/layout.js");
const creditsPage = read("app/credits/page.js");
const creditsApi = read("app/api/credits/route.js");
const finance = read("lib/app-builder-finance.js");
const generate = read("app/api/generate/route.js");
const modify = read("app/api/modify/route.js");
const liuiHomeCss = read("app/home-liui-v5.css");
const home = read("app/page.js");

assert.equal(isNoCreditsLaunchMode(), true);
assert.equal(LAUNCH_MODE.active, true);
assert.equal(LAUNCH_MODE.customerAccessModel, "no_credits");
assert.equal(LAUNCH_MODE.credits.customerModelActive, false);
assert.equal(LAUNCH_MODE.credits.publicNavigationVisible, false);
assert.equal(LAUNCH_MODE.credits.publicBalancePageEnabled, false);
assert.equal(LAUNCH_MODE.credits.purchasePromptAllowed, false);
assert.equal(LAUNCH_MODE.credits.shortagePromptAllowed, false);
assert.equal(LAUNCH_MODE.credits.backendEntitlementCompatibilityRetained, true);
assert.equal(LAUNCH_MODE.credits.historicalLedgerCompatibilityRetained, true);
assert.equal(LAUNCH_MODE.promotion.freeFirstProjectPublicMessaging, false);
assert.equal(LAUNCH_MODE.infrastructure.databaseMigrationRequired, false);
assert.equal(LAUNCH_MODE.infrastructure.fixedCostIncreaseRequired, false);

assert.match(layout, /import LaunchModeGuard from "\.\/components\/LaunchModeGuard"/);
assert.match(layout, /<LaunchModeGuard \/>/);
assert.match(layout, /home-liui-v5\.css/);
assert.doesNotMatch(layout, /local-first-cost-control\.css/,'Retired visual cost-control layer must not be active.');

assert.match(guard, /a\[href=\"\/credits\"\]/);
assert.match(guard, /CREDIT_NAV_TEXT/);
assert.match(guard, /FREE_FIRST_PROJECT_TEXT/);
assert.match(guard, /CREDIT_SHORTAGE_TEXT/);
assert.match(guard, /LAUNCH_MODE\.userCopy\.accessUnavailable/);
assert.match(guard, /location\.pathname\.startsWith\("\/admin"\)/);
assert.match(guard, /MutationObserver/);
assert.match(guard, /event\.preventDefault\(\)/);

assert.match(creditsLayout, /isNoCreditsLaunchMode\(\)/);
assert.match(creditsLayout, /publicBalancePageEnabled === false/);
assert.match(creditsLayout, /redirect\("\/"\)/);
assert.match(creditsPage, /fetch\("\/api\/credits", \{ cache: "no-store" \}\)/);
assert.match(creditsPage, /const ledger = Array\.isArray\(data\?\.ledger\) \? data\.ledger : \[\];/);
assert.match(creditsApi, /from\("credit_accounts"\)/);
assert.match(creditsApi, /from\("credit_transactions"\)/);
assert.match(creditsApi, /\.eq\("user_id", user\.id\)/);

assert.match(finance, /import \{ isNoCreditsLaunchMode \} from "\.\.\/config\/launch-mode\.js"/);
assert.match(finance, /if\(isNoCreditsLaunchMode\(\)\)return Promise\.resolve\(\{charged:false,balance:null,launchModeBypass:true,requestId\}\)/);
assert.match(finance, /if\(isNoCreditsLaunchMode\(\)\)return Promise\.resolve\(\{refunded:false,balance:null,launchModeBypass:true,requestId\}\)/);
assert.match(finance, /server_consume_ai_credits/,'Historical credit consumption RPC compatibility must remain dormant but available.');
assert.match(finance, /server_refund_ai_credits/,'Historical credit refund RPC compatibility must remain dormant but available.');
assert.match(generate, /consumeAiCredits/,'Generate retains the compatibility call site while the finance boundary prevents charging in launch mode.');
assert.match(modify, /consumeAiCredits/,'Modify retains the compatibility call site while the finance boundary prevents charging in launch mode.');

assert.match(liuiHomeCss, /a\[href=\"\/credits\"\]\.credits\{display:none!important\}/i);
assert.match(liuiHomeCss, /\.premiumHome \.promiseRow\{display:none!important\}/);

// Dormant compatibility source can retain these references because the launch layout/guard makes them non-customer-facing.
assert.match(home, /href="\/credits"/);
assert.match(home, /insufficient credits/);
assert.equal(LAUNCH_MODE.credits.backendEntitlementCompatibilityRetained, true);

console.log("✓ No-Credits Launch Mode is the active customer access model");
console.log("✓ Public /credits is server-gated while the dormant server-backed balance/ledger component remains structurally intact");
console.log("✓ Generate/Modify cannot charge or refund credits while No-Credits Launch Mode is active");
console.log("✓ Historical credit RPC compatibility remains dormant and reversible for a future commercial phase");
console.log("✓ LIUI suppresses public Credits navigation, free-first-project copy and dynamic credit-shortage copy without restoring the retired visual layer");
