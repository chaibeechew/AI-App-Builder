import RuntimeV6Canvas from "../../game-world-v6/RuntimeV6Canvas.js";
import DeviceEvidenceV7Panel from "../../game-world-v7/DeviceEvidenceV7Panel.js";
import styles from "../../game-world-v6/runtime-v6.module.css";
import {compileRealRuntimeV7} from "../../../lib/game/game-world-real-runtime-v7.js";

export const dynamic="force-dynamic";
export const metadata={title:"LANERIQ Game World V7 Device Evidence Probe",robots:{index:false,follow:false}};

export default function GameWorldV7DeviceEvidenceProbe(){
  const result=compileRealRuntimeV7({prompt:"Synthetic LANERIQ device evidence world with hills bridges and safe bounded runtime",seed:"laneriq-v7-device-evidence-fixed",runtimeProfile:"mobile-safe",deviceClass:"low",hypothesisCount:2,simulationBudget:16});
  const runtime={worldId:result.worldId,terrain:result.terrain,spawn:result.spawn,adaptive:result.adaptive,requestedProfile:"mobile-safe",navPathPoints:result.v6.v5.path?.length||0,physicsBodies:result.physics.dynamic.length};
  return <main className={styles.shell} data-testid="v7-device-evidence-probe">
    <section className={styles.hero}><div><small>PUBLIC SYNTHETIC · NOINDEX · NO CUSTOMER WORLD DATA</small><h1>V7 foreground <em>device evidence probe.</em></h1><p>This fixed synthetic world exists only to measure the browser runtime on a device the user explicitly chooses to test. Evidence stays local until the user copies the sanitized result.</p></div><aside><b>V7</b><span>DEVICE EVIDENCE</span><strong>Native attestation: gated</strong></aside></section>
    <section className={styles.stage}><RuntimeV6Canvas runtime={runtime}/></section>
    <section className={styles.grid}><DeviceEvidenceV7Panel route="/landing/game-world-v7-device-evidence"/><article className={styles.panel}><small>WHAT THIS CAN PROVE</small><h2>Foreground browser execution is measurable; hardware identity is not inferred.</h2><div className={styles.list}><div><span>WebGL execution</span><b>measurable</b></div><div><span>Foreground FPS</span><b>measurable</b></div><div><span>Thermal pressure</span><b>proxy only</b></div><div><span>Temperature sensor</span><b>not used</b></div><div><span>iOS / Android hardware</span><b>native bridge required</b></div><div><span>Production runtime</span><b>false</b></div></div></article></section>
  </main>;
}
