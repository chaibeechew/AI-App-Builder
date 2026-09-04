import Link from "next/link";
import {
  GAME_WORLD_GENERATOR_V1,
  GAME_WORLD_TEMPLATES,
  compileGameWorldProject,
  summarizeWorldProject
} from "../../lib/game/game-world-generator-v1.js";

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
  const prompt=String(params?.q||DEFAULT_PROMPT).slice(0,3000);
  const templateId=String(params?.template||"");
  const levelCount=num(params?.levels,18,1,100);
  const treasureCount=num(params?.treasures,30,0,500);
  const bossCount=num(params?.bosses,4,0,32);
  const seed=String(params?.seed||"laneriq-world-demo").slice(0,120);
  const project=compileGameWorldProject({prompt,templateId,levelCount,treasureCount,bossCount,seed});
  const summary=summarizeWorldProject(project);
  const blueprint=project.blueprint;
  const width=760,height=470,cx=width/2,cy=height/2,maxWorld=Math.max(1,blueprint.worldSizeMeters*.55);
  const point=(position)=>({x:cx+(position.x/maxWorld)*(width*.42),y:cy+(position.z/maxWorld)*(height*.42)});
  const regionById=new Map(blueprint.regions.map(region=>[region.id,region]));

  return <main className="shell">
    <div className="ambient"/>
    <header className="top"><Link href="/game-builder">← GAME BUILDER</Link><span>LANERIQ AI GAME WORLD GENERATOR · V1</span></header>

    <section className="hero">
      <div><small>INTENT → WORLD BLUEPRINT → AI MAP → PLAYABLE RUNTIME</small><h1>Build the world,<br/><em>not just the picture.</em></h1><p>Game World Generator is now a world-authoring layer over LANERIQ AI&apos;s existing Game Runtime, Advanced 3D Gameplay and Content Production Pipeline. One world document can feed map, dungeon, treasure, boss, quest, streaming and playable-runtime systems without creating another incompatible engine.</p></div>
      <aside><b>TECHNOLOGY TRANSFER</b>{GAME_WORLD_GENERATOR_V1.technologyTransfer.map(item=><span key={item}>✓ {item}</span>)}<i>Provider-neutral · deterministic · evidence-gated</i></aside>
    </section>

    <section className="composer">
      <div className="composeHead"><div><small>WORLD PROMPT BUILDER</small><h2>Generate a structured world contract</h2></div><strong>{project.validation.valid?"WORLD CONTRACT VALID":"NEEDS REPAIR"}</strong></div>
      <form method="GET">
        <textarea name="q" defaultValue={prompt} aria-label="Describe the game world" maxLength={3000}/>
        <div className="controls">
          <label>Template<select name="template" defaultValue={blueprint.generation.templateId}>{GAME_WORLD_TEMPLATES.map(item=><option value={item.id} key={item.id}>{item.name}</option>)}</select></label>
          <label>Levels<input name="levels" type="number" min="1" max="100" defaultValue={levelCount}/></label>
          <label>Treasure<input name="treasures" type="number" min="0" max="500" defaultValue={treasureCount}/></label>
          <label>Bosses<input name="bosses" type="number" min="0" max="32" defaultValue={bossCount}/></label>
          <label>Seed<input name="seed" defaultValue={seed} maxLength={120}/></label>
        </div>
        <button>Regenerate World Blueprint →</button>
      </form>
    </section>

    <section className="summaryGrid">
      {[["REGIONS",summary.regions],["ROUTES",summary.routes],["POI",summary.pointsOfInterest],["LEVELS",summary.levels],["DUNGEONS",summary.dungeons],["BOSSES",summary.bosses],["TREASURE",summary.treasures],["SCENE ENTITIES",summary.sceneEntities]].map(([label,value])=><article key={label}><span>{label}</span><b>{value}</b></article>)}
    </section>

    <section className="workspace">
      <div className="mapCard">
        <div className="sectionHead"><div><small>AI MAP</small><h2>{short(blueprint.title,54)}</h2></div><span>{blueprint.scale.toUpperCase()} · {blueprint.worldSizeMeters}m</span></div>
        <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Generated world map">
          <defs><radialGradient id="land"><stop offset="0%" stopColor="#d9c56e" stopOpacity=".18"/><stop offset="100%" stopColor="#071611" stopOpacity="0"/></radialGradient></defs>
          <rect width={width} height={height} rx="28" fill="#03100c"/>
          <circle cx={cx} cy={cy} r="210" fill="url(#land)"/>
          {blueprint.routes.map(route=>{const a=regionById.get(route.from),b=regionById.get(route.to);if(!a||!b)return null;const p1=point(a.center),p2=point(b.center);return <line key={route.id} x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} stroke={route.type==="main"?"#d9c56e":"#617a6e"} strokeOpacity={route.type==="hidden"?.35:.7} strokeDasharray={route.type==="hidden"?"5 8":"0"} strokeWidth={route.type==="main"?3:1.4}/>})}
          {blueprint.regions.map((region,index)=>{const p=point(region.center);const rr=Math.max(18,Math.min(46,(region.radius/blueprint.worldSizeMeters)*180));return <g key={region.id}><circle cx={p.x} cy={p.y} r={rr+9} fill="#d9c56e" opacity=".05"/><circle cx={p.x} cy={p.y} r={rr} fill={index===0?"#d9c56e":"#17372b"} stroke="#f6e6a3" strokeOpacity=".45"/><text x={p.x} y={p.y-3} textAnchor="middle" fill={index===0?"#06110d":"#f1f6f3"} fontSize="11" fontWeight="900">{short(region.name,20)}</text><text x={p.x} y={p.y+12} textAnchor="middle" fill={index===0?"#183128":"#91a69c"} fontSize="8">LV {region.levelBand.min}–{region.levelBand.max}</text></g>})}
          {blueprint.pointsOfInterest.filter(item=>["castle","dungeon","boss","settlement"].includes(item.type)).map(item=>{const p=point(item.position),symbol=item.type==="castle"?"♜":item.type==="dungeon"?"◆":item.type==="boss"?"✦":"●";return <g key={item.id}><circle cx={p.x} cy={p.y} r="10" fill="#020906" stroke="#e6cf75"/><text x={p.x} y={p.y+4} textAnchor="middle" fill="#e6cf75" fontSize="10">{symbol}</text></g>})}
        </svg>
        <div className="legend"><span>● Region</span><span>♜ Castle</span><span>◆ Dungeon</span><span>✦ Boss</span><span>— Route</span></div>
      </div>

      <aside className="blueprintCard">
        <small>WORLD BLUEPRINT</small><h2>{blueprint.genre} · {blueprint.mood}</h2>
        <div className="regionList">{blueprint.regions.map(region=><div key={region.id}><b>{region.name}</b><span>{region.biome} · danger {region.danger}/10</span><i>{region.landmark}</i></div>)}</div>
      </aside>
    </section>

    <section className="systems">
      <div className="sectionHead"><div><small>TRANSFERRED SYSTEMS</small><h2>One world layer, existing proven foundations</h2></div><span>{summary.playableRuntime?"PLAYABLE RUNTIME BRIDGE ✓":"RUNTIME BRIDGE PENDING"}</span></div>
      <div className="capGrid">{CAPABILITIES.map(([name,note],index)=><article key={name}><span>{String(index+1).padStart(2,"0")}</span><b>{name}</b><p>{note}</p></article>)}</div>
    </section>

    <section className="runtime">
      <div><small>RUNTIME HANDOFF</small><h2>World → Existing Game Runtime</h2><p>The generated project compiles into the existing mobile-game runtime with {project.runtime.systems.length} runtime systems and targets {project.runtime.platforms.join(" · ")}.</p></div>
      <div className="pills">{["Dungeon Generation","Loot Tables","Day / Night / Weather","Scene Validation","Large-world Streaming","Save / Recovery","Collision / Physics","Mobile Lifecycle"].map(item=><span key={item}>{item}</span>)}</div>
      <Link href="/game-builder">Continue to Playable Game Builder →</Link>
    </section>

    <section className="truth"><b>Production truth boundary</b><p>This batch proves the internal deterministic World Blueprint, AI MAP data, safe Scene Document and Existing Game Runtime bridge. It does <strong>not</strong> claim final 3D renderer fidelity, Unity/Unreal/Godot export, real GPU/thermal performance, live multiplayer infrastructure or App Store / Google Play evidence. Those remain independent production gates.</p></section>

    <style jsx>{`
      .shell{min-height:100vh;background:#020806;color:#f2f8f5;font-family:Inter,system-ui,-apple-system,sans-serif;padding-bottom:80px}.ambient{position:fixed;inset:0;pointer-events:none;background:radial-gradient(circle at 72% 8%,#d9c56e22,transparent 25%),radial-gradient(circle at 18% 38%,#1a6a4b1f,transparent 26%),linear-gradient(180deg,#020806,#03100c 52%,#020806);z-index:0}.top,.hero,.composer,.summaryGrid,.workspace,.systems,.runtime,.truth{position:relative;z-index:1;width:min(1180px,calc(100% - 28px));margin-left:auto;margin-right:auto}.top{display:flex;justify-content:space-between;padding:24px 0;font-size:10px;letter-spacing:.13em;font-weight:950}.top a{color:#fff;text-decoration:none}.top span,small{color:#dfc96d}.hero{display:grid;grid-template-columns:1.4fr .6fr;gap:18px;padding:62px 0 26px}.hero h1{font-size:clamp(54px,8vw,96px);line-height:.92;letter-spacing:-.06em;margin:10px 0 20px}.hero em{font-style:normal;color:#dfc96d}.hero p{max-width:850px;color:#a9bbb2;line-height:1.7;font-size:16px}.hero aside,.composer,.mapCard,.blueprintCard,.systems,.runtime,.truth{border:1px solid #ffffff12;background:#061712d9;backdrop-filter:blur(18px);border-radius:24px}.hero aside{align-self:end;padding:20px;display:grid;gap:10px}.hero aside b{color:#dfc96d;font-size:11px;letter-spacing:.08em}.hero aside span{font-size:11px;color:#dce8e2}.hero aside i{font-style:normal;color:#789087;font-size:10px;border-top:1px solid #ffffff0d;padding-top:10px}.composer{padding:22px;margin-top:8px}.composeHead,.sectionHead{display:flex;align-items:end;justify-content:space-between;gap:16px}.composeHead h2,.sectionHead h2,.blueprintCard h2,.runtime h2{margin:6px 0 0;font-size:28px;letter-spacing:-.03em}.composeHead strong,.sectionHead>span{font-size:10px;color:#dfc96d;border:1px solid #dfc96d42;border-radius:999px;padding:8px 10px}textarea{width:100%;min-height:116px;margin-top:14px;background:#020a07;border:1px solid #ffffff12;border-radius:16px;color:#fff;padding:15px;font:650 14px/1.55 Inter,system-ui;resize:vertical;box-sizing:border-box}.controls{display:grid;grid-template-columns:1.5fr repeat(3,.55fr) 1.3fr;gap:8px;margin-top:9px}.controls label{display:grid;gap:5px;font-size:8px;letter-spacing:.08em;color:#7f968c;font-weight:900}.controls input,.controls select{width:100%;box-sizing:border-box;background:#091b15;border:1px solid #ffffff10;border-radius:10px;color:#eaf4ef;padding:10px;font:700 10px Inter,system-ui}.composer button{width:100%;margin-top:9px;border:0;border-radius:12px;padding:13px;background:#dfc96d;color:#07110d;font-weight:950}.summaryGrid{display:grid;grid-template-columns:repeat(8,1fr);gap:7px;margin-top:10px}.summaryGrid article{border:1px solid #ffffff0e;background:#061712cc;border-radius:15px;padding:12px}.summaryGrid span{display:block;color:#688078;font-size:7px;font-weight:900}.summaryGrid b{display:block;margin-top:7px;font-size:21px;color:#f0db7b}.workspace{display:grid;grid-template-columns:1.45fr .55fr;gap:10px;margin-top:10px}.mapCard,.blueprintCard{padding:20px}.mapCard svg{display:block;width:100%;margin-top:14px;border:1px solid #ffffff0d;border-radius:20px}.legend{display:flex;gap:13px;flex-wrap:wrap;margin-top:10px;color:#81978d;font-size:9px}.regionList{display:grid;gap:7px;margin-top:14px}.regionList div{border:1px solid #ffffff0d;background:#081e17;border-radius:13px;padding:11px}.regionList b,.regionList span,.regionList i{display:block}.regionList b{font-size:11px}.regionList span{font-size:9px;color:#8da298;margin-top:4px}.regionList i{font-style:normal;font-size:8px;color:#d9c56e;margin-top:5px}.systems{padding:22px;margin-top:10px}.capGrid{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-top:16px}.capGrid article{border:1px solid #ffffff0e;background:#081d16;border-radius:16px;padding:14px;min-height:128px}.capGrid article>span{color:#d9c56e;font-size:9px}.capGrid b{display:block;margin-top:9px}.capGrid p{color:#869b91;font-size:10px;line-height:1.5}.runtime{display:grid;grid-template-columns:.8fr 1.2fr auto;align-items:center;gap:18px;padding:22px;margin-top:10px}.runtime p{color:#849b90;font-size:10px;line-height:1.55}.runtime a{color:#07110d;background:#dfc96d;border-radius:12px;padding:13px;text-decoration:none;font-size:10px;font-weight:950;white-space:nowrap}.pills{display:flex;gap:6px;flex-wrap:wrap}.pills span{border:1px solid #ffffff10;border-radius:999px;padding:7px 9px;color:#b3c5bc;font-size:8px}.truth{padding:18px 22px;margin-top:10px}.truth b{color:#dfc96d}.truth p{margin:7px 0 0;color:#8ea198;font-size:10px;line-height:1.6}.truth strong{color:#cbd8d2}@media(max-width:980px){.summaryGrid{grid-template-columns:repeat(4,1fr)}.capGrid{grid-template-columns:repeat(2,1fr)}.runtime{grid-template-columns:1fr}.controls{grid-template-columns:1fr 1fr 1fr}.controls label:first-child,.controls label:last-child{grid-column:span 3}}@media(max-width:760px){.top span{display:none}.hero,.workspace{grid-template-columns:1fr}.hero{padding-top:38px}.hero h1{font-size:52px}.summaryGrid{grid-template-columns:repeat(2,1fr)}.capGrid{grid-template-columns:1fr}.controls{grid-template-columns:1fr 1fr}.controls label:first-child,.controls label:last-child{grid-column:span 2}.sectionHead,.composeHead{align-items:flex-start;flex-direction:column}.mapCard{overflow:hidden}.runtime a{text-align:center}}
    `}</style>
  </main>;
}
