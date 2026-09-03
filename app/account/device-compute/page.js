"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  COMPUTE_MODES,
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

function newInstallationId() {
  try { if (crypto?.randomUUID) return `device-${crypto.randomUUID()}`; } catch {}
  return `device-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
}

function bytes(value) {
  const n = Math.max(0, Number(value || 0));
  if (n < 1024) return `${Math.round(n)} B`;
  if (n < 1024 ** 2) return `${(n / 1024).toFixed(1)} KB`;
  if (n < 1024 ** 3) return `${(n / 1024 ** 2).toFixed(1)} MB`;
  return `${(n / 1024 ** 3).toFixed(2)} GB`;
}

export default function DeviceComputePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState(() => createDefaultDeviceComputeSettings());
  const [thermalState, setThermalState] = useState("unknown");
  const [battery, setBattery] = useState({ level: null, charging: false });
  const [storage, setStorage] = useState({ usage: null, quota: null, persistent: null });
  const [message, setMessage] = useState("");

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
    updateThermal();
    window.addEventListener("laneriq:native-telemetry", updateThermal);

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

    const readStorage = async () => {
      try {
        const estimate = await navigator?.storage?.estimate?.();
        const persistent = await navigator?.storage?.persisted?.();
        if (mounted) setStorage({ usage: estimate?.usage ?? null, quota: estimate?.quota ?? null, persistent: typeof persistent === "boolean" ? persistent : null });
      } catch {}
    };
    void readStorage();

    return () => {
      mounted = false;
      window.removeEventListener("laneriq:native-telemetry", updateThermal);
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

  function save(patch, success = "Saved on this device.") {
    const now = new Date().toISOString();
    const next = sanitizeDeviceComputeSettings({
      ...settings,
      ...patch,
      policyVersion: DEVICE_COMPUTE_POLICY_VERSION,
      installationId: settings.installationId || newInstallationId(),
      consentAt: patch.decision && patch.decision !== settings.decision ? now : settings.consentAt || now,
      crossUserComputeEnabled: false,
      thermalGuardianEnabled: true,
    });
    try { localStorage.setItem(DEVICE_COMPUTE_STORAGE_KEY, JSON.stringify(next)); } catch {}
    setSettings(next);
    setMessage(success);
    window.dispatchEvent(new CustomEvent(DEVICE_COMPUTE_EVENT, { detail: { settings: next } }));
  }

  async function requestPersistentStorage() {
    if (!navigator?.storage?.persist) {
      setMessage("Persistent browser storage is not available on this browser. LANERIQ will still use normal local storage where supported.");
      return;
    }
    try {
      const persistent = await navigator.storage.persist();
      const estimate = await navigator.storage.estimate?.();
      setStorage({ usage: estimate?.usage ?? storage.usage, quota: estimate?.quota ?? storage.quota, persistent: Boolean(persistent) });
      save({ keepLocalProjectData: true }, persistent ? "Local project storage is now protected from routine browser eviction where the browser supports it." : "Local project storage remains enabled, but this browser did not grant persistent storage.");
    } catch {
      setMessage("The browser could not change persistent storage right now.");
    }
  }

  function resetDevice() {
    try { localStorage.removeItem(DEVICE_COMPUTE_STORAGE_KEY); } catch {}
    setSettings(createDefaultDeviceComputeSettings());
    setMessage("This device's LANERIQ compute choice was reset. You will be asked again on next authenticated use.");
  }

  if (loading) return <main className="computePage"><section className="computeCard"><p>Loading Device &amp; Compute settings…</p></section></main>;

  return <main className="computePage">
    <section className="computeCard">
      <button className="back" type="button" onClick={() => router.push("/my-apps")}>← My Projects</button>
      <div className="eyebrow">LANERIQ AI · ZERO-COST LOCAL-FIRST</div>
      <h1>Device &amp; Compute</h1>
      <p className="lead">Control how LANERIQ uses <b>your own</b> CPU, GPU, NPU and local storage. Thermal Guardian stays on permanently, background compute is opt-in, and this device is never used for another customer&apos;s work.</p>

      <div className="statusGrid">
        <div><span>Detected device</span><strong>{device.deviceClass}</strong><small>{device.cores} logical CPU threads{device.memory ? ` · ~${device.memory} GB browser memory signal` : ""}</small></div>
        <div><span>Thermal telemetry</span><strong>{budget.thermalTelemetryAvailable ? budget.thermalState : "Unavailable in web"}</strong><small>{budget.thermalTelemetryAvailable ? "Provided by installed LANERIQ native wrapper" : "LANERIQ does not invent browser temperature readings"}</small></div>
        <div><span>Current route</span><strong>{budget.route.replaceAll("_", " ")}</strong><small>{budget.reason.replaceAll("_", " ")}</small></div>
        <div><span>Local browser storage</span><strong>{storage.usage === null ? "Unknown" : bytes(storage.usage)}</strong><small>{storage.quota === null ? "Quota signal unavailable" : `${bytes(storage.quota)} estimated quota`} · {storage.persistent === true ? "persistent" : storage.persistent === false ? "not persistent" : "persistence unknown"}</small></div>
      </div>

      <section className="panel">
        <div className="panelHead"><div><h2>Local Compute</h2><p>Use this device first when a LANERIQ runtime has a safe local execution path.</p></div><button className={settings.localComputeEnabled ? "toggle on" : "toggle"} type="button" aria-pressed={settings.localComputeEnabled} onClick={() => save(settings.localComputeEnabled ? { decision: "cloud_only", localComputeEnabled: false, backgroundComputeEnabled: false } : { decision: "local", localComputeEnabled: true })}><span /></button></div>
        <div className="modeGrid">
          {Object.values(COMPUTE_MODES).map((mode) => <button key={mode.id} className={settings.mode === mode.id ? "mode active" : "mode"} type="button" disabled={!settings.localComputeEnabled} onClick={() => save({ mode: mode.id })}><b>{mode.id === "battery_saver" ? "🌿" : mode.id === "gaming" ? "🎮" : "⚡"} {mode.label}</b><span>{mode.description}</span></button>)}
        </div>
        <div className="budgetBox">
          <div><span>Sustained CPU scheduler target</span><b>{Math.round(budget.sustainedCpuShare * 100)}%</b></div>
          <div><span>Sustained GPU scheduler target</span><b>{Math.round(budget.sustainedGpuShare * 100)}%</b></div>
          <div><span>Short CPU burst ceiling</span><b>{Math.round(budget.burstCpuShare * 100)}%</b></div>
          <div><span>Short GPU burst ceiling</span><b>{Math.round(budget.burstGpuShare * 100)}%</b></div>
          <div><span>Burst window</span><b>{budget.burstSeconds}s</b></div>
          <div><span>Recovery window</span><b>{budget.recoverySeconds}s</b></div>
          <div><span>Worker limit now</span><b>{budget.effectiveWorkerLimit}</b></div>
          <div><span>NPU preference</span><b>First</b></div>
        </div>
        <p className="note">These are LANERIQ scheduler ceilings, not a promise that the operating system will expose or hold an exact utilization percentage. Native apps can enforce richer CPU/GPU/NPU scheduling and thermal feedback than the browser.</p>
      </section>

      <section className="panel">
        <h2>Local Storage</h2>
        <label className="row"><div><b>Keep project working data on this device first</b><span>Local-first project data reduces cloud database, storage and bandwidth usage.</span></div><input type="checkbox" checked={settings.keepLocalProjectData} onChange={(event) => save({ keepLocalProjectData: event.target.checked })} /></label>
        <button className="secondary" type="button" onClick={() => void requestPersistentStorage()}>Request persistent local storage</button>
      </section>

      <section className="panel">
        <h2>Cross-device &amp; Background</h2>
        <label className="row"><div><b>Background compute</b><span>OFF by default. Only enable when you explicitly want this device to continue eligible local work in the background.</span></div><input type="checkbox" checked={settings.backgroundComputeEnabled} disabled={!settings.localComputeEnabled} onChange={(event) => save({ backgroundComputeEnabled: event.target.checked })} /></label>
        <label className="row"><div><b>Use my linked Desktop for heavy work</b><span>This preference becomes active when a LANERIQ Desktop app is linked. It never sends your task to another customer&apos;s device.</span></div><input type="checkbox" checked={settings.ownDesktopRemoteComputeEnabled} onChange={(event) => save({ ownDesktopRemoteComputeEnabled: event.target.checked })} /></label>
        <div className="locked"><b>Other customers&apos; devices</b><span>Always OFF · LANERIQ does not use your hardware for somebody else&apos;s jobs.</span><strong>Not allowed</strong></div>
      </section>

      <section className="panel compact">
        <div><b>Thermal Guardian</b><span>Always ON</span></div>
        <div><b>Cloud fallback</b><span>Available when local/own-device execution cannot safely finish the task</span></div>
        <div><b>User-facing Credits required</b><span>No — cost control stays internal at this stage</span></div>
        <div><b>Policy version</b><span>{DEVICE_COMPUTE_POLICY_VERSION}</span></div>
      </section>

      {message && <div className="message" role="status">{message}</div>}
      <button className="reset" type="button" onClick={resetDevice}>Reset this device choice</button>
    </section>

    <style jsx>{`
      .computePage{min-height:100svh;padding:92px 18px 48px;background:radial-gradient(circle at 50% 7%,rgba(20,105,78,.28),transparent 30%),linear-gradient(180deg,#020b09,#041711 54%,#020b09);color:#edf7f2;font-family:Inter,system-ui,-apple-system,sans-serif}.computeCard{width:min(920px,100%);margin:0 auto;padding:28px;border:1px solid rgba(220,191,91,.26);border-radius:28px;background:rgba(3,20,15,.91);box-shadow:0 30px 100px rgba(0,0,0,.5);backdrop-filter:blur(20px)}.back{border:0;background:transparent;color:#d9c36a;font-weight:900;cursor:pointer;padding:4px 0 18px}.eyebrow{font-size:10px;font-weight:1000;letter-spacing:.16em;color:#d9c36a}.computeCard h1{font-size:clamp(34px,7vw,54px);line-height:1;margin:10px 0 12px}.lead{max-width:760px;color:#adbbb5;line-height:1.65}.lead b{color:#f0d879}.statusGrid{display:grid;grid-template-columns:repeat(4,1fr);gap:9px;margin:24px 0}.statusGrid div,.panel{border:1px solid rgba(255,255,255,.08);background:rgba(255,255,255,.03);border-radius:17px}.statusGrid div{padding:14px}.statusGrid span,.statusGrid small{display:block;color:#8fa59a;font-size:9px;line-height:1.4}.statusGrid strong{display:block;margin:6px 0 4px;color:#eed672;font-size:15px;text-transform:capitalize}.panel{padding:18px;margin-top:10px}.panel h2{margin:0 0 5px;font-size:18px}.panel p{margin:0;color:#8fa59a;font-size:11px;line-height:1.55}.panelHead{display:flex;gap:16px;justify-content:space-between;align-items:center}.toggle{width:54px;height:32px;border:0;border-radius:999px;padding:3px;background:#23352e;cursor:pointer}.toggle span{display:block;width:26px;height:26px;border-radius:50%;background:#a8b6b0;transition:.2s}.toggle.on{background:#c9a84c}.toggle.on span{transform:translateX(22px);background:#07130e}.modeGrid{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-top:16px}.mode{min-height:116px;padding:13px;border:1px solid rgba(255,255,255,.08);border-radius:14px;background:rgba(255,255,255,.02);color:#cbd8d2;text-align:left;cursor:pointer}.mode:disabled{opacity:.45;cursor:not-allowed}.mode.active{border-color:rgba(235,205,99,.55);background:rgba(216,191,98,.09)}.mode b,.mode span{display:block}.mode b{color:#eed672;font-size:12px}.mode span{margin-top:7px;color:#93a69e;font-size:10px;line-height:1.45}.budgetBox{display:grid;grid-template-columns:repeat(4,1fr);gap:7px;margin-top:12px}.budgetBox div{padding:11px;border-radius:12px;background:#00100c;border:1px solid rgba(255,255,255,.055)}.budgetBox span,.budgetBox b{display:block}.budgetBox span{color:#7f958b;font-size:8px;line-height:1.35}.budgetBox b{margin-top:5px;color:#e9cf70;font-size:14px}.note{margin-top:12px!important}.row{display:flex;align-items:center;justify-content:space-between;gap:18px;padding:13px 0;border-top:1px solid rgba(255,255,255,.06)}.row:first-of-type{margin-top:10px}.row div b,.row div span{display:block}.row div b{font-size:12px}.row div span{margin-top:4px;color:#849a90;font-size:10px;line-height:1.45}.row input{width:22px;height:22px;accent-color:#d5b854;flex:0 0 auto}.secondary,.reset{min-height:46px;border-radius:13px;font-weight:900;cursor:pointer}.secondary{margin-top:10px;border:1px solid rgba(216,191,98,.25);background:rgba(216,191,98,.08);color:#e6ce76;padding:0 15px}.locked{display:grid;grid-template-columns:1fr auto;gap:3px 14px;align-items:center;margin-top:8px;padding:13px;border-radius:13px;background:rgba(255,255,255,.025);border:1px solid rgba(255,255,255,.06)}.locked b,.locked span{display:block}.locked b{font-size:12px}.locked span{font-size:9px;color:#81978d}.locked strong{grid-row:1/3;grid-column:2;color:#9fb0a8;font-size:10px}.compact{display:grid;grid-template-columns:repeat(2,1fr);gap:8px}.compact div{padding:10px;border-radius:11px;background:#00100c}.compact b,.compact span{display:block}.compact b{color:#d9c36a;font-size:10px}.compact span{margin-top:4px;color:#91a49b;font-size:9px;line-height:1.4}.message{margin-top:12px;padding:12px 14px;border:1px solid rgba(79,220,149,.2);border-radius:13px;background:rgba(65,180,120,.1);color:#b5f2cf;font-size:11px;font-weight:800;line-height:1.5}.reset{margin-top:14px;border:1px solid rgba(255,130,120,.16);background:transparent;color:#f0aaa4;padding:0 15px}@media(max-width:760px){.computePage{padding:78px 11px 28px}.computeCard{padding:19px;border-radius:22px}.statusGrid,.budgetBox{grid-template-columns:repeat(2,1fr)}.modeGrid,.compact{grid-template-columns:1fr}.panelHead{align-items:flex-start}.row{align-items:flex-start}.statusGrid div{min-height:78px}}@media(max-width:430px){.statusGrid,.budgetBox{grid-template-columns:1fr 1fr}.computeCard h1{font-size:38px}}
    `}</style>
  </main>;
}
