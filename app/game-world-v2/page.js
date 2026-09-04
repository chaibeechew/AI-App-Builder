import Link from "next/link";
import styles from "./world-v2.module.css";
import {compileLatestGameWorldV2,summarizeLatestGameWorldV2} from "../../lib/game/game-world-latest-tech-transfer-v2.js";

export const dynamic="force-dynamic";

export default async function GameWorldV2Page({searchParams}){
  const params=await searchParams;
  const prompt=String(params?.prompt||"Evolving fantasy open world with castle, villages, quests, treasure, dungeon, bosses and dynamic weather for mobile");
  const result=compileLatestGameWorldV2({prompt,seed:String(params?.seed||"laneriq-world-v2"),hypothesisCount:3,simulationBudget:32,deviceClass:String(params?.device||"balanced")});
  const summary=summarizeLatestGameWorldV2(result);
  const branch=result.memory.branches[result.memory.activeBranch];
  return <main className={styles.shell}>
    <header className={styles.top}><Link href="/game-builder">← Game Builder</Link><span>LANERIQ AI · WORLD MODEL V2</span></header>
    <section className={styles.hero}>
      <div><small>LATEST TECHNOLOGY TRANSFER</small><h1>Worlds that <em>remember, evolve & repair.</em></h1><p>Persistent World Model + event memory + autonomous world agent + nondestructive PCG + WebGPU-first runtime planning. LANERIQ-native implementation; proprietary weights/code are not copied.</p></div>
      <aside><b>{summary.internalScore}/100</b><span>INTERNAL V2 CONTRACT</span><strong>Production 100: {String(summary.production100)}</strong></aside>
    </section>
    <form className={styles.form} method="get"><label>World intent<textarea name="prompt" defaultValue={prompt}/></label><div><label>Seed<input name="seed" defaultValue={String(params?.seed||"laneriq-world-v2")}/></label><label>Device<select name="device" defaultValue={String(params?.device||"balanced")}><option value="low">Low</option><option value="balanced">Balanced</option><option value="high">High</option></select></label><button>Regenerate V2</button></div></form>
    <section className={styles.metrics}>
      <article><span>WORLD EVENTS</span><b>{summary.worldEvents}</b></article><article><span>MEMORY EVENTS</span><b>{summary.memoryEvents}</b></article><article><span>PCG NODES</span><b>{summary.pcgNodes}</b></article><article><span>PCG OPS</span><b>{summary.pcgOperations}</b></article><article><span>CHUNKS</span><b>{summary.chunkCount}</b></article><article><span>AGENT ACTIONS</span><b>{summary.agentActions}</b></article><article><span>RUNTIME</span><b>{summary.runtime}</b></article><article><span>HYPOTHESES</span><b>{result.reasoningEvidence.hypothesisCount}</b></article>
    </section>
    <section className={styles.grid}>
      <article className={styles.panel}><small>PERSISTENT WORLD MODEL</small><h2>Current world state</h2><div className={styles.list}><div><span>Tick</span><b>{result.worldModel.state.tick}</b></div><div><span>Weather</span><b>{result.worldModel.state.weather}</b></div><div><span>Regions</span><b>{Object.keys(result.worldModel.state.regions).length}</b></div><div><span>Snapshots</span><b>{result.worldModel.snapshots.length}</b></div><div><span>Memory branch</span><b>{result.memory.activeBranch}</b></div><div><span>Branch snapshots</span><b>{branch.snapshots.length}</b></div></div></article>
      <article className={styles.panel}><small>AUTONOMOUS AGENT</small><h2>Observe → Plan → Act → Verify</h2><div className={styles.actions}>{result.agent.plan.actions.length?result.agent.plan.actions.map((action,index)=><div key={`${action.type}-${index}`}><b>{index+1}</b><span>{action.type}</span></div>):<p>No repair action required.</p>}</div><p className={styles.muted}>Production auto-write: <strong>{String(result.agent.evidence.productionAutoWrite)}</strong> · Hidden reasoning stored: <strong>{String(result.agent.evidence.hiddenReasoningStored)}</strong></p></article>
    </section>
    <section className={styles.grid}>
      <article className={styles.panel}><small>NONDESTRUCTIVE PCG</small><h2>Procedural World Graph</h2><div className={styles.pills}>{result.pcg.graph.nodes.slice(0,18).map(node=><span key={node.id}>{node.type}</span>)}</div><p className={styles.muted}>{result.pcg.graph.nodes.length} nodes · {result.pcg.compiled.operations.length} compiled ops · {result.pcg.graph.overrides.length} art-direction override · {result.pcg.chunks.chunkCount} streaming chunks</p></article>
      <article className={styles.panel}><small>WEBGPU-FIRST RUNTIME</small><h2>{result.runtime.target.fps} FPS target / {result.runtime.target.frameBudgetMs} ms budget</h2><div className={styles.list}><div><span>Preferred</span><b>{result.runtime.renderer.preferred}</b></div><div><span>Fallback</span><b>{result.runtime.renderer.fallbacks.join(" → ")}</b></div><div><span>Transform capacity</span><b>{result.runtime.gpuData.transformCapacity}</b></div><div><span>Visible chunks</span><b>{result.runtime.streaming.maxVisibleChunks}</b></div></div></article>
    </section>
    <section className={styles.panel}><small>ENGINE / PROVIDER BOUNDARY</small><h2>Adapters ready, external evidence stays separate</h2><div className={styles.cards}>{Object.entries(result.adapters.engines).filter(([key])=>key!=="truth").map(([key,value])=><div key={key}><b>{key.toUpperCase()}</b><span>{value.target}</span><small>{value.status}</small></div>)}</div><p className={styles.muted}>Real WebGPU device verified: {String(result.truth.realWebGpuDeviceVerified)} · Real engine import verified: {String(result.truth.realEngineImportVerified)} · Live generative world provider verified: {String(result.truth.liveGenerativeWorldProviderVerified)}</p></section>
  </main>;
}
