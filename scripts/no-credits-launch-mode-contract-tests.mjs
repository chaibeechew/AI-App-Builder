import assert from "node:assert/strict";
import fs from "node:fs";
import { LAUNCH_MODE, isNoCreditsLaunchMode } from "../config/launch-mode.js";

const read = (path) => fs.readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const layout = read("app/layout.js");
const guard = read("app/components/LaunchModeGuard.js");
const creditsPage = read("app/credits/page.js");
const homeCostCss = read("app/local-first-cost-control.css");
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

assert.match(guard, /a\[href=\"\/credits\"\]/);
assert.match(guard, /CREDIT_NAV_TEXT/);
assert.match(guard, /FREE_FIRST_PROJECT_TEXT/);
assert.match(guard, /CREDIT_SHORTAGE_TEXT/);
assert.match(guard, /LAUNCH_MODE\.userCopy\.accessUnavailable/);
assert.match(guard, /location\.pathname\.startsWith\("\/admin"\)/);
assert.match(guard, /MutationObserver/);
assert.match(guard, /event\.preventDefault\(\)/);

assert.match(creditsPage, /redirect\("\/"\)/);
assert.doesNotMatch(creditsPage, /fetch\("\/api\/credits"/);
assert.doesNotMatch(creditsPage, /Available Credits|Credit History|credit activity/i);

assert.match(homeCostCss, /a\[href=\"\/credits\"\]\.credits[\s\S]*display:\s*none\s*!important/i);
assert.match(homeCostCss, /\.premiumHome \.promiseRow \{ display:none !important; \}/);

// Compatibility source may retain dormant labels while launch guards keep them out of the customer surface.
assert.match(home, /href="\/credits"/);
assert.match(home, /insufficient credits/);
assert.equal(LAUNCH_MODE.credits.backendEntitlementCompatibilityRetained, true);

console.log("✓ No-Credits Launch Mode is the active customer access model");
console.log("✓ Public Credits navigation/balance route are disabled while admin and backend compatibility remain intact");
console.log("✓ Dynamic credit-shortage copy is neutralized without deleting historical entitlement infrastructure");
console.log("✓ Existing homepage no-flash CSS continues hiding dormant Credits and promotional promise markup");
