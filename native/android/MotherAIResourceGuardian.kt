package ai.laneriq.runtime

import android.content.Context
import android.net.ConnectivityManager
import android.os.BatteryManager
import android.os.Build
import android.os.PowerManager

/**
 * Native telemetry adapter for a future signed LANERIQ Android shell.
 *
 * This class does not create long-running background services and does not bypass Android
 * power management. The host app must use system-managed work (normally WorkManager) and
 * pass the lease/constraint state into snapshot(). Mobile Community Compute stays disabled.
 */
class MotherAIResourceGuardian(private val context: Context) {
    companion object {
        const val BRIDGE_VERSION = "2026-09-05.1"
    }

    fun snapshot(
        lifecycleState: String,
        backgroundLease: String = "none",
        backgroundConstraintsSatisfied: Boolean = false,
        userActive: Boolean = true,
        deviceIdle: Boolean = false,
        networkType: String = "unknown"
    ): Map<String, Any?> {
        val power = context.getSystemService(Context.POWER_SERVICE) as PowerManager
        val battery = context.getSystemService(Context.BATTERY_SERVICE) as BatteryManager
        val connectivity = context.getSystemService(Context.CONNECTIVITY_SERVICE) as ConnectivityManager

        val batteryPercent = battery.getIntProperty(BatteryManager.BATTERY_PROPERTY_CAPACITY)
        val chargingStatus = battery.getIntProperty(BatteryManager.BATTERY_PROPERTY_STATUS)
        val charging = chargingStatus == BatteryManager.BATTERY_STATUS_CHARGING || chargingStatus == BatteryManager.BATTERY_STATUS_FULL

        return mapOf(
            "bridgeVersion" to BRIDGE_VERSION,
            "platform" to "android",
            "thermalState" to thermalState(power),
            "lowPowerMode" to power.isPowerSaveMode,
            "batteryLevel" to if (batteryPercent in 0..100) batteryPercent / 100.0 else null,
            "charging" to charging,
            "lifecycleState" to lifecycleState,
            "backgroundLease" to backgroundLease,
            "backgroundConstraintsSatisfied" to backgroundConstraintsSatisfied,
            "networkType" to networkType,
            "meteredNetwork" to connectivity.isActiveNetworkMetered,
            "userActive" to userActive,
            "deviceIdle" to deviceIdle,
            "communityComputeAllowed" to false,
            "downloadedExecutableWorkloadsAllowed" to false
        )
    }

    private fun thermalState(power: PowerManager): String {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.Q) return "unknown"
        return when (power.currentThermalStatus) {
            PowerManager.THERMAL_STATUS_NONE, PowerManager.THERMAL_STATUS_LIGHT -> "nominal"
            PowerManager.THERMAL_STATUS_MODERATE -> "fair"
            PowerManager.THERMAL_STATUS_SEVERE -> "serious"
            PowerManager.THERMAL_STATUS_CRITICAL,
            PowerManager.THERMAL_STATUS_EMERGENCY,
            PowerManager.THERMAL_STATUS_SHUTDOWN -> "critical"
            else -> "unknown"
        }
    }
}
