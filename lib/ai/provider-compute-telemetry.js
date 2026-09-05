import {
  LOGICAL_WORKER_CAPACITY,
  MAX_ACTIVE_AGENT_FANOUT,
  ZERO_COST_COMPUTE_FABRIC_VERSION,
} from "./zero-cost-compute-fabric.js";
import { getSoolenCostMode } from "../soolen/cost-policy.js";

function count(value) {
  const number = Number(value || 0);
  return Number.isFinite(number) ? Math.max(0, Math.floor(number)) : 0;
}

function rate(numerator, denominator) {
  return denominator > 0 ? Number((numerator / denominator).toFixed(4)) : 0;
}

export function deriveProviderComputeTelemetry(runtimeTruth = {}, env = process.env) {
  const mode = getSoolenCostMode(env);
  const requests = count(runtimeTruth.runtimeRequests);
  const successes = count(runtimeTruth.runtimeSuccesses);
  const localSuccesses = count(runtimeTruth.localSuccessesObservedInInstance);
  const remoteSuccesses = count(runtimeTruth.remoteSuccessesObservedInInstance);
  const blockedByCost = count(runtimeTruth.blockedByCost);
  const failovers = count(runtimeTruth.runtimeFailovers);
  const proactiveQuotaSwitches = count(runtimeTruth.proactiveQuotaSwitches);

  // Local provider success is confirmed zero-cost under the active LANERIQ policy.
  // Remote success is also zero-cost-confirmed only in `free` mode because that mode
  // admits remote providers only after account hard-stop verification. Vercel runtime
  // environment variables are expected to remain immutable for the lifetime of an instance.
  const confirmedRemoteZeroCost = mode === "free" ? remoteSuccesses : 0;
  const confirmedZeroCostResolutions = Math.min(successes, localSuccesses + confirmedRemoteZeroCost);
  const unclassifiedRemoteResolutions = mode === "balanced" || mode === "paid" ? remoteSuccesses : 0;
  const zeroModeRemotePolicyViolationObserved = mode === "zero" && remoteSuccesses > 0;
  const exactZeroCostRateKnown = mode === "free" || (mode === "zero" && !zeroModeRemotePolicyViolationObserved);

  return Object.freeze({
    fabricVersion: ZERO_COST_COMPUTE_FABRIC_VERSION,
    logicalWorkerCapacity: LOGICAL_WORKER_CAPACITY,
    maxActiveAgentFanout: MAX_ACTIVE_AGENT_FANOUT,
    costMode: mode,
    runtimeRequests: requests,
    runtimeSuccesses: successes,
    localSuccessesObservedInInstance: localSuccesses,
    remoteSuccessesObservedInInstance: remoteSuccesses,
    confirmedZeroCostResolutions,
    confirmedZeroCostResolutionRate: rate(confirmedZeroCostResolutions, requests),
    exactZeroCostRateKnown,
    unclassifiedRemoteResolutions,
    blockedByCost,
    failovers,
    proactiveQuotaSwitches,
    zeroModeRemotePolicyViolationObserved,
    remoteFreeTierRequiresVerifiedHardStop: true,
    paidComputeLast: true,
    runtimeEphemeral: true,
    runtimeCostModeExpectedImmutable: true,
    evidenceBoundary: "Per-instance routing telemetry confirms LANERIQ route outcomes only. It does not prove permanent provider quota, provider billing statements, native-device inference, or unlimited compute capacity.",
  });
}

export const PROVIDER_COMPUTE_TELEMETRY_POLICY = Object.freeze({
  version: 1,
  computeFabricVersion: ZERO_COST_COMPUTE_FABRIC_VERSION,
  publicProviderIdentityRequired: false,
  zeroModeRemoteSuccessAllowed: false,
  freeModeRemoteSuccessRequiresVerifiedHardStop: true,
  balancedAndPaidRemoteCostClassMustRemainUnclassifiedWithoutProviderLevelEvidence: true,
  zeroModeRemoteObservationInvalidatesExactRate: true,
  runtimeCountersArePerInstance: true,
  runtimeCostModeExpectedImmutable: true,
});
