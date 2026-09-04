"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import ThermalProtectionControl from "../../components/ThermalProtectionControl.js";
import {
  DEVICE_COMPUTE_EVENT,
  DEVICE_COMPUTE_POLICY_VERSION,
  DEVICE_COMPUTE_STORAGE_KEY,
  classifyDevice,
  computeDeviceBudget,
  createDefaultDeviceComputeSettings,
  sanitizeDeviceComputeSettings,
} from "../../../lib/device-compute/policy.js";

function readSettings() {
  try {
    const raw = localStorage.getItem(DEVICE_COMPUTE_STORAGE_KEY);
    return sanitizeDeviceComputeSettings(raw ? JSON.parse(raw) : {});
  } catch {
    return createDefaultDeviceComputeSettings();
  }
}

export default function DeviceComputePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState(() => createDefaultDeviceComputeSettings());
  const [thermalState, setThermalState] = useState("unknown");
  const [battery, setBattery] = useState({ level: null, charging: false });

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const response = await fetch("/api/auth/session", { cache: "no-store", credentials: "same-origin" });
        const data = await response.json().catch(() => ({}));
        if (!mounted) return;
        if (!response.ok || data?.authenticated !== true || data?.sessionAuthority !== "laneriq") {
          router.replace("/auth?next=%2Faccount%2Fdevice-compute");
          return;
        }
        setSettings(readSettings());
      } catch {
        if (mounted) router.replace("/auth?next=%2Faccount%2Fdevice-compute");
        return;
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    const updateThermal = () => {
      if (!mounted) return;
      try { setThermalState(String(window.__LANERIQ_NATIVE_TELEMETRY__?.thermalState || "unknown")); }
      catch { setThermalState("unknown"); }
    };
    const updateSettings = (event) => {
      if (!mounted || event?.detail?.source !== "settings-ui") return;
      setSettings(sanitizeDeviceComputeSettings(event.detail.settings || {}));
    };
    updateThermal();
    window.addEventListener("laneriq:native-telemetry", updateThermal);
    window.addEventListener(DEVICE_COMPUTE_EVENT, updateSettings);

    let manager = null;
    const updateBattery = () => {
      if (!mounted || !manager) return;
      setBattery({ level: Number.isFinite(Number(manager.level)) ? Number(manager.level) : null, charging: manager.charging === true });
    };
    if (typeof navigator?.getBattery === "function") {
      navigator.getBattery().then((value) => {
        if (!mounted) return;
        manager = value;
        updateBattery();
        value.addEventListener?.("levelchange", updateBattery);
        value.addEventListener?.("chargingchange", updateBattery);
      }).catch(() => {});
    }

    return () => {
      mounted = false;
      window.removeEventListener("laneriq:native-telemetry", updateThermal);
      window.removeEventListener(DEVICE_COMPUTE_EVENT, updateSettings);
      manager?.removeEventListener?.("levelchange", updateBattery);
      manager?.removeEventListener?.("chargingchange", updateBattery);
    };
  }, [router]);

  const device = useMemo(() => {
    if (typeof navigator === "undefined") return { deviceClass: "mobile", cores: 1, memory: 0 };
    const input = {
      userAgent: navigator.userAgent || "",
      hardwareConcurrency: Number(navigator.hardwareConcurrency || 1),
      deviceMemory: Number(navigator.deviceMemory || 0),
      maxTouchPoints: Number(navigator.maxTouchPoints || 0),
    };
    return { deviceClass: classifyDevice(input), cores: input.hardwareConcurrency, memory: input.deviceMemory };
  }, [loading]);

  const budget = useMemo(() => computeDeviceBudget({
    settings,
    deviceClass: device.deviceClass,
    thermalState,
    batteryLevel: battery.level,
    charging: battery.charging,
    visibility: "visible",
    hardwareConcurrency: device.cores,
  }), [battery.charging, battery.level, device.cores, device.deviceClass, settings, thermalState]);

  if (loading) return <main className="computePage"><section className="computeCard"><p>Loading Device &amp; Compute…</p></section></main>;

  return <main className="computePage">
    <section className="computeCard">
      <button className="back" type="button" onClick={() => router.push("/my-apps")}>← My Projects</button>
      <div className="eyebrow">LANERIQ AI · AUTOMATIC DEVICE-FIRST</div>
      <h1>Device &amp; Compute</h1>
      <p className="lead">LANERIQ automatically chooses <b>NPU → GPU → CPU</b> on your own device first. AI providers are internal fallback only and are not customer-selectable.</p>

      <div className="statusGrid">
        <div><span>Detected device</span><strong>{device.deviceClass}</strong><small>{device.cores} logical CPU threads{device.memory ? ` · ~${device.memory} GB browser memory signal` : ""}</small></div>
        <div><span>Compute route</span><strong>Automatic</strong><small>Device first · provider fallback only when needed</small></div>
        <div><span>High-energy mode</span><strong>Image + Video only</strong><small>Other LANERIQ work cannot request the 150% relative burst profile</small></div>
        <div><span>Thermal state</span><strong>{budget.thermalTelemetryAvailable ? budget.thermalState : "Conservative"}</strong><small>{budget.thermalTelemetryAvailable ? "Native thermal telemetry available" : "Browser does not invent temperature readings"}</small></div>
      </div>

      <ThermalProtectionControl />

      <section className="policy">
        <div><b>Normal App / Code / Test / Self-Heal</b><span>Standard device-first budget. No high-energy burst.</span></div>
        <div><b>Create Image</b><span>May request a short 150% relative-to-baseline burst, never more than 100% physical hardware utilization, then automatic cooldown.</span></div>
        <div><b>Create Video</b><span>May request the same bounded high-energy burst profile when a local/native execution path is available, then automatic cooldown.</span></div>
        <div><b>Safety boundary</b><span>Thermal Guardian remains active even if early overheat prevention is turned off. Cross-customer compute remains prohibited.</span></div>
      </section>

      <div className="foot">Policy {DEVICE_COMPUTE_POLICY_VERSION} · Provider names, performance modes and Local/Cloud target choices are intentionally hidden from customer controls.</div>
    </section>
    <style jsx>{`
      .computePage{min-height:100svh;padding:92px 18px 48px;background:radial-gradient(circle at 50% 7%,rgba(20,105,78,.28),transparent 30%),linear-gradient(180deg,#020b09,#041711 54%,#020b09);color:#edf7f2;font-family:Inter,system-ui,-apple-system,sans-serif}.computeCard{width:min(920px,100%);margin:0 auto;padding:28px;border:1px solid rgba(220,191,91,.26);border-radius:28px;background:rgba(3,20,15,.91);box-shadow:0 30px 100px rgba(0,0,0,.5);backdrop-filter:blur(20px)}.back{border:0;background:transparent;color:#d9c36a;font-weight:900;cursor:pointer;padding:4px 0 18px}.eyebrow{font-size:10px;font-weight:1000;letter-spacing:.16em;color:#d9c36a}.computeCard h1{font-size:clamp(34px,7vw,54px);line-height:1;margin:10px 0 12px}.lead{max-width:760px;color:#adbbb5;line-height:1.65}.lead b{color:#f0d879}.statusGrid{display:grid;grid-template-columns:repeat(4,1fr);gap:9px;margin:24px 0}.statusGrid div,.policy div{border:1px solid rgba(255,255,255,.08);background:rgba(255,255,255,.03);border-radius:17px;padding:14px}.statusGrid span,.statusGrid small,.policy span{display:block;color:#8fa59a;font-size:9px;line-height:1.5}.statusGrid strong{display:block;margin:6px 0 4px;color:#eed672;font-size:14px}.policy{display:grid;grid-template-columns:1fr 1fr;gap:9px;margin-top:12px}.policy b{display:block;color:#e9d378;font-size:12px;margin-bottom:5px}.foot{margin-top:14px;color:#70877d;font-size:9px;line-height:1.5}@media(max-width:760px){.statusGrid,.policy{grid-template-columns:1fr 1fr}}@media(max-width:520px){.computePage{padding:78px 12px 38px}.computeCard{padding:19px;border-radius:22px}.statusGrid,.policy{grid-template-columns:1fr}.lead{font-size:13px}}
    `}</style>
  </main>;
}
