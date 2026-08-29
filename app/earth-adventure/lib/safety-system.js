// Earth Adventure Safety System
// Privacy-first helpers for SOS, location sharing, incident reports and community rewards.

export const SHARE_MODES = Object.freeze({
  PRIVATE: "private",
  TRUSTED_CONTACTS: "trusted_contacts",
  FRIENDS: "friends",
  NEARBY_PLAYERS: "nearby_players",
  PUBLIC: "public",
});

export const REPORT_TYPES = Object.freeze([
  "traffic_accident",
  "road_closed",
  "hazard",
  "landslide",
  "weather_hazard",
  "other",
]);

export function createSOS({ playerId, location, shareMode = SHARE_MODES.TRUSTED_CONTACTS, createdAt = new Date().toISOString() }) {
  if (!playerId) throw new Error("playerId is required");
  return {
    type: "SOS",
    playerId,
    location: location || null,
    shareMode,
    createdAt,
    active: true,
  };
}

export function createIncidentReport({ playerId, type, location, note = "", evidence = [], createdAt = new Date().toISOString() }) {
  if (!playerId) throw new Error("playerId is required");
  if (!REPORT_TYPES.includes(type)) throw new Error("Unsupported incident type");
  return {
    type: "INCIDENT_REPORT",
    playerId,
    incidentType: type,
    location: location || null,
    note: String(note).slice(0, 1000),
    evidence: Array.isArray(evidence) ? evidence.slice(0, 5) : [],
    createdAt,
    verificationStatus: "pending",
  };
}

// Rewards must only be granted after server-side verification.
export function calculateSafetyReward({ verified, severity = "normal", duplicate = false }) {
  if (!verified || duplicate) return { points: 0, coins: 0 };
  const points = severity === "high" ? 30 : severity === "low" ? 8 : 15;
  return { points, coins: Math.max(1, Math.floor(points / 5)) };
}

export function shouldShareLocation(mode) {
  return mode !== SHARE_MODES.PRIVATE;
}
