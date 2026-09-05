import Link from "next/link";
import RuntimeV6Canvas from "../game-world-v6/RuntimeV6Canvas.js";
import DeviceEvidenceV7Panel from "./DeviceEvidenceV7Panel.js";
import styles from "../game-world-v6/runtime-v6.module.css";
import {compileRealRuntimeV7,summarizeRealRuntimeV7} from "../../lib/game/game-world-real-runtime-v7.js";
import {GAME_WORLD_WASM_RUNTIME_V7} from "../../lib/game/game-world-wasm-runtime-v7.js";

export const dynamic="force-dynamic";

export default async function GameWorldV7Page({searchParams}){
  const params=await searchParams;
  const prompt=String(params?.prompt||"Playable mobile river kingdom with citadel villages bridges dungeon bosses companions and changing routes");
  const profile=String(params?.profile||"mobile-balanced");
  const seed=String(params?.seed||"laneriq-wasm-device-v7");
  const result=compileRealRuntimeV7({prompt,seed,runtimeProfile:profile,deviceClass:profile==="mobile-safe"?"low":profile==="mobile-performance"?"high":"balanced",hypothesisCount:3,simulationBudget:24});
  const summary=summarizeRealRuntimeV7(result);
  const clientRuntime={worldId:result.worldId,terrain:result.terrain,spawn:result.spawn,adaptive:result.adaptive,requestedProfile:profile,navPathPoints:result.v6.v5.path?.length||0,physicsBodies:result.physics.dynamic.length};
  return <main className={styles.shell}>
    <header className={styles.top}><Link href="/game-builder">← Game Builder</Link><div><Link href="/game-world-v6">V6 Runtime</Link><span>LANERIQ AI · WORLD V7</span></div></header>
    <section className={styles.hero}><div><small>WASM PHYSICS / NAV + REAL DEVICE EVIDENCE</small><h1>AI MAP now separates <em>external engine proof from physical-device proof.</em></h1><p>V7 keeps the executable LANERIQ fallback, verifies pinned Rapier/Recast WASM independently, and adds consent-first foreground mobile evidence with a native-attestation gate.</p></div><aside><b>{summary.v7Internal100?"100/100":`${result.readiness.internalScore}/100`}</b><span>V7 INTERNAL CONTRACT</span><strong>Production 100: false</strong></aside></section>
    <form method="get" className={styles.form}><label>World prompt<textarea name="prompt" defaultValue={prompt}/></label><div><label>Seed<input name="seed" defaultValue={seed}/></label><label>Runtime profile<select name="profile" defaultValue={profile}><option value="mobile-safe">Mobile Safe · 30fps</option><option value="mobile-balanced">Mobile Balanced · 45fps</option><option value="mobile-performance">Mobile Performance · 60fps</option><option value="desktop-balanced">Desktop Balanced · 60fps</option></select></label><button>Compile V7 & Run</button></div></form>
    <section className={styles.stage}><RuntimeV6Canvas runtime={clientRuntime}/></section>
    <section className={styles.metrics}><article><span>RAPIER PIN</span><b>{GAME_WORLD_WASM_RUNTIME_V7.rapier.version}</b></article><article><span>RECAST PIN</span><b>{GAME_WORLD_WASM_RUNTIME_V7.recast.version}</b></article><article><span>TARGET FPS</span><b>{summary.targetFps}</b></article><article><span>PHYSICS BODIES</span><b>{result.physics.dynamic.length}</b></article><article><span>NAV POLYGONS</span><b>{result.nav.polygons.length}</b></article><article><span>NATIVE ATTESTATION</span><b>GATED</b></article></section>
    <section className={styles.grid}>
      <article className={styles.panel}><small>PINNED EXTERNAL WASM</small><h2>Rapier and Recast are executable verification targets, not marketing labels.</h2><div className={styles.list}><div><span>Rapier package</span><b>{GAME_WORLD_WASM_RUNTIME_V7.rapier.package}</b></div><div><span>Rapier expected version</span><b>{result.wasm.rapier.expectedVersion}</b></div><div><span>Recast package</span><b>{GAME_WORLD_WASM_RUNTIME_V7.recast.package}</b></div><div><span>Recast expected version</span><b>{result.wasm.recast.expectedVersion}</b></div><div><span>Runtime auto-enable</span><b>false</b></div></div><p>Dedicated CI installs the exact packages, initializes their WASM, runs rigid-body physics and generates/queries a NavMesh. Product runtime does not silently switch engines without a release gate.</p></article>
      <DeviceEvidenceV7Panel route="/game-world-v7"/>
    </section>
    <section className={styles.grid}>
      <article className={styles.panel}><small>NATIVE DEVICE ATTESTATION CONTRACT</small><h2>Browser measurements can prove foreground execution, not hardware identity.</h2><div className={styles.list}><div><span>iOS native bridge required</span><b>true</b></div><div><span>Android native bridge required</span><b>true</b></div><div><span>Signed nonce required</span><b>true</b></div><div><span>Raw device ID allowed</span><b>false</b></div><div><span>Advertising ID allowed</span><b>false</b></div><div><span>Precise location allowed</span><b>false</b></div></div></article>
      <article className={styles.panel}><small>TRUTH BOUNDARY</small><h2>V7 internal code can be 100 while device and Production truth remain external.</h2><div className={styles.list}><div><span>V6 internal 100</span><b>{String(result.readiness.v6Internal100)}</b></div><div><span>V7 internal 100</span><b>{String(result.readiness.internal100)}</b></div><div><span>Rapier WASM CI verified</span><b>{String(result.truth.externalRapierWasmCiVerified)}</b></div><div><span>Recast WASM CI verified</span><b>{String(result.truth.externalRecastWasmCiVerified)}</b></div><div><span>Real iOS device verified</span><b>{String(result.truth.realIosDeviceVerified)}</b></div><div><span>Real Android device verified</span><b>{String(result.truth.realAndroidDeviceVerified)}</b></div><div><span>Measured device temperature</span><b>false</b></div><div><span>Production deployment</span><b>{String(result.truth.productionDeploymentVerified)}</b></div></div></article>
    </section>
  </main>;
}
