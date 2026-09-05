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
    private static final String K_RISK = "local_risk_level";
    private static final String K_ENGINE_SET = "active_engine_set";
    private static final String K_POLICY = "policy_version";
    private static final String K_REPUTATION = "reputation_snapshot_version";

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
                    .putString(K_ENGINE_SET, "none")
                    .putString(K_RISK, "unknown");
        }
        e.apply();
    }

    public boolean isUserOptedIn() {
        return prefs.getBoolean(K_OPTED_IN, false);
    }

    public void serviceStarted() {
        prefs.edit()
                .putBoolean(K_OPTED_IN, true)
                .putBoolean(K_SERVICE_ENABLED, true)
                .apply();
        heartbeat("unknown", "guardian,device-signals");
    }

    public void serviceStopped() {
        prefs.edit()
                .putBoolean(K_SERVICE_ENABLED, false)
                .putLong(K_HEARTBEAT, 0L)
                .putString(K_ENGINE_SET, "none")
                .apply();
    }

    public void heartbeat(String riskLevel, String engineSet) {
        prefs.edit()
                .putBoolean(K_SERVICE_ENABLED, true)
                .putLong(K_HEARTBEAT, System.currentTimeMillis())
                .putString(K_RISK, riskLevel == null ? "unknown" : riskLevel)
                .putString(K_ENGINE_SET, engineSet == null ? "guardian" : engineSet)
                .putString(K_POLICY, "p0-local-1")
                .putString(K_REPUTATION, "local-none")
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
        return new Lease(
                prefs.getString(K_INSTANCE_ID, "unknown"),
                prefs.getString(K_INSTALLATION_ID, "unknown"),
                state,
                optedIn,
                serviceEnabled,
                heartbeat,
                expiresAt,
                prefs.getString(K_RISK, "unknown"),
                prefs.getString(K_ENGINE_SET, "none"),
                prefs.getString(K_POLICY, "unknown"),
                prefs.getString(K_REPUTATION, "unknown"));
    }

    public static final class Lease {
        public final String guardianInstanceId;
        public final String deviceInstallationId;
        public final ProtectionTruth.State state;
        public final boolean userOptedIn;
        public final boolean serviceEnabled;
        public final long lastHeartbeatMs;
        public final long expiresAtMs;
        public final String localRiskLevel;
        public final String activeEngineSet;
        public final String policyVersion;
        public final String reputationSnapshotVersion;

        Lease(String guardianInstanceId,
              String deviceInstallationId,
              ProtectionTruth.State state,
              boolean userOptedIn,
              boolean serviceEnabled,
              long lastHeartbeatMs,
              long expiresAtMs,
              String localRiskLevel,
              String activeEngineSet,
              String policyVersion,
              String reputationSnapshotVersion) {
            this.guardianInstanceId = guardianInstanceId;
            this.deviceInstallationId = deviceInstallationId;
            this.state = state;
            this.userOptedIn = userOptedIn;
            this.serviceEnabled = serviceEnabled;
            this.lastHeartbeatMs = lastHeartbeatMs;
            this.expiresAtMs = expiresAtMs;
            this.localRiskLevel = localRiskLevel;
            this.activeEngineSet = activeEngineSet;
            this.policyVersion = policyVersion;
            this.reputationSnapshotVersion = reputationSnapshotVersion;
        }
    }
}
