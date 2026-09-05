import {compileProductionWorldV20} from '../../lib/game/game-world-production-world-v20.js';

export const dynamic='force-dynamic';

const card={border:'1px solid rgba(255,255,255,.14)',background:'rgba(11,18,26,.72)',borderRadius:24,padding:20,boxShadow:'0 18px 70px rgba(0,0,0,.28)',backdropFilter:'blur(20px)'};
const pill={display:'inline-flex',alignItems:'center',gap:8,border:'1px solid rgba(255,255,255,.18)',borderRadius:999,padding:'7px 11px',fontSize:11,fontWeight:900,letterSpacing:'.05em'};

export default function GameWorldV20Page(){
  const world=compileProductionWorldV20({
    seed:'laneriq-v20-lab',worldId:'laneriq-v20-lab',
    city:{sizeMeters:840,blockMeters:120,maxBuildings:56,style:'future-natural'},
    art:{theme:'cyber'}
  });
  const m=world.manifest.categories;
  const metrics=[
    ['Terrain',`${m.terrain.triangles.toLocaleString()} triangles`],
    ['Water',`${m.hydrology.rivers} rivers · ${m.hydrology.lakes} lakes`],
    ['Vegetation',`${m.vegetation.instances.toLocaleString()} instances`],
    ['City',`${m.city.buildings} buildings · ${m.city.parcels} parcels`],
    ['Interior',`${m.interiors.prototypeRooms} prototype rooms`],
    ['World Art',`${m.art.gpuBatches} GPU batches · ${m.art.decals} decals`]
  ];
  return <main style={{minHeight:'100vh',color:'#f7fbff',background:'radial-gradient(circle at 14% 8%,#154b4b 0,transparent 31%),radial-gradient(circle at 88% 0,#342b68 0,transparent 30%),linear-gradient(180deg,#071014,#04070a 58%,#020304)',padding:'56px clamp(18px,4vw,64px) 110px',fontFamily:'Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif'}}>
    <section style={{maxWidth:1280,margin:'0 auto'}}>
      <div style={{...pill,background:'rgba(114,255,218,.09)',color:'#a8ffe8'}}>LANERIQ AI WORLD ENGINE · V20</div>
      <h1 style={{fontSize:'clamp(42px,8vw,92px)',lineHeight:.93,letterSpacing:'-.065em',margin:'24px 0 20px',maxWidth:980}}>Production World<br/>Art Runtime</h1>
      <p style={{maxWidth:880,fontSize:'clamp(16px,2vw,22px)',lineHeight:1.6,color:'#c5d3dc'}}>Prompt → Terrain → Hydrology → Ecology → Vegetation → Architecture → Interior → City → World Art. Gameplay truth stays on mesh, collision, navigation, structural and room graphs; visual truth stays independently optimizable.</p>

      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(190px,1fr))',gap:12,marginTop:30}}>{metrics.map(([label,value])=><article key={label} style={card}><div style={{fontSize:11,textTransform:'uppercase',letterSpacing:'.12em',color:'#7f9aaa',fontWeight:900}}>{label}</div><div style={{fontSize:20,fontWeight:900,marginTop:10}}>{value}</div></article>)}</div>

      <section style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(300px,1fr))',gap:16,marginTop:18}}>
        <article style={card}><div style={{...pill,color:'#b8ffe8'}}>7-Layer World Chain</div><ol style={{paddingLeft:20,lineHeight:2,color:'#d9e4ea',marginBottom:0}}>{world.layers.map(layer=><li key={layer}>{layer}</li>)}</ol></article>
        <article style={card}><div style={{...pill,color:'#b7c9ff'}}>Runtime Optimization</div><div style={{display:'grid',gap:12,marginTop:16}}><b>LOD / HLOD: {world.lod.hlodEnabled?'READY':'PLANNED'}</b><b>GPU Instancing: {world.batches.gpuInstancing?'READY':'NO'}</b><b>Decal Streaming: {world.decals.streamingReady?'READY':'NO'}</b><b>Destruction Rollback: {world.destruction.rollbackSnapshotReady?'READY':'NO'}</b></div></article>
        <article style={card}><div style={{...pill,color:'#ffd6a1'}}>Truth Gate</div><div style={{display:'grid',gap:12,marginTop:16}}><b>Internal Code: {world.readiness.internal100?'100 ✅':'NOT READY'}</b><b>Production 100: {world.readiness.production100?'TRUE':'FALSE'}</b><span style={{color:'#a9bac4',lineHeight:1.55}}>Real terrain/water/vegetation render quality, architecture/interior playtest, hardware soak, iOS/Android, engine imports and exact-SHA Production closure remain evidence-gated.</span></div></article>
      </section>

      <section style={{...card,marginTop:18}}><div style={{fontSize:11,textTransform:'uppercase',letterSpacing:'.14em',fontWeight:900,color:'#77e7ca'}}>Production World Asset Manifest</div><pre style={{whiteSpace:'pre-wrap',overflowWrap:'anywhere',fontSize:12,lineHeight:1.6,color:'#cbd9e1',margin:'16px 0 0'}}>{JSON.stringify(world.manifest,null,2)}</pre></section>
    </section>
  </main>;
}
