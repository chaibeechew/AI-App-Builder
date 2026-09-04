import Link from "next/link";
import styles from "./page.module.css";
import {GAME_WORLD_GENERATOR_V1,GAME_WORLD_TEMPLATES,compileGameWorldProject,summarizeWorldProject} from "../../lib/game/game-world-generator-v1.js";

export const metadata={title:"Game World Generator · LANERIQ AI",description:"AI MAP, world blueprint, dungeon, treasure, boss and runtime planning over LANERIQ AI's existing game technology stack."};

const DEFAULT_PROMPT="Epic dark fantasy open world with a central castle, three villages, snow mountains, a multi-floor dungeon, 30 treasure chests, 4 bosses and quest lines.";
const CAPABILITIES=[
  ["AI MAP","Deterministic regions, routes, biome zones and points of interest"],
  ["3D World Contract","Safe scriptless Scene Document for renderer/runtime handoff"],
  ["Castle + Dungeon","Landmarks plus seeded, connectivity-checked dungeon generation"],
  ["Treasure + Loot","Seeded loot tables, treasure locations and rarity-ready rewards"],
  ["Boss + Quest","Progression-aware boss placement, quest points and level bands"],
  ["World Streaming","Chunk/content planning reusing the existing large-world pipeline"],
  ["Existing Game Runtime","Compiles the world into Game Runtime V1 instead of duplicating gameplay systems"],
  ["Truth Gate","Renderer/exporter/device claims remain evidence-gated until measured"]
];
function num(value,fallback,min,max){const n=Number(value);return Number.isFinite(n)?Math.max(min,Math.min(max,Math.round(n))):fallback;}
function short(value,max=72){const s=String(value??"");return s.length>max?`${s.slice(0,max-1)}…`:s;}

