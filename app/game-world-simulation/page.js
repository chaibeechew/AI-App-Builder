import Link from "next/link";
import {buildWorldBlueprint} from "../../lib/game/game-world-generator-v1.js";
import {runWorldSimulationIntelligence,auditSimulationIntelligence,TRANSFERRED_REASONING_PATTERNS} from "../../lib/game/game-world-simulation-intelligence-v1.js";
import styles from "./simulation.module.css";

export const metadata={title:"Game World Simulation Intelligence · LANERIQ AI",description:"Deterministic scenario search, counterfactual stress testing, constraint solving and repair planning for generated game worlds."};

const DEFAULT_PROMPT="Epic open world RPG with a central castle, dungeons, quests, 30 treasure chests and 4 bosses.";
function n(v,fallback,min,max){const x=Number(v);return Number.isFinite(x)?Math.max(min,Math.min(max,Math.round(x))):fallback;}
function fmt(v){return new Intl.NumberFormat("en-US").format(Number(v)||0);}

export default async function GameWorldSimulationPage({searchParams}){
  const p=await searchParams;
  const prompt=String(p?.q||DEFAULT_PROMPT).slice(0,3000);
  const seed=String(p?.seed||"laneriq-sim-lab").slice(0,120);
  const levels=n(p?.levels,24,1,100),treasures=n(p?.treasures,30,0,500),bosses=n(p?.bosses,4,0,32),budget=n(p?.budget,256,32,2048);
  const world=buildWorldBlueprint({prompt,seed:`${seed}:world`,levelCount:levels,treasureCount:treasures,bossCount:bosses});
  const simulation=runWorldSimulationIntelligence(world,{seed:`${seed}:simulation`,budget});
  const audit=auditSimulationIntelligence(simulation);
  const risks=Object.entries(simulation.riskHistogram).sort((a,b)=>b[1]-a[1]).slice(0,10);

  return <main className={styles.shell}>
    <header className={styles.top}><Link href="/game-world">← GAME WORLD</Link><span>SIMULATION INTELLIGENCE V1</span></header>
    <section className={styles.hero}>
      <div><small>SCENARIO SEARCH → COUNTERFACTUAL → STRESS → REPAIR</small><h1>World Intelligence<br/><em>that can test itself.</em></h1><p>The engine does not claim to copy hidden model reasoning. It transfers reusable reasoning methods into deterministic software contracts that can be replayed, tested and audited.</p></div>
      <aside><b>{audit.score}/100 INTERNAL CONTRACT</b><span>{simulation.scenarioSpace.scientific} formal combinations</span><span>{fmt(simulation.executed.total)} scenarios evaluated this run</span><span>Production 100: intentionally gated</span></aside>
    </section>

    <section className={styles.panel}>
      <div className={styles.head}><div><small>SIMULATION INPUT</small><h2>Test a generated world</h2></div><strong>{simulation.constraints.valid?"CONSTRAINTS VALID":"CONSTRAINT REPAIR REQUIRED"}</strong></div>
      <form method="GET" className={styles.form}>
        <textarea name="q" defaultValue={prompt} maxLength={3000}/>
        <div className={styles.controls}>
          <label>Levels<input name="levels" type="number" min="1" max="100" defaultValue={levels}/></label>
          <label>Treasure<input name="treasures" type="number" min="0" max="500" defaultValue={treasures}/></label>
          <label>Bosses<input name="bosses" type="number" min="0" max="32" defaultValue={bosses}/></label>
          <label>Executed budget<select name="budget" defaultValue={budget}><option value="256">256 quick</option><option value="512">512</option><option value="1024">1,024</option><option value="2048">2,048 standard UI max</option></select></label>
          <label>Seed<input name="seed" defaultValue={seed}/></label>
        </div>
        <button>Run deterministic simulation →</button>
      </form>
    </section>

    <section className={styles.metrics}>
      {[["FORMAL SPACE",simulation.scenarioSpace.scientific],["BASE",fmt(simulation.executed.base)],["COUNTERFACTUAL",fmt(simulation.executed.counterfactual)],["ADVERSARIAL",fmt(simulation.executed.adversarial)],["AVG SCORE",simulation.scores.average],["WORST",simulation.scores.worst],["BEST",simulation.scores.best],["CRITICAL",fmt(simulation.criticalCount)]].map(([k,v])=><article key={k}><span>{k}</span><b>{v}</b></article>)}
    </section>

    <section className={styles.grid}>
      <article className={styles.panel}><small>TRANSFERRED REASONING PATTERNS</small><h2>{TRANSFERRED_REASONING_PATTERNS.length} auditable methods</h2><div className={styles.pills}>{TRANSFERRED_REASONING_PATTERNS.map(x=><span key={x}>{x}</span>)}</div></article>
      <article className={styles.panel}><small>TOP RISK SIGNALS</small><h2>Stress findings</h2><div className={styles.list}>{risks.length?risks.map(([risk,count])=><div key={risk}><b>{risk}</b><span>{count} hits</span></div>):<p>No risk signals in this bounded run.</p>}</div></article>
    </section>

    <section className={styles.panel}>
      <div className={styles.head}><div><small>AUTO-REPAIR PLANNER</small><h2>Candidate repairs, never silent Production writes</h2></div><strong>REVIEW REQUIRED</strong></div>
      <div className={styles.repairs}>{simulation.repair.actions.length?simulation.repair.actions.map(x=><article key={x.id}><span>{x.weight}</span><div><b>{x.action}</b><p>{x.note}</p><i>{x.risk}</i></div></article>):<p>No repairs were required by the sampled scenarios.</p>}</div>
    </section>

    <section className={styles.truth}><b>Truth boundary</b><p><strong>{simulation.scenarioSpace.exact}</strong> is the formal combinatorial search space, not the number physically executed in this request. This run executed {simulation.executed.total} deterministic representative, counterfactual and adversarial evaluations. Deep engine mode supports a bounded 10,000 base scenarios per run. Renderer quality, real devices, live economy and live multiplayer remain separate Production evidence.</p></section>
  </main>;
}
