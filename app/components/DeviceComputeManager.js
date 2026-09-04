"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  DEVICE_COMPUTE_EVENT,
  DEVICE_COMPUTE_POLICY_VERSION,
  DEVICE_COMPUTE_STORAGE_KEY,
  classifyDevice,
  computeDeviceBudget,
  createDefaultDeviceComputeSettings,
  sanitizeDeviceComputeSettings,
} from "../../lib/device-compute/policy.js";
import {
  createAdaptiveBurstPlan,
  normalizeHighEnergyWorkload,
} from "../../lib/device-compute/adaptive-burst.js";

function installationId() {
  try {
    if (globalThis.crypto?.randomUUID) return `device-${globalThis.crypto.randomUUID()}`;
  } catch {}
  return `device-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
}

function readSettings() {
  if (typeof window === "undefined") return createDefaultDeviceComputeSettings();
  try {
    const raw = window.localStorage.getItem(DEVICE_COMPUTE_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    const safe = sanitizeDeviceComputeSettings(parsed);
    if (!safe.installationId) safe.installationId = installationId();
    window.localStorage.setItem(DEVICE_COMPUTE_STORAGE_KEY, JSON.stringify(safe));
    return safe;
  } catch {
    return createDefaultDeviceComputeSettings();
  }
}

function nativeThermalState() {
  try {
    return String(window.__LANERIQ_NATIVE_TELEMETRY__?.thermalState || "unknown");
  } catch {
    return "unknown";
  }
}

function deviceInputs() {
  const nav = typeof navigator === "undefined" ? {} : navigator;
  return {
    userAgent: nav.userAgent || "",
    hardwareConcurrency: Number(nav.hardwareConcurrency || 1),
    deviceMemory: Number(nav.deviceMemory || 0),
    maxTouchPoints: Number(nav.maxTouchPoints || 0),
  };
}

function notifyNative(detail) {
  try {
    window.__LANERIQ_NATIVE_COMPUTE__?.setAdaptiveComputeState?.(detail);
  } catch {}
}

export default function DeviceComputeManager() {
  const [settings, setSettings] = useState(() => createDefaultDeviceComputeSettings());
  const [ready, setReady] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
  const [battery, setBattery] = useState({ level: null, charging: false });
  const [thermalState, setThermalState] = useState("unknown");
  const [storagePersistent, setStoragePersistent] = useState(null);
  const [computePhase, setComputePhase] = useState({ phase: "normal", workloadKind: "standard", plan: null });
  const burstTimer = useRef(null);
  const cooldownTimer = useRef(null);

  useEffect(() => {
    const initial = readSettings();
    setSettings(initial);
    setReady(true);
    let mounted = true;

    (async () => {
      try {
        const response = await fetch("/api/auth/session", { method: "GET", cache: "no-store", credentials: "same-origin" });
        const data = await response.json().catch(() => ({}));
        if (mounted) setAuthenticated(response.ok && data?.authenticated === true && data?.sessionAuthority === "laneriq");
      } catch {
        if (mounted) setAuthenticated(false);
      }
    })();

    const updateThermal = () => { if (mounted) setThermalState(nativeThermalState()); };
    const updateSettings = (event) => {
      if (!mounted || event?.detail?.source !== "settings-ui" || !event?.detail?.settings) return;
      setSettings(sanitizeDeviceComputeSettings(event.detail.settings));
    };
    updateThermal();
    window.addEventListener("laneriq:native-telemetry", updateThermal);
    window.addEventListener(DEVICE_COMPUTE_EVENT, updateSettings);

    let batteryManager = null;
    const updateBattery = () => {
      if (!mounted || !batteryManager) return;
      setBattery({
        level: Number.isFinite(Number(batteryManager.level)) ? Number(batteryManager.level) : null,
        charging: batteryManager.charging === true,
      });
    };
    if (typeof navigator?.getBattery === "function") {
      navigator.getBattery().then((manager) => {
        if (!mounted) return;
        batteryManager = manager;
        updateBattery();
        manager.addEventListener?.("levelchange", updateBattery);
        manager.addEventListener?.("chargingchange", updateBattery);
      }).catch(() => {});
    }

    if (navigator?.storage?.persisted) {
      navigator.storage.persisted().then((value) => { if (mounted) setStoragePersistent(Boolean(value)); }).catch(() => {});
    }

    return () => {
      mounted = false;
      window.removeEventListener("laneriq:native-telemetry", updateThermal);
      window.removeEventListener(DEVICE_COMPUTE_EVENT, updateSettings);
      batteryManager?.removeEventListener?.("levelchange", updateBattery);
      batteryManager?.removeEventListener?.("chargingchange", updateBattery);
      if (burstTimer.current) clearTimeout(burstTimer.current);
      if (cooldownTimer.current) clearTimeout(cooldownTimer.current);
    };
  }, []);

  const snapshot = useMemo(() => {
    if (!ready) return null;
    const input = deviceInputs();
    const deviceClass = classifyDevice(input);
    const budget = computeDeviceBudget({
      settings,
      deviceClass,
      thermalState,
      batteryLevel: battery.level,
      charging: battery.charging,
      visibility: typeof document !== "undefined" ? document.visibilityState : "visible",
      hardwareConcurrency: input.hardwareConcurrency,
    });
    return {
      policyVersion: DEVICE_COMPUTE_POLICY_VERSION,
      settings,
      deviceClass,
      budget,
      computePhase,
      storagePersistent,
      nativeThermalTelemetry: thermalState !== "unknown",
    };
  }, [battery.charging, battery.level, computePhase, ready, settings, storagePersistent, thermalState]);

  useEffect(() => {
    if (!snapshot || !authenticated) return;

    const clearTimers = () => {
      if (burstTimer.current) clearTimeout(burstTimer.current);
      if (cooldownTimer.current) clearTimeout(cooldownTimer.current);
      burstTimer.current = null;
      cooldownTimer.current = null;
    };

    const finishCooldown = () => {
      const state = { phase: "normal", workloadKind: "standard", plan: null };
      setComputePhase(state);
      notifyNative(state);
      window.dispatchEvent(new CustomEvent("laneriq:device-cooling", { detail: state }));
    };

    const enterCooldown = (plan) => {
      clearTimers();
      const state = { phase: "cooldown", workloadKind: plan.workloadKind, plan };
      setComputePhase(state);
      notifyNative(state);
      window.dispatchEvent(new CustomEvent("laneriq:device-cooling", { detail: state }));
      cooldownTimer.current = setTimeout(finishCooldown, Math.max(1, plan.cooldownSeconds) * 1000);
      return state;
    };

    const beginHighEnergyWorkload = (workloadKind) => {
      const normalized = normalizeHighEnergyWorkload(workloadKind);
      const plan = createAdaptiveBurstPlan({
        workloadKind: normalized,
        deviceClass: snapshot.deviceClass,
        thermalState: snapshot.budget.thermalState,
        preventOverheatingEnabled: snapshot.settings.preventOverheatingEnabled,
        baselineCpuShare: snapshot.budget.sustainedCpuShare,
        baselineGpuShare: snapshot.budget.sustainedGpuShare,
      });

      clearTimers();
      if (!plan.highEnergy) return plan;
      if (plan.phase === "cooldown") {
        enterCooldown(plan);
        return plan;
      }

      const state = { phase: "burst", workloadKind: plan.workloadKind, plan };
      setComputePhase(state);
      notifyNative(state);
      window.dispatchEvent(new CustomEvent("laneriq:device-burst", { detail: state }));
      burstTimer.current = setTimeout(() => enterCooldown(plan), Math.max(1, plan.burstSeconds) * 1000);
      return plan;
    };

    const endHighEnergyWorkload = (workloadKind) => {
      const normalized = normalizeHighEnergyWorkload(workloadKind);
      const active = computePhase?.plan;
      if (!active?.highEnergy || active.workloadKind !== normalized) return null;
      return enterCooldown(active);
    };

    const api = Object.freeze({
      getSnapshot: () => snapshot,
      beginHighEnergyWorkload,
      endHighEnergyWorkload,
      policyVersion: DEVICE_COMPUTE_POLICY_VERSION,
      automaticDeviceFirst: true,
      onlyImageAndVideoHighEnergy: true,
      providerSelectionUserVisible: false,
      onlyUserSelectableComputeControl: "prevent_overheating",
      ownDevicesOnly: true,
      crossUserComputeAllowed: false,
    });

    window.__LANERIQ_DEVICE_COMPUTE__ = api;
    window.dispatchEvent(new CustomEvent(DEVICE_COMPUTE_EVENT, { detail: snapshot }));
    return () => {
      if (window.__LANERIQ_DEVICE_COMPUTE__ === api) delete window.__LANERIQ_DEVICE_COMPUTE__;
    };
  }, [authenticated, computePhase, snapshot]);

  return null;
}
