// The hardened legacy entry point now shares the central Soolen router.
// Keeping one policy boundary prevents old serverless handlers from spending
// through a metered provider while SOOLEN_COST_MODE=zero.

export { generateWithAI, getProviderStatus } from "./lib_ai.js";
