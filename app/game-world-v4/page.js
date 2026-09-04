import Link from "next/link";
import styles from "./world-v4.module.css";
import {compileNeuralReconstructionEmbodiedV4,summarizeNeuralReconstructionEmbodiedV4} from "../../lib/game/game-world-neural-reconstruction-embodied-v4.js";

export const dynamic="force-dynamic";

export default async function GameWorldV4Page({searchParams}){
  const params=await searchParams;
  const prompt=String(params?.prompt||"Reconstructable living fortress city with villages dungeon waterways bridges quests treasure bosses companions and dynamic weather for mobile");
  const result=compileNeuralReconstructionEmbodiedV4({prompt,seed:String(params?.seed||"laneriq-neural-v4"),hypothesisCount:3,simulationBudget:32,deviceClass:String(params?.device||"balanced"),counterfactualEvent:{type:String(params?.event||"bridge-destroyed")}});
  const summary=summarizeNeuralReconstructionEmbodiedV4(result);
  return <main className={styles.shell}>
    <header className={styles.top}><Link href="/game-builder">← Game Builder</Link><div><Link href="/game-world-v3">V3 Spatial</Link><span>LANERIQ AI · WORLD V4</span></div></header>
    <section className={styles.hero}>
      <div><small>NEURAL RECONSTRUCTION + EMBODIED SIMULATION</small><h1>From observed space to an <em>editable living world.</em></h1><p>Multi-view reconstruction contracts, neural scene layers, bounded physics, embodied NPC agents and digital-twin calibration — while gameplay truth stays on editable mesh/nav/physics.</p></div>
      <aside><b>{summary.v4Internal100?"100/100":`${result.readiness.internalScore}/100`}</b><span>V4 INTERNAL CONTRACT</span><strong>Production 100: {String(result.readiness.production100)}</strong></aside>
    </section>
    <form className={styles.form} method="get"><label>World intent<textarea name="prompt" defaultValue={prompt}/></label><div><label>Seed<input name="seed" defaultValue={String(params?.seed||"laneriq-neural-v4")}/></label><label>Device<select name="device" defaultValue={String(params?.device||"balanced")}><option value="low">Low</option><option value="balanced">Balanced</option><option value="high">High</option></select></label><label>Physics event<select name="event" defaultValue={String(params?.event||"bridge-destroyed")}><option value="bridge-destroyed">Bridge destroyed</option><option value="flood">Flood</option><option value="storm">Storm</option><option value="terrain-collapse">Terrain collapse</option></select></label><button>Compile V4</button></div></form>
    <section className={styles.metrics}>
      <article><span>CAPTURE FRAMES</span><b>{summary.captureFrames}</b></article><article><span>NEURAL CHUNKS</span><b>{summary.neuralChunks}</b></article><article><span>PHYSICS BODIES</span><b>{summary.physicsBodies}</b></article><article><span>EMBODIED NPCS</span><b>{summary.embodiedAgents}</b></article><article><span>SOCIAL LINKS</span><b>{summary.socialRelations}</b></article><article><span>TWIN ANCHORS</span><b>{summary.calibrationAnchors}</b></article>
    </section>
    <section className={styles.grid}>
      <article className={styles.panel}><small>REAL-WORLD RECONSTRUCTION CONTRACT</small><h2>Observed inputs become camera, depth and geometry plans.</h2><div className={styles.list}><div><span>Mode</span><b>{result.reconstruction.mode}</b></div><div><span>Frames</span><b>{result.reconstruction.frames.length}</b></div><div><span>Real capture used</span><b>{String(result.reconstruction.evidence.realCaptureUsed)}</b></div><div><span>Measured quality</span><b>{String(result.reconstructionQuality.measured)}</b></div></div><p className={styles.muted}>Privacy defaults: metadata scrubbed · face identity extraction false · geolocation inference false.</p></article>
      <article className={styles.panel}><small>NEURAL SCENE</small><h2>Semantic mesh first, neural appearance optional.</h2><div className={styles.pills}>{result.neuralScene.layers.map(layer=><span key={layer.id}>{layer.id} · {layer.required?"required":"optional"}</span>)}</div><p className={styles.muted}>Physics depends on neural appearance: {String(!result.neuralScene.policy.physicsNeverDependsOnNeuralAppearance)} · Real-device neural performance: {String(result.neuralScene.evidence.realDevicePerformanceVerified)}</p></article>
    </section>
    <section className={styles.grid}>
      <article className={styles.panel}><small>ADVANCED PHYSICS</small><h2>Fixed-step state, constraints and rollback-ready snapshots.</h2><div className={styles.list}><div><span>Fixed step</span><b>{result.physics.fixedStepSeconds.toFixed(5)}s</b></div><div><span>Bodies</span><b>{result.physics.bodies.length}</b></div><div><span>Substeps</span><b>{result.physics.stepPolicy.substeps}</b></div><div><span>Network determinism verified</span><b>{String(result.physics.evidence.networkDeterminismVerified)}</b></div></div></article>
      <article className={styles.panel}><small>EMBODIED NPC</small><h2>Observe → ground → remember → act → verify.</h2><div className={styles.cards}>{result.embodied.agents.slice(0,6).map(agent=><div key={agent.id}><b>{agent.role}</b><span>{agent.homeRegion}</span><small>{agent.goals.slice(0,3).join(" · ")}</small></div>)}</div><p className={styles.muted}>Runtime: {result.embodied.runtime.preferred} → {result.embodied.runtime.fallback} · Hidden reasoning stored: {String(result.embodied.evidence.privateChainOfThoughtStored)}</p></article>
    </section>
    <section className={styles.grid}>
      <article className={styles.panel}><small>DIGITAL-TWIN CALIBRATION</small><h2>Coordinate alignment and change detection stay evidence-gated.</h2><div className={styles.list}><div><span>Anchors</span><b>{result.digitalTwin.anchors.length}</b></div><div><span>Measured anchors</span><b>{result.digitalTwin.evidence.measuredAnchorCount}</b></div><div><span>Real-world scale verified</span><b>{String(result.digitalTwin.evidence.realWorldScaleVerified)}</b></div><div><span>Live change detection</span><b>{String(result.digitalTwin.evidence.liveChangeDetectionVerified)}</b></div></div></article>
      <article className={styles.panel}><small>TRUTH BOUNDARY</small><h2>CODE readiness stays separate from real-world evidence.</h2><div className={styles.list}><div><span>Live reconstruction provider</span><b>{String(result.truth.liveReconstructionProviderVerified)}</b></div><div><span>Live neural scene provider</span><b>{String(result.truth.liveNeuralSceneProviderVerified)}</b></div><div><span>Real-world accuracy</span><b>{String(result.truth.realWorldAccuracyVerified)}</b></div><div><span>Live physics engine</span><b>{String(result.truth.livePhysicsEngineVerified)}</b></div><div><span>Live embodied NPC model</span><b>{String(result.truth.liveEmbodiedNpcModelVerified)}</b></div><div><span>Production deployment</span><b>{String(result.truth.productionDeploymentVerified)}</b></div></div></article>
    </section>
  </main>;
}
