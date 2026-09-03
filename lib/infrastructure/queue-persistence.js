export const LANERIQ_QUEUE_PERSISTENCE_VERSION = "2026-09-04.1";

export const QUEUE_MESSAGE_STATE = Object.freeze({
  QUEUED: "queued",
  LEASED: "leased",
  ACKED: "acked",
  DEAD: "dead",
});

const REQUIRED_METHODS = Object.freeze(["enqueue", "claim", "ack", "nack", "stats", "exportSnapshot"]);

function id(value, errorCode) {
  const normalized = String(value || "").trim();
  if (!normalized) throw new Error(errorCode);
  return normalized;
}

function finite(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function clone(value) {
  return value == null ? value : JSON.parse(JSON.stringify(value));
}

export function assertQueuePersistenceAdapter(adapter) {
  if (!adapter || typeof adapter !== "object") throw new Error("LANERIQ_QUEUE_ADAPTER_REQUIRED");
  for (const method of REQUIRED_METHODS) {
    if (typeof adapter[method] !== "function") throw new Error(`LANERIQ_QUEUE_ADAPTER_METHOD_REQUIRED:${method}`);
  }
  return true;
}

export function createInMemoryQueuePersistence({ maxItems = 1000, maxAttempts = 5, now = () => Date.now() } = {}) {
  const itemLimit = Math.max(1, Math.floor(finite(maxItems, 1000)));
  const attemptLimit = Math.max(1, Math.floor(finite(maxAttempts, 5)));
  const messages = new Map();
  const idempotency = new Map();
  let sequence = 0;

  function visible(message) {
    return Object.freeze({
      messageId: message.messageId,
      tenantId: message.tenantId,
      priority: message.priority,
      attempts: message.attempts,
      state: message.state,
      availableAt: message.availableAt,
      payload: clone(message.payload),
    });
  }

  function releaseExpiredLeases(at) {
    for (const message of messages.values()) {
      if (message.state === QUEUE_MESSAGE_STATE.LEASED && message.leaseUntil <= at) {
        message.state = QUEUE_MESSAGE_STATE.QUEUED;
        message.leaseToken = null;
        message.leaseUntil = 0;
      }
    }
  }

  return Object.freeze({
    async enqueue({ tenantId, idempotencyKey, payload = null, priority = "normal", availableAt = null } = {}) {
      const tenant = id(tenantId, "LANERIQ_QUEUE_TENANT_ID_REQUIRED");
      const key = id(idempotencyKey, "LANERIQ_QUEUE_IDEMPOTENCY_KEY_REQUIRED");
      const scopedKey = `${tenant}:${key}`;
      const duplicateId = idempotency.get(scopedKey);
      if (duplicateId) {
        const existing = messages.get(duplicateId);
        return Object.freeze({ duplicate: true, message: existing ? visible(existing) : null });
      }
      const activeCount = [...messages.values()].filter((message) => message.state !== QUEUE_MESSAGE_STATE.ACKED).length;
      if (activeCount >= itemLimit) throw new Error("LANERIQ_QUEUE_CAPACITY_EXCEEDED");
      sequence += 1;
      const messageId = `q-${sequence}`;
      const createdAt = finite(now(), Date.now());
      const message = {
        messageId,
        tenantId: tenant,
        idempotencyKey: key,
        payload: clone(payload),
        priority: String(priority || "normal"),
        state: QUEUE_MESSAGE_STATE.QUEUED,
        attempts: 0,
        availableAt: availableAt == null ? createdAt : finite(availableAt, createdAt),
        createdAt,
        leaseToken: null,
        leaseUntil: 0,
      };
      messages.set(messageId, message);
      idempotency.set(scopedKey, messageId);
      return Object.freeze({ duplicate: false, message: visible(message) });
    },

    async claim({ tenantId, consumerId, leaseMs = 30000 } = {}) {
      const tenant = id(tenantId, "LANERIQ_QUEUE_CLAIM_TENANT_ID_REQUIRED");
      const consumer = id(consumerId, "LANERIQ_QUEUE_CONSUMER_ID_REQUIRED");
      const at = finite(now(), Date.now());
      releaseExpiredLeases(at);
      const candidate = [...messages.values()]
        .filter((message) => message.tenantId === tenant && message.state === QUEUE_MESSAGE_STATE.QUEUED && message.availableAt <= at)
        .sort((a, b) => a.createdAt - b.createdAt || a.messageId.localeCompare(b.messageId))[0];
      if (!candidate) return null;
      candidate.attempts += 1;
      if (candidate.attempts > attemptLimit) {
        candidate.state = QUEUE_MESSAGE_STATE.DEAD;
        return null;
      }
      candidate.state = QUEUE_MESSAGE_STATE.LEASED;
      candidate.leaseToken = `${consumer}:${candidate.messageId}:${candidate.attempts}`;
      candidate.leaseUntil = at + Math.max(1, Math.floor(finite(leaseMs, 30000)));
      return Object.freeze({
        ...visible(candidate),
        leaseToken: candidate.leaseToken,
        leaseUntil: candidate.leaseUntil,
      });
    },

    async ack({ tenantId, messageId, leaseToken } = {}) {
      const tenant = id(tenantId, "LANERIQ_QUEUE_ACK_TENANT_ID_REQUIRED");
      const message = messages.get(id(messageId, "LANERIQ_QUEUE_MESSAGE_ID_REQUIRED"));
      if (!message || message.tenantId !== tenant) return Object.freeze({ acknowledged: false, reason: "not_found_in_tenant" });
      if (message.state !== QUEUE_MESSAGE_STATE.LEASED || message.leaseToken !== leaseToken) {
        return Object.freeze({ acknowledged: false, reason: "lease_mismatch" });
      }
      message.state = QUEUE_MESSAGE_STATE.ACKED;
      message.leaseToken = null;
      message.leaseUntil = 0;
      return Object.freeze({ acknowledged: true, messageId: message.messageId });
    },

    async nack({ tenantId, messageId, leaseToken, retry = true, retryDelayMs = 0 } = {}) {
      const tenant = id(tenantId, "LANERIQ_QUEUE_NACK_TENANT_ID_REQUIRED");
      const message = messages.get(id(messageId, "LANERIQ_QUEUE_MESSAGE_ID_REQUIRED"));
      if (!message || message.tenantId !== tenant) return Object.freeze({ accepted: false, reason: "not_found_in_tenant" });
      if (message.state !== QUEUE_MESSAGE_STATE.LEASED || message.leaseToken !== leaseToken) {
        return Object.freeze({ accepted: false, reason: "lease_mismatch" });
      }
      const exhausted = message.attempts >= attemptLimit;
      message.state = retry && !exhausted ? QUEUE_MESSAGE_STATE.QUEUED : QUEUE_MESSAGE_STATE.DEAD;
      message.availableAt = finite(now(), Date.now()) + Math.max(0, Math.floor(finite(retryDelayMs, 0)));
      message.leaseToken = null;
      message.leaseUntil = 0;
      return Object.freeze({ accepted: true, state: message.state, exhausted });
    },

    async stats({ tenantId } = {}) {
      const tenant = id(tenantId, "LANERIQ_QUEUE_STATS_TENANT_ID_REQUIRED");
      const scoped = [...messages.values()].filter((message) => message.tenantId === tenant);
      return Object.freeze({
        tenantId: tenant,
        queued: scoped.filter((message) => message.state === QUEUE_MESSAGE_STATE.QUEUED).length,
        leased: scoped.filter((message) => message.state === QUEUE_MESSAGE_STATE.LEASED).length,
        acked: scoped.filter((message) => message.state === QUEUE_MESSAGE_STATE.ACKED).length,
        dead: scoped.filter((message) => message.state === QUEUE_MESSAGE_STATE.DEAD).length,
      });
    },

    async exportSnapshot({ tenantId } = {}) {
      const tenant = id(tenantId, "LANERIQ_QUEUE_SNAPSHOT_TENANT_ID_REQUIRED");
      const scoped = [...messages.values()]
        .filter((message) => message.tenantId === tenant && message.state !== QUEUE_MESSAGE_STATE.ACKED)
        .map((message) => ({
          messageId: message.messageId,
          tenantId: message.tenantId,
          idempotencyKey: message.idempotencyKey,
          payload: clone(message.payload),
          priority: message.priority,
          state: message.state === QUEUE_MESSAGE_STATE.LEASED ? QUEUE_MESSAGE_STATE.QUEUED : message.state,
          attempts: message.attempts,
          availableAt: message.availableAt,
          createdAt: message.createdAt,
        }));
      return Object.freeze({
        format: "laneriq.queue.portable.v1",
        tenantId: tenant,
        durable: false,
        items: Object.freeze(scoped),
      });
    },
  });
}

export function publicQueuePersistencePolicy() {
  return Object.freeze({
    version: LANERIQ_QUEUE_PERSISTENCE_VERSION,
    adapterContract: [...REQUIRED_METHODS],
    tenantScopedClaims: true,
    idempotencyRequired: true,
    leaseAndRetrySupported: true,
    portableSnapshotSupported: true,
    defaultReferenceAdapter: "in_memory_ephemeral",
    externalQueueRequired: false,
    redisRequired: false,
    sqsRequired: false,
    paidInfrastructureRequired: false,
    productionDurabilityClaimedForInMemoryAdapter: false,
  });
}
