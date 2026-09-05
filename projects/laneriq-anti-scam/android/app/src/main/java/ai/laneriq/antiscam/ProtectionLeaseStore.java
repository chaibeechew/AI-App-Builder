package ai.laneriq.antiscam;

import android.content.Context;
import android.content.SharedPreferences;

import java.util.UUID;

public final class ProtectionLeaseStore {
    private static final String PREFS = "laneriq_guardian_lease";
    private static final String K_INSTANCE_ID = "guardian_instance_id";
    private static final String K_INSTALLATION_ID = "device_installation_id";
    private static final String K_OPTED_IN = "user_opted_in";
    private static final String K_SERVICE_ENABLED = "service_enabled";
    private static final String K_HEARTBEAT = "last_heartbeat_ms";
    private static final String K_HEARTBEAT_SEQ = "heartbeat_sequence";
    private static final String K_EPOCH = "lease_epoch";
    private static final String K_SESSION_ID = "service_session_id";
    private static final String K_LAST_TRANSITION = "last_transition_ms";
    private static final String K_LAST_STOP_REASON = "last_stop_reason";
    private static final String K_RISK = "local_risk_level";
    private static final String K_ENGINE_SET = "active_engine_set";
    private static final String K_POLICY = "policy_version";
    private static final String K_REPUTATION = "reputation_snapshot_version";
    private static final String K_RESTART_ATTEMPTS = "restart_attempts_in_window";
    private static final String K_RESTART_WINDOW = "restart_window_started_ms";

    public static final long LEASE_TTL_MS = 90_000L;

    private final SharedPreferences prefs;

    public ProtectionLeaseStore(Context context) {
        prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        ensureIds();
    }

    private void ensureIds() {
        SharedPreferences.Editor e = null;
        if (!prefs.contains(K_INSTANCE_ID)) {
            e = prefs.edit().putString(K_INSTANCE_ID, UUID.randomUUID().toString());
        }
        if (!prefs.contains(K_INSTALLATION_ID)) {
            if (e == null) e = prefs.edit();
            e.putString(K_INSTALLATION_ID, UUID.randomUUID().toString());
        }
        if (e != null) e.apply();
    }

    public void setUserOptedIn(boolean enabled) {
        SharedPreferences.Editor e = prefs.edit().putBoolean(K_OPTED_IN, enabled);
        if (!enabled) {
            e.putBoolean(K_SERVICE_ENABLED, false)
                    .putLong(K_HEARTBEAT, 0L)
                    .putLong(K_HEARTBEAT_SEQ, 0L)
                    .putString(K_ENGINE_SET, "none")
                    .putString(K_RISK, "unknown")
                    .putString(K_LAST_STOP_REASON, "user-opt-out")
                    .putLong(K_LAST_TRANSITION, System.currentTimeMillis());
        }
        e.apply();
    }

    public boolean isUserOptedIn() {
        return prefs.getBoolean(K_OPTED_IN, false);
    }

    public void serviceStarted() {
        serviceStarted("direct-start");
    }

    public void serviceStarted(String reason) {
        long now = System.currentTimeMillis();
        long nextEpoch = Math.max(0L, prefs.getLong(K_EPOCH, 0L)) + 1L;
        prefs.edit()
                .putBoolean(K_OPTED_IN, true)
                .putBoolean(K_SERVICE_ENABLED, true)
                .putLong(K_EPOCH, nextEpoch)
                .putString(K_SESSION_ID, UUID.randomUUID().toString())
                .putLong(K_HEARTBEAT_SEQ, 0L)
                .putLong(K_LAST_TRANSITION, now)
                .putString(K_LAST_STOP_REASON, "")
                .apply();
        heartbeat("unknown", "guardian,device-signals");
    }

    public void serviceStopped() {
        serviceStopped("service-stopped");
    }

    public void serviceStopped(String reason) {
        prefs.edit()
                .putBoolean(K_SERVICE_ENABLED, false)
                .putLong(K_HEARTBEAT, 0L)
                .putLong(K_HEARTBEAT_SEQ, 0L)
                .putString(K_ENGINE_SET, "none")
                .putString(K_LAST_STOP_REASON, reason == null ? "unknown" : reason)
                .putLong(K_LAST_TRANSITION, System.currentTimeMillis())
                .apply();
    }

    public void heartbeat(String riskLevel, String engineSet) {
        long nextSeq = Math.max(0L, prefs.getLong(K_HEARTBEAT_SEQ, 0L)) + 1L;
        prefs.edit()
                .putBoolean(K_SERVICE_ENABLED, true)
                .putLong(K_HEARTBEAT, System.currentTimeMillis())
                .putLong(K_HEARTBEAT_SEQ, nextSeq)
                .putString(K_RISK, riskLevel == null ? "unknown" : riskLevel)
                .putString(K_ENGINE_SET, engineSet == null ? "guardian" : engineSet)
                .putString(K_POLICY, "p0-local-2")
                .putString(K_REPUTATION, "local-none")
                .apply();
    }

