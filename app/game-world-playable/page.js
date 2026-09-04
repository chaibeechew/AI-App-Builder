import Link from "next/link";
import PlayableWorldCanvas from "./PlayableWorldCanvas.js";
import styles from "./playable.module.css";
import {applyLocalRegenerationPatchV5,compilePlayableWorldRuntimeV5,createLocalRegenerationPatchV5} from "../../lib/game/game-world-playable-runtime-v5.js";

export const dynamic="force-dynamic";

export default async function PlayableWorldPage({searchParams}){
  const params=await searchParams;
  const prompt=String(params?.prompt||"Playable dark fantasy river kingdom with a citadel, villages, dungeon, bridges, quests, bosses and companion NPCs");
  const deviceClass=String(params?.device||"balanced");
  const runtime=compilePlayableWorldRuntimeV5({prompt,seed:String(params?.seed||"laneriq-playable-v5"),deviceClass,hypothesisCount:3,simulationBudget:24});
  const patch=createLocalRegenerationPatchV5(runtime,{chunkId:runtime.terrain.chunks[0]?.id,operation:String(params?.edit||"raise-terrain"),strength:Number(params?.strength||1)});
  const patched=applyLocalRegenerationPatchV5(runtime,patch);
  const clientRuntime={terrain:patched.terrain,poi:patched.poi,spawn:patched.spawn};
  return <main className={styles.shell}>
    <header className={styles.top}><Link href="/game-builder">← Game Builder</Link><div><Link href="/game-world-v4">V4 Neural World</Link><span>LANERIQ AI · PLAYABLE WORLD V5</span></div></header>
    <section className={styles.hero}><div><small>PROMPT → PLAYABLE WORLD</small><h1>AI MAP now enters a <em>real browser GPU runtime.</em></h1><p>Runtime-compiled shaders, 3D terrain triangles, camera controls, chunk residency, executable nav grid, bounded physics bridge and local world regeneration.</p></div><aside><b>{runtime.readiness.v5Internal100?"100/100":`${runtime.readiness.internalScore}/100`}</b><span>V5 INTERNAL CONTRACT</span><strong>Production 100: false</strong></aside></section>
    <form method="get" className={styles.form}><label>World prompt<textarea name="prompt" defaultValue={prompt}/></label><div><label>Seed<input name="seed" defaultValue={String(params?.seed||"laneriq-playable-v5")}/></label><label>Device<select name="device" defaultValue={deviceClass}><option value="low">Low</option><option value="balanced">Balanced</option><option value="high">High</option></select></label><label>Local edit<select name="edit" defaultValue={String(params?.edit||"raise-terrain")}><option value="raise-terrain">Raise terrain</option><option value="lower-terrain">Lower terrain</option><option value="restore-snapshot">Restore snapshot</option></select></label><button>Compile & Play</button></div></form>
    <section className={styles.stage}><PlayableWorldCanvas runtime={clientRuntime}/></section>
    <section className={styles.metrics}><article><span>GPU TERRAIN CHUNKS</span><b>{runtime.terrain.chunks.length}</b></article><article><span>NAV CELLS</span><b>{runtime.nav.cells.length}</b></article><article><span>PATH NODES</span><b>{runtime.path.length}</b></article><article><span>PHYSICS BODIES</span><b>{runtime.physics.bodies.length}</b></article><article><span>POI / REGIONS</span><b>{runtime.poi.length}</b></article><article><span>LOCAL PATCHES</span><b>{patched.patchHistory.length}</b></article></section>
    <section className={styles.grid}>
      <article className={styles.panel}><small>REAL BROWSER RENDERER</small><h2>Runtime GPU work, not a renderer schema.</h2><div className={styles.list}><div><span>Preferred API</span><b>WebGL2</b></div><div><span>Fallback</span><b>WebGL1</b></div><div><span>Shaders</span><b>{runtime.renderer.shaderPipeline}</b></div><div><span>Draw mode</span><b>{runtime.renderer.terrainDrawMode}</b></div></div><p>Browser runtime creates a graphics context, compiles shaders, uploads triangle buffers and draws the world continuously. Device FPS remains runtime evidence, not build evidence.</p></article>
      <article className={styles.panel}><small>CHUNK STREAMING</small><h2>World geometry has residency limits.</h2><div className={styles.list}><div><span>Chunk size</span><b>{runtime.terrain.profile.chunkMeters}m</b></div><div><span>Max resident</span><b>{runtime.terrain.streaming.maxResidentChunks}</b></div><div><span>Eviction</span><b>{runtime.terrain.streaming.eviction}</b></div><div><span>Prefetch ring</span><b>{runtime.terrain.streaming.prefetchRing}</b></div></div></article>
    </section>
    <section className={styles.grid}>
      <article className={styles.panel}><small>EXECUTABLE NAV</small><h2>Deterministic A* pathfinding is running on the generated world.</h2><div className={styles.list}><div><span>Algorithm</span><b>{runtime.nav.algorithm}</b></div><div><span>Cell size</span><b>{runtime.nav.cellMeters}m</b></div><div><span>Dynamic obstacle overlay</span><b>{String(runtime.nav.dynamicObstacleOverlay)}</b></div><div><span>Real engine NavMesh</span><b>{String(runtime.nav.evidence.realEngineNavMeshVerified)}</b></div></div></article>
      <article className={styles.panel}><small>PHYSICS RUNTIME BRIDGE</small><h2>Fixed-step bodies can execute before a third-party engine is selected.</h2><div className={styles.list}><div><span>Fixed step</span><b>{runtime.physics.fixedStep.toFixed(5)}s</b></div><div><span>Gravity</span><b>{runtime.physics.gravity}</b></div><div><span>Runtime executable</span><b>{String(runtime.physics.evidence.runtimeBridgeExecutable)}</b></div><div><span>3rd-party engine verified</span><b>{String(runtime.physics.evidence.thirdPartyPhysicsVerified)}</b></div></div></article>
    </section>
    <section className={styles.grid}>
      <article className={styles.panel}><small>LOCAL REGENERATION</small><h2>Edit one chunk without rebuilding the entire AI MAP.</h2><div className={styles.list}><div><span>Patch</span><b>{patch.patchId}</b></div><div><span>Target</span><b>{patch.targetChunkId}</b></div><div><span>Operation</span><b>{patch.operation}</b></div><div><span>Full-world regeneration</span><b>{String(patch.requiresFullWorldRegeneration)}</b></div><div><span>Undo</span><b>{String(patch.undo.supported)}</b></div></div></article>
      <article className={styles.panel}><small>TRUTH BOUNDARY</small><h2>The new renderer is implemented; LIVE hardware evidence is still separate.</h2><div className={styles.list}><div><span>Browser renderer code</span><b>{String(runtime.truth.browserRendererCodeImplemented)}</b></div><div><span>WebGL context runtime verified by CI</span><b>{String(runtime.truth.webglContextRuntimeVerified)}</b></div><div><span>Real device FPS</span><b>{String(runtime.truth.realDeviceFpsVerified)}</b></div><div><span>Real device thermal</span><b>{String(runtime.truth.realDeviceThermalVerified)}</b></div><div><span>Production deployment</span><b>{String(runtime.truth.productionDeploymentVerified)}</b></div></div></article>
    </section>
  </main>;
}
