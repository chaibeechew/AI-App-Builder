package ai.laneriq.antiscam;

import android.content.Context;
import android.os.Build;
import android.os.PowerManager;

public final class ResourceGovernor {
    private static final long NORMAL_INTERVAL_MS = 30_000L;
    private static final long REDUCED_INTERVAL_MS = 120_000L;

    private final PowerManager powerManager;

    public ResourceGovernor(Context context) {
        powerManager = (PowerManager) context.getSystemService(Context.POWER_SERVICE);
    }

    public boolean shouldReduceBackgroundWork() {
        if (powerManager == null) return false;
        if (powerManager.isPowerSaveMode()) return true;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            return powerManager.getCurrentThermalStatus() >= PowerManager.THERMAL_STATUS_MODERATE;
        }
        return false;
    }

    public long nextGuardianIntervalMs() {
        return shouldReduceBackgroundWork() ? REDUCED_INTERVAL_MS : NORMAL_INTERVAL_MS;
    }
}
