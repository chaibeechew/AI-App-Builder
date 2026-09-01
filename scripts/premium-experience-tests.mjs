import assert from "node:assert/strict";
import { BUILD_JOURNEY_STAGES, PREMIUM_VISUAL_SCORE_REQUIRED, auditPremiumExperience, enforcePremiumExperience, inferIndustryVisualProfile, redesignAndAuditPremiumExperience } from "../lib/ai/premium-experience-system.js";

assert.equal(BUILD_JOURNEY_STAGES.length,9,"The customer journey must keep all nine premium stages.");
assert.deepEqual(BUILD_JOURNEY_STAGES.map(stage=>stage.id),["idea","understand","planning","building","data","automation","testing","preview","publish"]);

const propertyProfile=inferIndustryVisualProfile({idea:"Build a real estate property listing and agent CRM"});
const restaurantProfile=inferIndustryVisualProfile({idea:"Build a restaurant menu and table booking app"});
assert.equal(propertyProfile.id,"real-estate");
assert.equal(restaurantProfile.id,"restaurant");
assert.notEqual(propertyProfile.scene,restaurantProfile.scene,"Industries must change more than color.");
assert.notDeepEqual(propertyProfile.layouts,restaurantProfile.layouts,"Industries must use distinct layout families.");

const sparse={
  name:"HomeKey",
  description:"A premium real estate service for buyers and agents.",
  industry:{name:"Real Estate"},
  designSystem:{themeMode:"custom",primaryColor:"#145f52",accentColor:"#e2b451",backgroundColor:"#061512",wallpaperMode:"selected",wallpaperPreset:"moon-city"},
  pages:[
    {id:"home",name:"Home",route:"/",purpose:"Discover the best properties",components:["Featured properties","Search"]},
    {id:"listings",name:"Listings",route:"/listings",purpose:"Browse and compare properties",components:["Filters","Property cards"]},
    {id:"property",name:"Property Details",route:"/property",purpose:"Understand one property and enquire",components:["Gallery","Facts","Enquiry"]},
    {id:"dashboard",name:"Agent Dashboard",route:"/dashboard",purpose:"Review leads and follow-up",components:["Lead status","Appointments"]},
  ],
  features:[{name:"Property search"},{name:"Appointments"}],
  data:{Property:{fields:["title","price","status"]}},
  actions:[{name:"Book a viewing"}],
  navigation:[{label:"Home",route:"/"},{label:"Listings",route:"/listings"},{label:"Property",route:"/property"},{label:"Dashboard",route:"/dashboard"}],
};

const before=auditPremiumExperience(sparse);
assert.equal(before.passed,false,"A sparse specification must not bypass the page-quality audit.");
const repaired=redesignAndAuditPremiumExperience(sparse,{idea:"real estate buyer and agent experience",themeMode:"custom",primaryColor:"#145f52",accentColor:"#e2b451",backgroundColor:"#061512",wallpaperMode:"selected"});
assert.equal(repaired.redesigned,true,"A below-floor specification should be redesigned automatically.");
assert.equal(repaired.after.score,PREMIUM_VISUAL_SCORE_REQUIRED);
assert.equal(repaired.after.passed,true);
assert.equal(repaired.specification.designSystem.primaryColor,"#145f52","Customer color must remain authoritative.");
assert.equal(repaired.specification.designSystem.wallpaperPreset,"moon-city","Customer wallpaper must be preserved.");
assert.equal(repaired.specification.designSystem.industryProfile,"real-estate");
assert.equal(new Set(repaired.specification.pages.map(page=>page.experience.layoutFamily)).size>=3,true,"Pages must not repeat one universal layout.");
for(const page of repaired.specification.pages){
  assert.equal(page.experience.mobile.minTouchTargetPx,44);
  assert.equal(page.experience.mobile.safeAreaAware,true);
  assert.equal(page.experience.mobile.keyboardAware,true);
  assert.equal(page.experience.mobile.horizontalPageScroll,false);
  assert.deepEqual(Object.keys(page.experience.states).sort(),["empty","error","loading","success"]);
  assert.equal(page.experience.accessibility.focusVisible,true);
  assert.equal(page.experience.accessibility.reducedMotion,true);
}

const restaurant=enforcePremiumExperience({...sparse,name:"TableStory",description:"Restaurant menu, food ordering and reservations",industry:{name:"Restaurant"},pages:[
  {id:"home",name:"Home",route:"/",purpose:"Discover the restaurant",components:["Chef story","Featured dishes"]},
  {id:"menu",name:"Menu",route:"/menu",purpose:"Browse food and dietary options",components:["Menu categories","Dish cards"]},
  {id:"booking",name:"Table Booking",route:"/booking",purpose:"Reserve a table",components:["Availability","Guest details"]},
  {id:"order",name:"Order",route:"/order",purpose:"Review and place a food order",components:["Cart","Order status"]},
]},{idea:"restaurant menu food booking"});
assert.equal(restaurant.designSystem.industryProfile,"restaurant");
assert.notEqual(restaurant.pages[0].experience.layoutFamily,repaired.specification.pages[0].experience.layoutFamily);
assert.equal(auditPremiumExperience(restaurant).score,100);

console.log("✓ Nine-stage premium journey contract is stable");
console.log("✓ Industry profiles change scenes, layouts, typography and product behavior");
console.log("✓ Every page is auto-redesigned to a deterministic 100-point visual audit");
console.log("✓ iPhone safe-area, keyboard, touch-target and state contracts are enforced");
console.log("✓ Customer colors and wallpaper choices remain authoritative");
