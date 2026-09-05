import RuntimeV6Canvas from "../../game-world-v6/RuntimeV6Canvas.js";
import {compileRealRuntimeV6} from "../../../lib/game/game-world-real-runtime-v6.js";

export const dynamic="force-dynamic";
export const metadata={title:"LANERIQ Game World V6 Runtime Evidence Probe",robots:{index:false,follow:false,nocache:true}};

export default function GameWorldV6EvidenceProbe(){
  const result=compileRealRuntimeV6({
    prompt:"Synthetic CI evidence world with terrain, roads, citadel, bridges and bounded NPC routes",
    seed:"laneriq-v6-public-evidence-probe",
    deviceClass:"low",
    runtimeProfile:"mobile-safe",
    hypothesisCount:2,
    simulationBudget:12
  });
  const runtime={worldId:result.worldId,terrain:result.terrain,spawn:result.spawn,adaptive:result.adaptive,requestedProfile:"mobile-safe",navPathPoints:result.v5.path?.length||0,physicsBodies:result.physics.dynamic.length};
  return <main id="laneriq-main-content" style={{minHeight:"100vh",margin:0,padding:12,background:"#03080b",color:"white"}} data-testid="v6-evidence-probe">
    <h1 style={{position:"absolute",width:1,height:1,overflow:"hidden",clip:"rect(0 0 0 0)"}}>LANERIQ Game World V6 Runtime Evidence Probe</h1>
    <RuntimeV6Canvas runtime={runtime}/>
  </main>;
}
