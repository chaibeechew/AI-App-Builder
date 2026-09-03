export const LANERIQ_CELL_POLICY_VERSION = "2026-09-03.1";

export const BLAST_RADIUS = Object.freeze({
  RESOURCE: "resource",
  CELL: "cell",
  MULTI_CELL: "multi_cell",
  GLOBAL: "global",
});

const TOKEN_RE = /^[a-z0-9][a-z0-9-]{0,63}$/;

function token(value, name) {
  const normalized = String(value || "").trim().toLowerCase();
  if (!TOKEN_RE.test(normalized)) throw new Error(`LANERIQ_CELL_INVALID_${name}`);
  return normalized;
}

export function createCellScopedId({ cellId, resourceType, localId } = {}) {
  const cell = token(cellId, "CELL_ID");
  const resource = token(resourceType, "RESOURCE_TYPE");
  const local = token(localId, "LOCAL_ID");
  return `lrq~${cell}~${resource}~${local}`;
}

export function parseCellScopedId(value) {
  const parts = String(value || "").split("~");
  if (parts.length !== 4 || parts[0] !== "lrq") throw new Error("LANERIQ_CELL_SCOPED_ID_INVALID");
  return Object.freeze({
    cellId: token(parts[1], "CELL_ID"),
    resourceType: token(parts[2], "RESOURCE_TYPE"),
    localId: token(parts[3], "LOCAL_ID"),
  });
}

export function assertCellLocalWrite({ sourceId, targetId, allowCrossCell = false } = {}) {
  const source = parseCellScopedId(sourceId);
  const target = parseCellScopedId(targetId);
  const sameCell = source.cellId === target.cellId;
  if (!sameCell && !allowCrossCell) throw new Error(`LANERIQ_CELL_CROSS_CELL_WRITE_BLOCKED:${source.cellId}->${target.cellId}`);
  return Object.freeze({ sameCell, sourceCellId: source.cellId, targetCellId: target.cellId, allowed: sameCell || Boolean(allowCrossCell) });
}

export function assessBlastRadius({
  resourceIds = [],
  globalDependencyAffected = false,
  totalKnownCells = null,
} = {}) {
  const parsed = (Array.isArray(resourceIds) ? resourceIds : []).map(parseCellScopedId);
  const cells = [...new Set(parsed.map((item) => item.cellId))];
  const resources = [...new Set((Array.isArray(resourceIds) ? resourceIds : []).map(String))];

  let radius = BLAST_RADIUS.RESOURCE;
  if (globalDependencyAffected) radius = BLAST_RADIUS.GLOBAL;
  else if (cells.length > 1) radius = BLAST_RADIUS.MULTI_CELL;
  else if (cells.length === 1 && resources.length > 1) radius = BLAST_RADIUS.CELL;

  const knownCells = totalKnownCells === null ? null : Number(totalKnownCells);
  if (knownCells !== null && (!Number.isFinite(knownCells) || knownCells <= 0 || cells.length > knownCells)) {
    throw new Error("LANERIQ_CELL_TOTAL_KNOWN_CELLS_INVALID");
  }

  const cellFraction = knownCells === null ? null : cells.length / knownCells;
  return Object.freeze({
    version: LANERIQ_CELL_POLICY_VERSION,
    radius,
    affectedCells: cells,
    affectedCellCount: cells.length,
    affectedResourceCount: resources.length,
    globalDependencyAffected: Boolean(globalDependencyAffected),
    knownCellFraction: cellFraction,
    contained: radius === BLAST_RADIUS.RESOURCE || radius === BLAST_RADIUS.CELL,
    requiresGlobalApproval: radius === BLAST_RADIUS.GLOBAL,
  });
}

export function publicCellPolicy() {
  return Object.freeze({
    version: LANERIQ_CELL_POLICY_VERSION,
    crossCellWritesAllowedByDefault: false,
    globalResourceIdsRequired: false,
    physicalCellsClaimedLive: false,
    dedicatedServersRequired: false,
    migrationReadyIdFormat: true,
  });
}
