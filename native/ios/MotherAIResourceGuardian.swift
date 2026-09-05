import Foundation
import UIKit

/// Native telemetry adapter for a future signed LANERIQ iOS/iPadOS shell.
///
/// This module intentionally does not schedule background work by itself. The host app must
/// obtain legitimate system-managed background runtime (for example BGProcessingTask or
/// task-completion time) and then pass that lease state to `snapshot`.
///
/// No Community Compute execution is permitted on iOS/iPadOS.
public final class MotherAIResourceGuardian {
    public static let bridgeVersion = "2026-09-05.1"

    public init() {
        UIDevice.current.isBatteryMonitoringEnabled = true
    }

    public func snapshot(
        lifecycleState: String,
        backgroundLease: String = "none",
        backgroundConstraintsSatisfied: Bool = false,
        userActive: Bool = true,
        deviceIdle: Bool = false,
        networkType: String = "unknown",
        meteredNetwork: Bool = false
    ) -> [String: Any] {
        let process = ProcessInfo.processInfo
        let device = UIDevice.current

        return [
            "bridgeVersion": Self.bridgeVersion,
            "platform": UIDevice.current.userInterfaceIdiom == .pad ? "ipados" : "ios",
            "thermalState": thermalState(process.thermalState),
            "lowPowerMode": process.isLowPowerModeEnabled,
            "batteryLevel": normalizedBatteryLevel(device.batteryLevel),
            "charging": device.batteryState == .charging || device.batteryState == .full,
            "lifecycleState": lifecycleState,
            "backgroundLease": backgroundLease,
            "backgroundConstraintsSatisfied": backgroundConstraintsSatisfied,
            "networkType": networkType,
            "meteredNetwork": meteredNetwork,
            "userActive": userActive,
            "deviceIdle": deviceIdle,
            "communityComputeAllowed": false,
            "downloadedExecutableWorkloadsAllowed": false
        ]
    }

    private func normalizedBatteryLevel(_ level: Float) -> Any {
        guard level >= 0 else { return NSNull() }
        return max(0, min(1, Double(level)))
    }

    private func thermalState(_ state: ProcessInfo.ThermalState) -> String {
        switch state {
        case .nominal:
            return "nominal"
        case .fair:
            return "fair"
        case .serious:
            return "serious"
        case .critical:
            return "critical"
        @unknown default:
            return "unknown"
        }
    }
}
