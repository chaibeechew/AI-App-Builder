"use client";

import { useState } from "react";
import { SHARE_MODES, REPORT_TYPES, createSOS, createIncidentReport } from "../lib/safety-system";

export default function SafetyPage() {
  const [shareMode, setShareMode] = useState(SHARE_MODES.TRUSTED_CONTACTS);
  const [message, setMessage] = useState("");
  const [sos, setSos] = useState(null);
  const [reportType, setReportType] = useState("traffic_accident");

  const getLocation = () => new Promise((resolve) => {
    if (!navigator.geolocation) return resolve(null);
    navigator.geolocation.getCurrentPosition(
      p => resolve({ lat: p.coords.latitude, lng: p.coords.longitude }),
      () => resolve(null),
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 30000 }
    );
  });

  const triggerSOS = async () => {
    const location = await getLocation();
    const event = createSOS({ playerId: "current-player", location, shareMode });
    setSos(event);
    setMessage(location ? "SOS prepared with your latest location." : "SOS prepared without GPS. Contact emergency services if you are in immediate danger.");
  };

  const report = async () => {
    const location = await getLocation();
    createIncidentReport({ playerId: "current-player", type: reportType, location });
    setMessage("Report submitted for verification. Rewards are only issued after validation.");
  };

  return <main style={{minHeight:"100vh",background:"#07151d",color:"white",padding:24,fontFamily:"system-ui"}}>
    <div style={{maxWidth:760,margin:"0 auto"}}>
      <h1>🆘 Earth Safety</h1>
      <p style={{opacity:.7}}>Privacy first. You control who can see your location.</p>

      <section style={{padding:20,borderRadius:18,background:"rgba(255,255,255,.06)",marginTop:18}}>
        <h2>SOS Mode</h2>
        <select value={shareMode} onChange={e=>setShareMode(e.target.value)} style={{padding:12,borderRadius:10,width:"100%"}}>
          <option value={SHARE_MODES.TRUSTED_CONTACTS}>Trusted contacts</option>
          <option value={SHARE_MODES.FRIENDS}>Game friends</option>
          <option value={SHARE_MODES.NEARBY_PLAYERS}>Nearby players</option>
          <option value={SHARE_MODES.PUBLIC}>Public</option>
          <option value={SHARE_MODES.PRIVATE}>Private / no location sharing</option>
        </select>
        <button onClick={triggerSOS} style={{marginTop:14,padding:"14px 22px",border:0,borderRadius:12,fontWeight:700}}>Send SOS</button>
        {sos && <pre style={{whiteSpace:"pre-wrap",opacity:.7,marginTop:12}}>{JSON.stringify(sos,null,2)}</pre>}
      </section>

      <section style={{padding:20,borderRadius:18,background:"rgba(255,255,255,.06)",marginTop:18}}>
        <h2>Community Safety Report</h2>
        <select value={reportType} onChange={e=>setReportType(e.target.value)} style={{padding:12,borderRadius:10,width:"100%"}}>
          {REPORT_TYPES.map(type=><option key={type} value={type}>{type.replaceAll("_"," ")}</option>)}
        </select>
        <button onClick={report} style={{marginTop:14,padding:"12px 18px",border:0,borderRadius:12}}>Report with GPS</button>
        <p style={{fontSize:13,opacity:.6}}>Do not approach danger to collect points. Reports are verified before any reward.</p>
      </section>
      {message && <div style={{marginTop:18,padding:16,borderRadius:14,background:"rgba(255,255,255,.08)"}}>{message}</div>}
    </div>
  </main>;
}
