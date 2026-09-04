import Link from "next/link";
import styles from "./world-v3.module.css";
import {compileSpatialHybridGameWorldV3,summarizeSpatialHybridGameWorldV3} from "../../lib/game/game-world-spatial-hybrid-v3.js";

export const dynamic="force-dynamic";

export default async function GameWorldV3Page({searchParams}){
  const params=await searchParams;
  const prompt=String(params?.prompt||"Living fantasy open world with castle villages quests treasure dungeon bosses dynamic weather and NPC companions for mobile");
  const eventType=String(params?.event||"route-blocked");
  const result=compileSpatialHybridGameWorldV3({prompt,seed:String(params?.seed||"laneriq-spatial-v3"),hypothesisCount:3,simulationBudget:32,deviceClass:String(params?.device||"balanced"),counterfactualEvent:{type:eventType,anchorId:""}});
  const summary=summarizeSpatialHybridGameWorldV3(result);
  return <main className={styles.shell}>
    <header className={styles.top}><Link href="/game-builder">← Game Builder</Link><div><Link href="/game-world-v2">V2 World Model</Link><span>LANERIQ AI · SPATIAL V3</span></div></header>
    <section className={styles.hero}>
      <div><small>SPATIAL INTELLIGENCE + HYBRID 3D</small><h1>Worlds that <em>understand space & consequences.</em></h1><p>Scene Graph + Physical Cascade + Mesh/Splat Hybrid + Portable Scene Stage + NPC/Motion Intelligence. Gameplay truth remains deterministic mesh/nav/physics while visual neural layers stay optional.</p></div>
      <aside><b>{summary.v3Internal100?"100/100":`${result.readiness.internalScore}/100`}</b><span>V3 INTERNAL CONTRACT</span><strong>Production 100: {String(result.readiness.production100)}</strong></aside>
    </section>
    <form className={styles.form} method="get"><label>World intent<textarea name="prompt" defaultValue={prompt}/></label><div><label>Seed<input name="seed" defaultValue={String(params?.seed||"laneriq-spatial-v3")}/></label><label>Device<select name="device" defaultValue={String(params?.device||"balanced")}><option value="low">Low</option><option value="balanced">Balanced</option><option value="high">High</option></select></label><label>Counterfactual<select name="event" defaultValue={eventType}><option value="route-blocked">Route blocked</option><option value="bridge-destroyed">Bridge destroyed</option><option value="flood">Flood</option><option value="storm">Storm</option><option value="resource-depleted">Resource depleted</option><option value="landmark-disabled">Landmark disabled</option><option value="boss-escalation">Boss escalation</option></select></label><button>Simulate V3</button></div></form>
    <section className={styles.metrics}>
      <article><span>SPATIAL NODES</span><b>{summary.spatialNodes}</b></article><article><span>RELATIONS</span><b>{summary.spatialRelations}</b></article><article><span>PHYSICAL RISK</span><b>{summary.physicalRisk}</b></article><article><span>HYBRID CHUNKS</span><b>{summary.hybridChunks}</b></article><article><span>PORTABLE PRIMS</span><b>{summary.portablePrims}</b></article><article><span>NPC ARCHETYPES</span><b>{summary.npcArchetypes}</b></article>
    </section>
    <section className={styles.grid}>
      <article className={styles.panel}><small>SPATIAL SCENE GRAPH</small><h2>Objects know where they are and what they connect to.</h2><div className={styles.pills}>{result.spatial.nodes.slice(0,18).map(node=><span key={node.id}>{node.type} · {node.name}</span>)}</div><p className={styles.muted}>{result.spatial.nodes.length} nodes · {result.spatial.relations.length} relations · {Object.keys(result.spatial.spatialIndex).length} spatial cells</p></article>
      <article className={styles.panel}><small>PHYSICAL / CAUSAL CASCADE</small><h2>{result.physical.event.type} → risk {result.physical.riskScore}/100</h2><div className={styles.actions}>{result.physical.responsePlan.map((action,index)=><div key={`${action.action}-${index}`}><b>{index+1}</b><span>{action.action}</span></div>)}</div><p className={styles.muted}>Bounded propagation: {String(result.physical.assumptions.boundedPropagation)} · Production auto-write: {String(result.physical.evidence.productionAutoWrite)}</p></article>
    </section>
    <section className={styles.grid}>
      <article className={styles.panel}><small>HYBRID 3D</small><h2>Mesh for truth. Splat for appearance.</h2><div className={styles.cards}>{result.hybrid.layers.map(layer=><div key={layer.id}><b>{layer.id}</b><span>{layer.role}</span><small>{layer.required?"required":"optional"}</small></div>)}</div><p className={styles.muted}>Physics depends on splat: {String(!result.hybrid.renderingPolicy.physicsNeverDependsOnSplat)} · Nav depends on splat: {String(!result.hybrid.renderingPolicy.navNeverDependsOnSplat)} · Real-device splat evidence: {String(result.hybrid.evidence.realDeviceSplatPerformanceVerified)}</p></article>
      <article className={styles.panel}><small>PORTABLE SCENE STAGE</small><h2>One canonical scene, many adapter targets.</h2><div className={styles.list}>{Object.entries(result.portableScene.adapters).map(([key,value])=><div key={key}><span>{key.toUpperCase()}</span><b>{value.status} / verified {String(value.verified)}</b></div>)}</div><p className={styles.muted}>OpenUSD compliance verified: {String(result.portableScene.evidence.openUsdComplianceVerified)} · Real engine import verified: {String(result.portableScene.evidence.realEngineImportVerified)}</p></article>
    </section>
    <section className={styles.grid}>
      <article className={styles.panel}><small>NPC + MOTION INTELLIGENCE</small><h2>Spatially aware, world-reactive NPC contracts.</h2><div className={styles.cards}>{result.npcMotion.archetypes.map(npc=><div key={npc.id}><b>{npc.role}</b><span>{npc.homeRegion}</span><small>{npc.goals.join(" · ")}</small></div>)}</div><p className={styles.muted}>Runtime: {result.npcMotion.runtimeContract.preferred} → {result.npcMotion.runtimeContract.fallback} · Live NPC model: {String(result.npcMotion.evidence.liveNpcModelVerified)} · Live motion model: {String(result.npcMotion.evidence.liveMotionModelVerified)}</p></article>
      <article className={styles.panel}><small>TRUTH BOUNDARY</small><h2>Internal capability ≠ LIVE provider/device evidence.</h2><div className={styles.list}><div><span>Spatial world-model provider</span><b>{String(result.truth.liveSpatialWorldModelProviderVerified)}</b></div><div><span>Live 3DGS provider</span><b>{String(result.truth.live3dgsProviderVerified)}</b></div><div><span>OpenUSD compliance</span><b>{String(result.truth.realOpenUsdComplianceVerified)}</b></div><div><span>Engine import</span><b>{String(result.truth.realEngineImportVerified)}</b></div><div><span>Hybrid 3D real device</span><b>{String(result.truth.realDeviceHybrid3dPerformanceVerified)}</b></div><div><span>Production deployment</span><b>{String(result.truth.productionDeploymentVerified)}</b></div></div></article>
    </section>
  </main>;
}
