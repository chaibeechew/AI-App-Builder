package ai.laneriq.antiscam;

public final class ProtectionTruth {
    public enum State {
        ACTIVE,
        DEGRADED_OFFLINE,
        DEGRADED_STALE,
        PAUSED,
        UNKNOWN
    }

    private ProtectionTruth() {}

    public static State evaluate(
            boolean userOptedIn,
            boolean serviceEnabled,
            long heartbeatAtMs,
            long nowMs,
            long ttlMs) {
        if (nowMs <= 0L || heartbeatAtMs < 0L || ttlMs <= 0L) return State.UNKNOWN;
        if (!userOptedIn) return State.PAUSED;
        if (!serviceEnabled) return State.DEGRADED_OFFLINE;
        if (heartbeatAtMs == 0L) return State.DEGRADED_STALE;
        long age = Math.max(0L, nowMs - heartbeatAtMs);
        return age <= ttlMs ? State.ACTIVE : State.DEGRADED_STALE;
    }
}
