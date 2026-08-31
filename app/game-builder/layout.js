import Link from "next/link";

export default function GameBuilderLayout({children}){
  return <>{children}<Link href="/game-platform-lab" aria-label="Open Game Platform Lab" style={{position:"fixed",right:18,bottom:"calc(18px + env(safe-area-inset-bottom))",zIndex:80,textDecoration:"none",background:"#e2c566",color:"#07110d",border:"1px solid #fff3",borderRadius:999,padding:"12px 16px",fontSize:11,fontWeight:950,letterSpacing:".04em",boxShadow:"0 12px 40px #0008"}}>Game Platform Lab →</Link></>;
}
