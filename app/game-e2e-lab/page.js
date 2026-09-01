import Link from "next/link";
import {runRealGameE2ESuite} from "../../lib/game/real-game-e2e-v1.js";

const styles={
  shell:{minHeight:"100vh",background:"#020706",color:"#eef9f4",fontFamily:"Inter,system-ui",padding:"24px 18px 90px"},
  wrap:{width:"min(1180px,100%)",margin:"0 auto"},
  top:{display:"flex",justifyContent:"space-between",gap:16,alignItems:"center",fontSize:11,fontWeight:900,letterSpacing:".08em"},
  link:{color:"#fff",textDecoration:"none"},
  hero:{padding:"60px 0 28px"},
  eyebrow:{color:"#e2c566",fontSize:11,fontWeight:950,letterSpacing:".12em"},
  title:{fontSize:"clamp(46px,8vw,92px)",lineHeight:.92,letterSpacing:"-.055em",margin:"10px 0"},
  sub:{maxWidth:900,color:"#9fb2a8",lineHeight:1.7,fontSize:14},
  validation:{display:"inline-flex",alignItems:"center",gap:8,marginTop:14,padding:"9px 12px",borderRadius:999,border:"1px solid #e2c56655",background:"#e2c56612",color:"#f4dd8d",fontSize:10,fontWeight:950,letterSpacing:".08em"},
  score:{display:"flex",alignItems:"end",gap:12,marginTop:22},
  scoreN:{fontSize:48,color:"#e2c566",fontWeight:950},
  scoreT:{fontSize:11,color:"#8fa59a",paddingBottom:8},
  grid:{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(260px,1fr))",gap:10},
  card:{background:"#081812",border:"1px solid #ffffff14",borderRadius:22,padding:18,boxShadow:"0 18px 60px #0008"},
  status:{fontSize:10,fontWeight:950,color:"#b7e89d",letterSpacing:".08em"},
  name:{fontSize:22,margin:"8px 0"},
  idea:{fontSize:11,lineHeight:1.55,color:"#9aafa4",minHeight:54},
  route:{fontSize:11,color:"#e2c566",fontWeight:900},
  play:{fontSize:11,lineHeight:1.55,color:"#c7d5ce"},
  box:{marginTop:16,padding:18,border:"1px solid #ffffff14",borderRadius:20,background:"#07130f"},
  small:{fontSize:11,color:"#92a79d",lineHeight:1.6},
};

export default function GameE2ELab(){
  const suite=runRealGameE2ESuite();
  return <main style={styles.shell}><div style={styles.wrap}>
    <header style={styles.top}><Link href="/game-builder" style={styles.link}>← GAME BUILDER</Link><span>SOOLENAI · REAL GAME E2E LAB</span></header>
    <section style={styles.hero}><div style={styles.eyebrow}>END-TO-END · ZERO-COST CI</div><h1 style={styles.title}>Real games.<br/>Real runtime paths.</h1><p style={styles.sub}>Natural-language game ideas are classified by SoolenAI, converted into deterministic mobile-game specifications, routed through the same Preview runtime resolver used by generated projects, and driven through actual runtime state machines. Paid AI providers and production services are deliberately excluded from this CI gate.</p><div style={styles.validation}>REAL USER VALIDATION · PREVIEW → GENERATE → SAVE → PLAY → IPHONE</div><div style={styles.score}><b style={styles.scoreN}>{suite.score}/100</b><span style={styles.scoreT}>{suite.passed}/{suite.total} real-game scenarios passed</span></div></section>
    <section style={styles.grid}>{suite.results.map(item=><article key={item.id} style={styles.card}><div style={styles.status}>{item.passed?"PASS":"FAIL"} · {item.expectedArchetype.toUpperCase()}</div><h2 style={styles.name}>{item.name}</h2><p style={styles.idea}>{item.idea}</p><p style={styles.route}>{item.planner.archetype} → {item.route.runtimeId}</p><p style={styles.play}>{item.play.detail}</p><div style={styles.small}>Platforms: {item.specification.platforms.join(" / ")} · Provider mode: {item.specification.providerMode} · Production evidence claimed: {String(item.productionEvidenceClaimed)}</div></article>)}</section>
    <section style={styles.box}><b style={{color:"#e2c566"}}>Truth boundary</b><p style={styles.small}>{suite.truthRule}</p><p style={styles.small}>Current internal E2E is passed. The next evidence layer is deliberately external: use the latest Preview, generate one game through an actually connected AI provider, persist the generated project, open its real /a/[id] runtime, then validate the interaction on an iPhone. No production claim is made until those external steps are evidenced.</p></section>
  </div></main>;
}
