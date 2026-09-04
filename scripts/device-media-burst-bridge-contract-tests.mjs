import assert from "node:assert/strict";
import fs from "node:fs";

const read = (path) => fs.readFileSync(path, "utf8");
const image = read("app/image-studio/page.js");
const video = read("app/video-studio/page.js");
const operations = read("app/operations/[id]/page.js");
const manager = read("app/components/DeviceComputeManager.js");
const policy = read("lib/device-compute/adaptive-burst.js");

assert.match(policy, /HIGH_ENERGY_WORKLOADS[\s\S]*"image_generation"[\s\S]*"video_generation"/);
assert.match(policy, /requestedPowerPercent:\s*highEnergy \? 150 : 100/);
assert.match(policy, /hardwareUtilizationMayExceed100Percent:\s*false/);
assert.match(policy, /cooldownRequired:\s*highEnergy/);

assert.match(image, /beginHighEnergyWorkload\?\.\("image_generation"\)/);
assert.match(image, /endHighEnergyWorkload\?\.\("image_generation"\)/);
assert.match(image, /finally\{endImageBurst\(\);setLoading\(false\)\}/);

assert.match(video, /beginHighEnergyWorkload\?\.\("video_generation"\)/);
assert.match(video, /endHighEnergyWorkload\?\.\("video_generation"\)/);
assert.match(video, /finally\{endVideoBurst\(\);setBusy\(false\)\}/);
const storyboardStart = video.indexOf("async function createStoryboard");
const storyboardEnd = video.indexOf("async function prepareProject");
assert.ok(storyboardStart >= 0 && storyboardEnd > storyboardStart);
assert.doesNotMatch(video.slice(storyboardStart, storyboardEnd), /beginVideoBurst|beginHighEnergyWorkload/, "Storyboard planning must stay on the normal compute budget.");

assert.match(manager, /onlyImageAndVideoHighEnergy:\s*true/);
assert.match(manager, /onlyUserSelectableComputeControl:\s*"prevent_overheating"/);
assert.doesNotMatch(operations, /beginHighEnergyWorkload|beginImageBurst|beginVideoBurst/, "AI Testing/Self-Heal must not request the image/video high-energy burst.");

console.log("✓ Create Image is wired to the image-generation high-energy window and automatic cooldown");
console.log("✓ Video compile/render initiation is wired to the video-generation high-energy window and automatic cooldown");
console.log("✓ Storyboard planning, AI Testing and Self-Heal stay outside the high-energy burst path");
console.log("✓ 150% remains relative to baseline; physical hardware utilization is capped at 100%");
