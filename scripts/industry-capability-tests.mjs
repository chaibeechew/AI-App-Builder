import assert from 'node:assert/strict';
import fs from 'node:fs';
import {inferIndustryCapabilities} from '../lib/ai/industry-capability-planner.js';

const realEstate=inferIndustryCapabilities({idea:'Build a real estate app for property agents with WhatsApp enquiries'});
assert.equal(realEstate.profileId,'real_estate');
for(const expected of ['Properties / listings','Leads / enquiries','Appointments / viewings','Dashboard'])assert.ok(realEstate.pages.includes(expected),`Missing real-estate area: ${expected}`);
for(const expected of ['properties','leads','appointments','users / agents'])assert.ok(realEstate.data.includes(expected),`Missing real-estate data: ${expected}`);
assert.ok(realEstate.explicit.includes('whatsapp'));
assert.match(realEstate.brief,/do not claim it is connected/i);
assert.match(realEstate.brief,/Do not silently activate paid\/metred providers/i);

const restaurant=inferIndustryCapabilities({idea:'Create a restaurant booking and menu website'});
assert.equal(restaurant.profileId,'restaurant');
assert.ok(restaurant.pages.some(x=>/Menu/.test(x)));
assert.ok(restaurant.data.some(x=>/reservations/.test(x)));

const ecommerce=inferIndustryCapabilities({idea:'Online store with products, checkout and customer login'});
assert.equal(ecommerce.profileId,'ecommerce');
assert.ok(ecommerce.explicit.includes('payments'));
assert.ok(ecommerce.explicit.includes('login'));

const generic=inferIndustryCapabilities({idea:'Make a simple calculator'});
assert.equal(generic.matched,false);
assert.equal(generic.brief,'');

const generate=fs.readFileSync('app/api/generate/route.js','utf8');
assert.match(generate,/inferIndustryCapabilities/);
assert.match(generate,/industryPlan\.brief/);
assert.match(generate,/industry_plan:/);
assert.match(generate,/industryPlan:\{matched:industryPlan\.matched/);
console.log('✓ Generate infers industry-appropriate business modules before building without forcing irrelevant complexity');
console.log('✓ External messaging, payment and other provider-backed capabilities remain readiness-gated instead of being falsely activated');
