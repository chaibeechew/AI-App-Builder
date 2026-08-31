import Link from "next/link";

const base={textDecoration:"none",border:"1px solid #fff3",borderRadius:999,padding:"12px 16px",fontSize:11,fontWeight:950,letterSpacing:".04em",boxShadow:"0 12px 40px #0008",whiteSpace:"nowrap"};

export default function GameBuilderLayout({children}){
  return <>{children}<div style={{position:"fixed",right:18,bottom:"calc(18px + env(safe-area-inset-bottom))",zIndex:80,display:"grid",gap:8,justifyItems:"end"}}>
    <Link href="/game-content-lab" aria-label="Open Game Content Production Lab" style={{...base,background:"#21352a",color:"#f3db89"}}>Game Content Lab →</Link>
    <Link href="/game-engine-lab" aria-label="Open AAA Mobile Game Lab" style={{...base,background:"#173227",color:"#f1d477"}}>AAA Mobile Lab →</Link>
    <Link href="/game-3d-lab" aria-label="Open Advanced 3D Game Lab" style={{...base,background:"#0a2119",color:"#e2c566"}}>Advanced 3D Lab →</Link>
    <Link href="/game-platform-lab" aria-label="Open Game Platform Lab" style={{...base,background:"#e2c566",color:"#07110d"}}>Game Platform Lab →</Link>
  </div></>;
}
