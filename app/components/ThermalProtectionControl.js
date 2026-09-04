"use client";

import { useEffect, useState } from "react";
import {
  DEVICE_COMPUTE_EVENT,
  DEVICE_COMPUTE_STORAGE_KEY,
  createDefaultDeviceComputeSettings,
  sanitizeDeviceComputeSettings,
} from "../../lib/device-compute/policy.js";

function readSettings() {
  try {
    const raw = localStorage.getItem(DEVICE_COMPUTE_STORAGE_KEY);
    return sanitizeDeviceComputeSettings(raw ? JSON.parse(raw) : {});
  } catch {
    return createDefaultDeviceComputeSettings();
  }
}

export default function ThermalProtectionControl({ compact = false } = {}) {
  const [ready, setReady] = useState(false);
  const [enabled, setEnabled] = useState(true);

  useEffect(() => {
    const settings = readSettings();
    setEnabled(settings.preventOverheatingEnabled !== false);
    setReady(true);
  }, []);

  function toggle() {
    const current = readSettings();
    const next = sanitizeDeviceComputeSettings({
      ...current,
      preventOverheatingEnabled: !enabled,
    });
    try { localStorage.setItem(DEVICE_COMPUTE_STORAGE_KEY, JSON.stringify(next)); } catch {}
    setEnabled(next.preventOverheatingEnabled);
    window.dispatchEvent(new CustomEvent(DEVICE_COMPUTE_EVENT, {
      detail: { source: "settings-ui", settings: next },
    }));
  }

  if (!ready) return null;

  return <section className={compact ? "thermal compact" : "thermal"}>
    <div>
      <small>DEVICE PROTECTION</small>
      <b>Prevent Overheating</b>
      <span>{enabled
        ? "ON · LANERIQ shortens high-energy image/video bursts and starts cooling earlier when heat rises."
        : "Standard Thermal Guardian remains active for serious or critical heat, but early cooling is less aggressive."}</span>
    </div>
    <button type="button" className={enabled ? "switch on" : "switch"} aria-pressed={enabled} aria-label="Prevent overheating" onClick={toggle}>
      <i />
      <strong>{enabled ? "ON" : "OFF"}</strong>
    </button>
    <style jsx>{`
      .thermal{display:flex;align-items:center;justify-content:space-between;gap:18px;padding:18px;border:1px solid rgba(216,191,98,.28);border-radius:18px;background:linear-gradient(135deg,rgba(12,48,37,.88),rgba(5,23,18,.92));box-shadow:0 18px 50px rgba(0,0,0,.2)}
      .thermal>div{min-width:0}.thermal small,.thermal b,.thermal span{display:block}.thermal small{color:#d8bf62;font-size:9px;letter-spacing:.14em;font-weight:950}.thermal b{margin-top:5px;color:#f6e7a6;font-size:15px}.thermal span{margin-top:5px;max-width:650px;color:#9eb0a8;font-size:10px;line-height:1.5}
      .switch{flex:0 0 auto;display:flex;align-items:center;gap:7px;min-width:78px;min-height:44px;padding:5px 9px;border:1px solid rgba(255,255,255,.12);border-radius:999px;background:#192b25;color:#a9b9b2;font-weight:950;cursor:pointer}.switch i{width:28px;height:28px;border-radius:50%;background:#84968e;transition:.2s}.switch.on{border-color:#e8cf6b66;background:#b79035;color:#07130e}.switch.on i{background:#f5e59f;transform:translateX(2px)}.switch strong{font-size:10px}
      .compact{padding:14px}.compact span{max-width:520px}@media(max-width:620px){.thermal{align-items:flex-start}.thermal span{font-size:10px}.switch{min-width:72px}}
    `}</style>
  </section>;
}
