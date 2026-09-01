"use client";

export default function GlobalError({ reset }) {
  return <html lang="en"><body style={{margin:0,background:"#03100d",color:"#f5fff9",fontFamily:"Inter,system-ui,-apple-system,sans-serif"}}><main role="alert" style={{minHeight:"100dvh",display:"grid",placeItems:"center",padding:24,textAlign:"center"}}><div style={{maxWidth:620,padding:32,border:"1px solid rgba(216,191,98,.35)",borderRadius:24,background:"#071b15"}}><small style={{color:"#d8bf62",fontWeight:900,letterSpacing:2}}>LANERIQ AI · RECOVERY MODE</small><h1 style={{fontSize:"clamp(36px,7vw,64px)",margin:"14px 0"}}>The workspace could not start</h1><p style={{color:"#a9bbb4",lineHeight:1.6}}>Nothing was published or deleted. Retry the secure workspace initialization.</p><button type="button" onClick={() => reset()} style={{minHeight:44,border:0,borderRadius:12,padding:"12px 18px",background:"#d8bf62",color:"#07130e",fontWeight:900}}>Restart Workspace</button></div></main></body></html>;
}