    public boolean allowAutomaticRestart(long nowMs) {
        int attempts = Math.max(0, prefs.getInt(K_RESTART_ATTEMPTS, 0));
        long window = Math.max(0L, prefs.getLong(K_RESTART_WINDOW, 0L));
        RestartCircuitBreaker.Decision decision = RestartCircuitBreaker.evaluate(attempts, window, nowMs);
        prefs.edit()
                .putInt(K_RESTART_ATTEMPTS, decision.nextAttemptsInWindow)
                .putLong(K_RESTART_WINDOW, decision.nextWindowStartedAtMs)
                .apply();
        return decision.allowRestart;
    }

    public void resetAutomaticRestartCircuit() {
        prefs.edit()
                .putInt(K_RESTART_ATTEMPTS, 0)
                .putLong(K_RESTART_WINDOW, 0L)
                .apply();
    }

    public Lease read() {
        long now = System.currentTimeMillis();
        boolean optedIn = prefs.getBoolean(K_OPTED_IN, false);
        boolean serviceEnabled = prefs.getBoolean(K_SERVICE_ENABLED, false);
        long heartbeat = prefs.getLong(K_HEARTBEAT, 0L);
        ProtectionTruth.State state = ProtectionTruth.evaluate(
                optedIn, serviceEnabled, heartbeat, now, LEASE_TTL_MS);
        long expiresAt = heartbeat > 0L ? heartbeat + LEASE_TTL_MS : 0L;
        long remainingMs = expiresAt > 0L ? Math.max(0L, expiresAt - now) : 0L;
        return new Lease(
                prefs.getString(K_INSTANCE_ID, "unknown"),
                prefs.getString(K_INSTALLATION_ID, "unknown"),
                prefs.getLong(K_EPOCH, 0L),
                prefs.getString(K_SESSION_ID, "unknown"),
                prefs.getLong(K_HEARTBEAT_SEQ, 0L),
                state,
                optedIn,
                serviceEnabled,
                heartbeat,
                expiresAt,
                remainingMs,
                prefs.getLong(K_LAST_TRANSITION, 0L),
                prefs.getString(K_LAST_STOP_REASON, ""),
                prefs.getString(K_RISK, "unknown"),
                prefs.getString(K_ENGINE_SET, "none"),
                prefs.getString(K_POLICY, "unknown"),
                prefs.getString(K_REPUTATION, "unknown"),
                Math.max(0, prefs.getInt(K_RESTART_ATTEMPTS, 0)));
    }

    public static final class Lease {
        public final String guardianInstanceId;
        public final String deviceInstallationId;
        public final long epoch;
        public final String serviceSessionId;
        public final long heartbeatSequence;
        public final ProtectionTruth.State state;
        public final boolean userOptedIn;
        public final boolean serviceEnabled;
        public final long lastHeartbeatMs;
        public final long expiresAtMs;
        public final long remainingMs;
        public final long lastTransitionAtMs;
        public final String lastStopReason;
        public final String localRiskLevel;
        public final String activeEngineSet;
        public final String policyVersion;
        public final String reputationSnapshotVersion;
        public final int recentRestartAttempts;

        Lease(String guardianInstanceId,
              String deviceInstallationId,
              long epoch,
              String serviceSessionId,
              long heartbeatSequence,
              ProtectionTruth.State state,
              boolean userOptedIn,
              boolean serviceEnabled,
              long lastHeartbeatMs,
              long expiresAtMs,
              long remainingMs,
              long lastTransitionAtMs,
              String lastStopReason,
              String localRiskLevel,
              String activeEngineSet,
              String policyVersion,
              String reputationSnapshotVersion,
              int recentRestartAttempts) {
            this.guardianInstanceId = guardianInstanceId;
            this.deviceInstallationId = deviceInstallationId;
            this.epoch = epoch;
            this.serviceSessionId = serviceSessionId;
            this.heartbeatSequence = heartbeatSequence;
            this.state = state;
            this.userOptedIn = userOptedIn;
            this.serviceEnabled = serviceEnabled;
            this.lastHeartbeatMs = lastHeartbeatMs;
            this.expiresAtMs = expiresAtMs;
            this.remainingMs = remainingMs;
            this.lastTransitionAtMs = lastTransitionAtMs;
            this.lastStopReason = lastStopReason;
            this.localRiskLevel = localRiskLevel;
            this.activeEngineSet = activeEngineSet;
            this.policyVersion = policyVersion;
            this.reputationSnapshotVersion = reputationSnapshotVersion;
            this.recentRestartAttempts = recentRestartAttempts;
        }

        public boolean mayClaimGuardianActive() {
            return state == ProtectionTruth.State.ACTIVE
                    && heartbeatSequence > 0L
                    && serviceSessionId != null
                    && !serviceSessionId.trim().isEmpty()
                    && !"unknown".equals(serviceSessionId);
        }
    }
}