export default async function GameWorldPage({searchParams}){
  const params=await searchParams;
  const prompt=String(params?.q||DEFAULT_PROMPT).slice(0,3000),templateId=String(params?.template||""),seed=String(params?.seed||"laneriq-world-demo").slice(0,120);
  const levelCount=num(params?.levels,18,1,100),treasureCount=num(params?.treasures,30,0,500),bossCount=num(params?.bosses,4,0,32);
  const project=compileGameWorldProject({prompt,templateId,levelCount,treasureCount,bossCount,seed}),summary=summarizeWorldProject(project),blueprint=project.blueprint;
  const width=760,height=470,cx=width/2,cy=height/2,maxWorld=Math.max(1,blueprint.worldSizeMeters*.55),point=position=>({x:cx+(position.x/maxWorld)*(width*.42),y:cy+(position.z/maxWorld)*(height*.42)}),regionById=new Map(blueprint.regions.map(region=>[region.id,region]));

  return <main className={styles.shell}>
    <div className={styles.ambient}/>
    <header className={styles.top}><Link href="/game-builder">← GAME BUILDER</Link><span>LANERIQ AI GAME WORLD GENERATOR · V1</span></header>
    <section className={styles.hero}>
      <div><small>INTENT → WORLD BLUEPRINT → AI MAP → PLAYABLE RUNTIME</small><h1>Build the world,<br/><em>not just the picture.</em></h1><p>Game World Generator is now a world-authoring layer over LANERIQ AI&apos;s existing Game Runtime, Advanced 3D Gameplay and Content Production Pipeline. One world document can feed map, dungeon, treasure, boss, quest, streaming and playable-runtime systems without creating another incompatible engine.</p></div>
      <aside><b>TECHNOLOGY TRANSFER</b>{GAME_WORLD_GENERATOR_V1.technologyTransfer.map(item=><span key={item}>✓ {item}</span>)}<i>Provider-neutral · deterministic · evidence-gated</i></aside>
    </section>

    <section className={styles.composer}>
      <div className={styles.composeHead}><div><small>WORLD PROMPT BUILDER</small><h2>Generate a structured world contract</h2></div><strong>{project.validation.valid?"WORLD CONTRACT VALID":"NEEDS REPAIR"}</strong></div>
      <form method="GET"><textarea name="q" defaultValue={prompt} aria-label="Describe the game world" maxLength={3000}/><div className={styles.controls}>
        <label>Template<select name="template" defaultValue={blueprint.generation.templateId}>{GAME_WORLD_TEMPLATES.map(item=><option value={item.id} key={item.id}>{item.name}</option>)}</select></label>
        <label>Levels<input name="levels" type="number" min="1" max="100" defaultValue={levelCount}/></label><label>Treasure<input name="treasures" type="number" min="0" max="500" defaultValue={treasureCount}/></label><label>Bosses<input name="bosses" type="number" min="0" max="32" defaultValue={bossCount}/></label><label>Seed<input name="seed" defaultValue={seed} maxLength={120}/></label>
      </div><button>Regenerate World Blueprint →</button></form>
    </section>

    <section className={styles.summaryGrid}>{[["REGIONS",summary.regions],["ROUTES",summary.routes],["POI",summary.pointsOfInterest],["LEVELS",summary.levels],["DUNGEONS",summary.dungeons],["BOSSES",summary.bosses],["TREASURE",summary.treasures],["SCENE ENTITIES",summary.sceneEntities]].map(([label,value])=><article key={label}><span>{label}</span><b>{value}</b></article>)}</section>

    <section className={styles.workspace}>
      <div className={styles.mapCard}><div className={styles.sectionHead}><div><small>AI MAP</small><h2>{short(blueprint.title,54)}</h2></div><span>{blueprint.scale.toUpperCase()} · {blueprint.worldSizeMeters}m</span></div>
        <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Generated world map"><defs><radialGradient id="land"><stop offset="0%" stopColor="#d9c56e" stopOpacity=".18"/><stop offset="100%" stopColor="#071611" stopOpacity="0"/></radialGradient></defs><rect width={width} height={height} rx="28" fill="#03100c"/><circle cx={cx} cy={cy} r="210" fill="url(#land)"/>
          {blueprint.routes.map(route=>{const a=regionById.get(route.from),b=regionById.get(route.to);if(!a||!b)return null;const p1=point(a.center),p2=point(b.center);return <line key={route.id} x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} stroke={route.type==="main"?"#d9c56e":"#617a6e"} strokeOpacity={route.type==="hidden"?.35:.7} strokeDasharray={route.type==="hidden"?"5 8":"0"} strokeWidth={route.type==="main"?3:1.4}/>})}
          {blueprint.regions.map((region,index)=>{const p=point(region.center),rr=Math.max(18,Math.min(46,(region.radius/blueprint.worldSizeMeters)*180));return <g key={region.id}><circle cx={p.x} cy={p.y} r={rr+9} fill="#d9c56e" opacity=".05"/><circle cx={p.x} cy={p.y} r={rr} fill={index===0?"#d9c56e":"#17372b"} stroke="#f6e6a3" strokeOpacity=".45"/><text x={p.x} y={p.y-3} textAnchor="middle" fill={index===0?"#06110d":"#f1f6f3"} fontSize="11" fontWeight="900">{short(region.name,20)}</text><text x={p.x} y={p.y+12} textAnchor="middle" fill={index===0?"#183128":"#91a69c"} fontSize="8">LV {region.levelBand.min}–{region.levelBand.max}</text></g>})}
          {blueprint.pointsOfInterest.filter(item=>["castle","dungeon","boss","settlement"].includes(item.type)).map(item=>{const p=point(item.position),symbol=item.type==="castle"?"♜":item.type==="dungeon"?"◆":item.type==="boss"?"✦":"●";return <g key={item.id}><circle cx={p.x} cy={p.y} r="10" fill="#020906" stroke="#e6cf75"/><text x={p.x} y={p.y+4} textAnchor="middle" fill="#e6cf75" fontSize="10">{symbol}</text></g>})}
        </svg><div className={styles.legend}><span>● Region</span><span>♜ Castle</span><span>◆ Dungeon</span><span>✦ Boss</span><span>— Route</span></div>
      </div>
      <aside className={styles.blueprintCard}><small>WORLD BLUEPRINT</small><h2>{blueprint.genre} · {blueprint.mood}</h2><div className={styles.regionList}>{blueprint.regions.map(region=><div key={region.id}><b>{region.name}</b><span>{region.biome} · danger {region.danger}/10</span><i>{region.landmark}</i></div>)}</div></aside>
    </section>

    <section className={styles.systems}><div className={styles.sectionHead}><div><small>TRANSFERRED SYSTEMS</small><h2>One world layer, existing proven foundations</h2></div><span>{summary.playableRuntime?"PLAYABLE RUNTIME BRIDGE ✓":"RUNTIME BRIDGE PENDING"}</span></div><div className={styles.capGrid}>{CAPABILITIES.map(([name,note],index)=><article key={name}><span>{String(index+1).padStart(2,"0")}</span><b>{name}</b><p>{note}</p></article>)}</div></section>
    <section className={styles.runtime}><div><small>RUNTIME HANDOFF</small><h2>World → Existing Game Runtime</h2><p>The generated project compiles into the existing mobile-game runtime with {project.runtime.systems.length} runtime systems and targets {project.runtime.platforms.join(" · ")}.</p></div><div className={styles.pills}>{["Dungeon Generation","Loot Tables","Day / Night / Weather","Scene Validation","Large-world Streaming","Save / Recovery","Collision / Physics","Mobile Lifecycle"].map(item=><span key={item}>{item}</span>)}</div><Link href="/game-builder">Continue to Playable Game Builder →</Link></section>
    <section className={styles.truth}><b>Production truth boundary</b><p>This batch proves the internal deterministic World Blueprint, AI MAP data, safe Scene Document and Existing Game Runtime bridge. It does <strong>not</strong> claim final 3D renderer fidelity, Unity/Unreal/Godot export, real GPU/thermal performance, live multiplayer infrastructure or App Store / Google Play evidence. Those remain independent production gates.</p></section>
  </main>;
}
