"use client";

import { useEffect, useRef, useState } from "react";

export default function EarthAdventurePage() {
  const canvasRef = useRef(null);
  const [view, setView] = useState("3D");
  const [location, setLocation] = useState(null);
  const [status, setStatus] = useState("Ready to explore");

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    let frame;
    let rotation = 0;

    const draw = () => {
      const dpr = window.devicePixelRatio || 1;
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);

      const cx = w / 2;
      const cy = h / 2;
      const r = Math.min(w, h) * 0.36;
      const gradient = ctx.createRadialGradient(cx - r * .35, cy - r * .35, r * .1, cx, cy, r);
      gradient.addColorStop(0, "#78d6ff");
      gradient.addColorStop(0.55, "#1685b7");
      gradient.addColorStop(1, "#07344f");
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fillStyle = gradient;
      ctx.fill();

      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.clip();
      ctx.strokeStyle = "rgba(255,255,255,.16)";
      ctx.lineWidth = 1;
      for (let i = -3; i <= 3; i++) {
        const y = cy + i * r / 4;
        ctx.beginPath(); ctx.ellipse(cx, y, r * Math.sqrt(Math.max(.05, 1 - (i/4)**2)), r * .14, 0, 0, Math.PI * 2); ctx.stroke();
      }
      for (let i = -3; i <= 3; i++) {
        const x = cx + i * r / 4;
        ctx.beginPath(); ctx.ellipse(x, cy, r * .14, r * Math.sqrt(Math.max(.05, 1 - (i/4)**2)), 0, 0, Math.PI * 2); ctx.stroke();
      }
      ctx.fillStyle = "rgba(84,190,112,.65)";
      for (let i = 0; i < 13; i++) {
        const a = rotation + i * 2.1;
        const x = cx + Math.cos(a) * r * (.25 + (i % 4) * .13);
        const y = cy + Math.sin(a * 1.31) * r * .62;
        ctx.beginPath(); ctx.ellipse(x, y, r * .11, r * .055, a, 0, Math.PI * 2); ctx.fill();
      }
      ctx.restore();

      ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.strokeStyle = "rgba(255,255,255,.3)"; ctx.lineWidth = 2; ctx.stroke();
      rotation += view === "3D" ? 0.0018 : 0;
      frame = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(frame);
  }, [view]);

  const locate = () => {
    if (!navigator.geolocation) return setStatus("GPS is not available on this device");
    setStatus("Finding your location…");
    navigator.geolocation.getCurrentPosition(
      p => { setLocation({ lat: p.coords.latitude, lng: p.coords.longitude }); setStatus("Location found — ready to explore"); },
      () => setStatus("Location permission was not granted"),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  return (
    <main style={{minHeight:"100vh",background:"radial-gradient(circle at 50% 20%,#123a55,#06131d 65%)",color:"white",padding:"24px",fontFamily:"system-ui"}}>
      <div style={{maxWidth:1100,margin:"0 auto"}}>
        <header style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:16,flexWrap:"wrap"}}>
          <div><div style={{fontSize:13,opacity:.65,letterSpacing:2}}>EARTH ADVENTURE</div><h1 style={{margin:"6px 0",fontSize:32}}>🌍 Explore Your World</h1><div style={{opacity:.7}}>Every player unlocks a different Earth.</div></div>
          <div style={{display:"flex",gap:8}}>{["3D","2D"].map(v=><button key={v} onClick={()=>setView(v)} style={{padding:"10px 18px",borderRadius:12,border:"1px solid rgba(255,255,255,.2)",background:view===v?"rgba(72,184,235,.25)":"rgba(255,255,255,.06)",color:"white"}}>{v} Map</button>)}</div>
        </header>
        <section style={{marginTop:22,background:"rgba(255,255,255,.06)",border:"1px solid rgba(255,255,255,.1)",borderRadius:24,padding:16}}>
          <canvas ref={canvasRef} style={{width:"100%",height:520,display:"block",borderRadius:18}} aria-label="Interactive 3D Earth" />
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:12,flexWrap:"wrap",marginTop:14}}>
            <div><strong>{status}</strong>{location&&<div style={{fontSize:12,opacity:.65,marginTop:4}}>GPS: {location.lat.toFixed(5)}, {location.lng.toFixed(5)}</div>}</div>
            <button onClick={locate} style={{padding:"12px 18px",border:0,borderRadius:12,background:"white",color:"#062333",fontWeight:700}}>📍 Find My Location</button>
          </div>
        </section>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))",gap:12,marginTop:16}}>
          {["🔓 Unexplored","📸 History Unlock","🪙 Explorer Coins","🌌 Sky Explorer"].map(x=><div key={x} style={{padding:18,borderRadius:16,background:"rgba(255,255,255,.05)",border:"1px solid rgba(255,255,255,.08)"}}>{x}<div style={{fontSize:12,opacity:.55,marginTop:6}}>Coming into the Earth Adventure system</div></div>)}
        </div>
      </div>
    </main>
  );
}
