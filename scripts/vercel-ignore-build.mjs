const message = String(process.env.VERCEL_GIT_COMMIT_MESSAGE || "");
const forceDeploy = /\[vercel-deploy\]/i.test(message);

if (forceDeploy) {
  console.log("Vercel deploy enabled for this consolidated release commit.");
  process.exit(1);
}

console.log("Skipping Vercel build to preserve the free deployment quota. Add [vercel-deploy] to the final consolidated commit when a deployment is intentionally required.");
process.exit(0);
