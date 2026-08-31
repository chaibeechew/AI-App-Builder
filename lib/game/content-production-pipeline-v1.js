// SoolenAI large-game content production pipeline foundations.
// Provider-neutral deterministic contracts. Final renderer/importer fidelity and real-device performance stay evidence-gated.

function clamp(v,min,max){return Math.max(min,Math.min(max,Number(v)||0));}
function text(v){return String(v??"").trim();}
function cleanId(v){return text(v).replace(/[^a-zA-Z0-9_.:-]/g,"_").slice(0,120);}
function hash(value){const s=text(value);let h=2166136261;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619);}return(h>>>0).toString(16);}

export const CONTENT_PRODUCTION_PIPELINE_V1=Object.freeze({
  version:"content-production-pipeline-v1",
  systems:[
    "asset-import","animation-import","scene-composer","prefab-system","physics-materials","lod-hlod",
    "occlusion-culling","gpu-instancing","shader-material-editor","spatial-audio","localization",
    "automated-playtesting-ai","crash-performance-analyzer","large-world-content-pipeline"
  ],
  targetPlatforms:["ios","android","web-preview"],
  deterministic:true,
  realImporterVerified:false,
  realGpuProfileVerified:false
});

export function inferContentProductionCapabilities(idea=""){
  const s=text(idea);
  const matched=/asset pipeline|animation import|scene composer|prefab|physics material|\blod\b|hlod|occlusion|gpu instanc|shader editor|material editor|spatial audio|localization|playtest|crash analyzer|content pipeline|资产管线|資產管線|动画导入|動畫導入|场景编辑|場景編輯|预制体|預製體|物理材质|物理材質|遮挡剔除|遮擋剔除|实例化|實例化|着色器|著色器|空间音频|空間音頻|本地化|自动试玩|自動試玩|崩溃分析|崩潰分析/i.test(s);
  const wants={
    assetImport:/asset|import|资产|資產|导入|導入/i.test(s),scene:/scene|场景|場景/i.test(s),prefab:/prefab|预制体|預製體/i.test(s),
    lod:/\blod\b|hlod|level of detail|层级细节|層級細節/i.test(s),occlusion:/occlusion|遮挡|遮擋/i.test(s),instancing:/instanc|实例化|實例化/i.test(s),
    shader:/shader|material editor|着色器|著色器|材质编辑|材質編輯/i.test(s),audio:/spatial audio|3d audio|空间音频|空間音頻/i.test(s),
    localization:/localization|i18n|本地化|多语言|多語言/i.test(s),playtest:/playtest|试玩|試玩|自动测试|自動測試/i.test(s),
    crash:/crash|崩溃|崩潰|performance analyzer|性能分析/i.test(s),worldPipeline:/content pipeline|world streaming|大型世界|开放世界内容|開放世界內容/i.test(s)
  };
  return{matched,wants,systems:[
    "Asset/Animation Import validates format, size, naming, skeleton/clip metadata and rejects executable payloads before an asset is accepted.",
    "3D Scene Composer uses bounded entity/component documents with stable IDs so scenes can be versioned, diffed and recovered.",
    "Prefabs are immutable templates with whitelisted overrides and deterministic instance IDs; arbitrary executable overrides are rejected.",
    "Physics Materials clamp friction/restitution and use explicit combine rules so contact behavior is predictable across generated scenes.",
    "LOD/HLOD planning budgets triangle density by distance and clusters static content without claiming final renderer quality.",
    "Occlusion Culling and GPU Instancing produce renderer-ready visibility/batch contracts with bounded object and batch counts.",
    "Shader/Material Editor validates mobile-safe graph nodes and complexity budgets before accepting a material graph.",
    "Spatial Audio calculates bounded distance attenuation/panning and caps simultaneous voices for mobile performance.",
    "Localization validates locale fallbacks and placeholder parity so translations cannot silently break runtime strings.",
    "Automated Playtesting AI replays deterministic action traces and reports coverage, unreachable goals, invalid states and runtime errors.",
    "Crash/Performance Analyzer fingerprints sanitized failures and reports frame/memory/draw-call violations without leaking secrets.",
    "Large-world Content Pipeline partitions assets into budgeted chunks with dependencies, preload rings and deterministic streaming priority."
  ],truthRule:"Internal content-pipeline evidence proves deterministic authoring, validation and simulation contracts only. Final DCC/engine importer fidelity, shader/GPU behavior, audio hardware output, localization review, crash-free rate and real-device frame/memory/thermal performance require measured production evidence."};
}

const FORMATS=Object.freeze({mesh:["glb","gltf","obj","fbx"],animation:["glb","gltf","fbx"],texture:["png","jpg","jpeg","webp","ktx2"],audio:["wav","mp3","ogg","m4a"],data:["json","csv"]});
export function validateAssetImport(asset={}){
  const type=text(asset.type).toLowerCase(),name=cleanId(asset.name||"asset"),ext=text(asset.extension||text(asset.name).split(".").pop()).toLowerCase();
  const sizeMb=clamp(asset.sizeMb,0,2048),errors=[],warnings=[];
  if(!FORMATS[type])errors.push("unsupported_asset_type");
  else if(!FORMATS[type].includes(ext))errors.push("unsupported_format");
  if(/js|mjs|cjs|exe|dll|sh|bat|cmd|html/i.test(ext))errors.push("executable_payload_not_allowed");
  const caps={mesh:80,animation:60,texture:32,audio:24,data:8};if(sizeMb>(caps[type]||8))warnings.push("asset_size_over_mobile_budget");
  const meta={vertices:clamp(asset.vertices,0,5_000_000),bones:clamp(asset.bones,0,512),duration:clamp(asset.duration,0,3600),textureSize:clamp(asset.textureSize,0,16384)};
  if(type==="mesh"&&meta.vertices>250000)warnings.push("mesh_requires_lod");
  if(type==="animation"&&meta.bones>160)warnings.push("skeleton_over_mobile_budget");
  if(type==="texture"&&meta.textureSize>2048)warnings.push("texture_requires_mobile_variant");
  return{valid:errors.length===0,errors,warnings,asset:{id:`asset_${hash(`${name}:${ext}:${sizeMb}`)}`,name,type,extension:ext,sizeMb,meta}};
}

export function normalizeAnimationClip(clip={}){return{id:cleanId(clip.id||"clip"),duration:clamp(clip.duration,.05,300),fps:clamp(clip.fps,12,120),loop:clip.loop===true,rootMotion:clip.rootMotion===true,events:(clip.events||[]).slice(0,64).map(e=>({time:clamp(e.time,0,300),name:cleanId(e.name)})).sort((a,b)=>a.time-b.time)};}

const SAFE_COMPONENTS=new Set(["transform","mesh","material","light","camera","collider","rigidbody","audio","animation","scriptless-behavior","navigation","lod","prefab-instance"]);
export function validateSceneDocument(doc={}){
  const entities=(doc.entities||[]).slice(0,5000).map((e,i)=>({id:cleanId(e.id||`entity_${i}`),name:text(e.name||e.id||`Entity ${i}`).slice(0,120),components:(e.components||[]).slice(0,32).map(c=>({type:cleanId(c.type),data:c.data&&typeof c.data==="object"?c.data:{}}))}));
  const errors=[],ids=new Set();for(const e of entities){if(ids.has(e.id))errors.push(`duplicate_entity:${e.id}`);ids.add(e.id);for(const c of e.components)if(!SAFE_COMPONENTS.has(c.type))errors.push(`unsafe_component:${c.type}`);}
  if(doc.externalScript||doc.eval||doc.executable)errors.push("executable_scene_code_not_allowed");
  return{valid:errors.length===0,errors,scene:{id:cleanId(doc.id||"scene"),entities,entityCount:entities.length,checksum:hash(JSON.stringify(entities))}};
}

export function createPrefab(doc={}){const checked=validateSceneDocument({id:doc.id||"prefab",entities:doc.entities||[]});return{valid:checked.valid,errors:checked.errors,prefab:{id:cleanId(doc.id||"prefab"),version:Math.max(1,Math.floor(Number(doc.version)||1)),entities:checked.scene.entities,allowedOverrides:(doc.allowedOverrides||["transform","material","animation"]).filter(x=>SAFE_COMPONENTS.has(cleanId(x))).map(cleanId),checksum:checked.scene.checksum}};}
export function instantiatePrefab(prefab,{instanceId="instance",overrides={}}={}){if(!prefab?.id)return{ok:false,reason:"invalid_prefab"};const denied=Object.keys(overrides||{}).filter(k=>!prefab.allowedOverrides.includes(cleanId(k)));if(denied.length)return{ok:false,reason:"override_not_allowed",denied};return{ok:true,instance:{id:cleanId(instanceId),prefabId:prefab.id,prefabVersion:prefab.version,overrides,checksum:hash(`${prefab.checksum}:${instanceId}:${JSON.stringify(overrides)}`)}};}

export function createPhysicsMaterial({id="physics",friction=.5,restitution=.1,frictionCombine="average",restitutionCombine="max"}={}){const allowed=new Set(["average","min","max","multiply"]);return{id:cleanId(id),friction:clamp(friction,0,2),restitution:clamp(restitution,0,1),frictionCombine:allowed.has(frictionCombine)?frictionCombine:"average",restitutionCombine:allowed.has(restitutionCombine)?restitutionCombine:"max"};}
function combine(a,b,mode){if(mode==="min")return Math.min(a,b);if(mode==="max")return Math.max(a,b);if(mode==="multiply")return a*b;return(a+b)/2;}
export function combinePhysicsMaterials(a,b){const mode=a.frictionCombine||b.frictionCombine||"average",rmode=a.restitutionCombine||b.restitutionCombine||"max";return{friction:+clamp(combine(a.friction,b.friction,mode),0,2).toFixed(3),restitution:+clamp(combine(a.restitution,b.restitution,rmode),0,1).toFixed(3)};}

export function planLodHlod({triangles=100000,distances=[12,28,60],staticInstances=0}={}){const base=Math.max(1,Math.floor(Number(triangles)||1)),ds=distances.slice(0,6).map((d,i)=>clamp(d,i?distances[i-1]+1:1,10000));const ratios=[1,.48,.2,.07,.025,.01];const lods=ds.map((distance,i)=>({level:i,distance,triangles:Math.max(64,Math.round(base*ratios[i]))}));lods.push({level:lods.length,distance:Infinity,triangles:0,cull:true});return{lods,hlod:{enabled:staticInstances>=20,clusterTarget:clamp(Math.ceil(staticInstances/40),1,128),sourceInstances:Math.max(0,Math.floor(staticInstances))}};}

export function computeOcclusionVisibility(objects=[],{maxDistance=160,occludedIds=[]}={}){const hidden=new Set(occludedIds.map(cleanId));return(objects||[]).slice(0,10000).map(o=>{const id=cleanId(o.id),distance=Math.max(0,Number(o.distance)||0),visible=distance<=maxDistance&&!hidden.has(id);return{id,distance,visible,reason:distance>maxDistance?"distance_cull":hidden.has(id)?"occluded":"visible"};});}
export function buildGpuInstanceBatches(items=[],{maxPerBatch=1023}={}){const groups=new Map();for(const item of(items||[]).slice(0,20000)){const key=`${cleanId(item.mesh)}|${cleanId(item.material)}`;if(!groups.has(key))groups.set(key,[]);groups.get(key).push(cleanId(item.id));}const batches=[];for(const[key,ids]of groups){const[mesh,material]=key.split("|");for(let i=0;i<ids.length;i+=maxPerBatch)batches.push({mesh,material,instances:ids.slice(i,i+maxPerBatch),count:Math.min(maxPerBatch,ids.length-i)});}return batches;}

const SHADER_NODES=new Set(["texture","color","multiply","add","lerp","normal","metallic","roughness","emission","fresnel","uv","time","clamp","output"]);
export function validateShaderMaterialGraph(doc={}){const nodes=(doc.nodes||[]).slice(0,96).map(n=>({id:cleanId(n.id),type:cleanId(n.type),inputs:(n.inputs||[]).map(cleanId).slice(0,12)})),errors=[];let complexity=0;const ids=new Set(nodes.map(n=>n.id));for(const n of nodes){if(!SHADER_NODES.has(n.type))errors.push(`unsupported_shader_node:${n.type}`);for(const input of n.inputs)if(!ids.has(input))errors.push(`missing_shader_input:${n.id}:${input}`);complexity+=n.type==="texture"?3:n.type==="fresnel"||n.type==="emission"?2:1;}const budget=doc.tier==="mobile_low"?18:doc.tier==="mobile_high"?42:28;if(complexity>budget)errors.push("shader_complexity_over_budget");return{valid:errors.length===0,errors,complexity,budget,nodes};}

export function spatializeAudio(source={x:0,y:0,z:0},listener={x:0,y:0,z:0},{maxDistance=40,minDistance=1}={}){const dx=(Number(source.x)||0)-(Number(listener.x)||0),dy=(Number(source.y)||0)-(Number(listener.y)||0),dz=(Number(source.z)||0)-(Number(listener.z)||0),distance=Math.hypot(dx,dy,dz),gain=distance>=maxDistance?0:distance<=minDistance?1:1-(distance-minDistance)/(maxDistance-minDistance),pan=clamp(dx/Math.max(minDistance,distance),-1,1);return{distance:+distance.toFixed(3),gain:+clamp(gain,0,1).toFixed(3),pan:+pan.toFixed(3),audible:gain>0};}
export function selectSpatialAudioVoices(sources=[],listener={},maxVoices=24){return sources.map(s=>({...s,spatial:spatializeAudio(s,listener,s.options||{})})).filter(s=>s.spatial.audible).sort((a,b)=>b.spatial.gain-a.spatial.gain).slice(0,clamp(maxVoices,1,64));}

function placeholders(v){return[...text(v).matchAll(/\{([a-zA-Z0-9_]+)\}/g)].map(m=>m[1]).sort();}
export function buildLocalizationBundle(entries={},locales=["en"],fallback="en"){
  const locs=[...new Set(locales.map(x=>text(x).toLowerCase()).filter(Boolean))].slice(0,32);if(!locs.includes(fallback))locs.unshift(fallback);const errors=[],bundle={};for(const[key,value]of Object.entries(entries||{}).slice(0,5000)){const id=cleanId(key),row=value&&typeof value==="object"?value:{};bundle[id]={};const base=text(row[fallback]);if(!base)errors.push(`missing_fallback:${id}`);const expected=placeholders(base).join("|");for(const locale of locs){const translated=text(row[locale]||base);bundle[id][locale]=translated;if(placeholders(translated).join("|")!==expected)errors.push(`placeholder_mismatch:${id}:${locale}`);}}return{valid:errors.length===0,errors,locales:locs,fallback,bundle};}

export function runAutomatedPlaytest({initialState={},actions=[],applyAction,goal,assertState,maxSteps=500}={}){let state=structuredClone(initialState),steps=0,errors=[],visited=new Set([hash(JSON.stringify(state))]),goalReached=false;for(const action of(actions||[]).slice(0,maxSteps)){try{state=applyAction?applyAction(state,action):state;steps++;if(assertState&&assertState(state)!==true)errors.push(`invalid_state_at:${steps}`);visited.add(hash(JSON.stringify(state)));if(goal&&goal(state)===true){goalReached=true;break;}}catch(e){errors.push(`runtime_error_at:${steps+1}:${text(e?.message).slice(0,120)}`);break;}}return{passed:errors.length===0&&(!goal||goalReached),steps,goalReached,errors,uniqueStates:visited.size,coverageHint:Math.min(100,Math.round(visited.size/Math.max(1,steps+1)*100)),finalState:state};}

function redactSecrets(value){return text(value).replace(/(api[_-]?key|token|password|secret|authorization)\s*[:=]\s*[^\s,;]+/ig,"$1=[REDACTED]");}
function containsUnredactedSecret(value){return /(api[_-]?key|token|password|secret|authorization)\s*[:=]\s*(?!\[REDACTED\])[^\s,;]+/i.test(text(value));}
export function analyzeCrashReport({message="",stack="",events=[]}={}){const sanitizedMessage=redactSecrets(message).slice(0,500),sanitizedStack=redactSecrets(stack).slice(0,4000),fingerprint=hash(`${sanitizedMessage}\n${sanitizedStack.split("\n").slice(0,5).join("\n")}`);const lower=`${sanitizedMessage} ${sanitizedStack}`.toLowerCase(),category=lower.includes("out of memory")||lower.includes("oom")?"memory":lower.includes("network")?"network":lower.includes("render")||lower.includes("gpu")?"rendering":"runtime";return{fingerprint,category,message:sanitizedMessage,stack:sanitizedStack,recentEvents:(events||[]).slice(-32),containsRawSecret:containsUnredactedSecret(`${sanitizedMessage} ${sanitizedStack}`)};}
export function analyzePerformanceSamples(samples=[],budget={frameMs:16.7,memoryMb:900,drawCalls:1800}){const rows=(samples||[]).slice(0,3000).map(s=>({frameMs:Math.max(0,Number(s.frameMs)||0),memoryMb:Math.max(0,Number(s.memoryMb)||0),drawCalls:Math.max(0,Number(s.drawCalls)||0)})),violations=[];rows.forEach((r,i)=>{if(r.frameMs>budget.frameMs)violations.push(`frame:${i}`);if(r.memoryMb>budget.memoryMb)violations.push(`memory:${i}`);if(r.drawCalls>budget.drawCalls)violations.push(`draw_calls:${i}`);});const avg=k=>rows.length?rows.reduce((s,r)=>s+r[k],0)/rows.length:0;return{samples:rows.length,avgFrameMs:+avg("frameMs").toFixed(2),avgMemoryMb:+avg("memoryMb").toFixed(1),avgDrawCalls:+avg("drawCalls").toFixed(1),violations,productionDeviceEvidence:false};}

export function planLargeWorldContent(assets=[],{chunkSize=128,chunkBudgetMb=64,preloadRings=1}={}){const size=clamp(chunkSize,32,1024),budget=clamp(chunkBudgetMb,8,256),chunks=new Map();for(const a of(assets||[]).slice(0,20000)){const x=Number(a.x)||0,z=Number(a.z)||0,cx=Math.floor(x/size),cz=Math.floor(z/size),id=`${cx}:${cz}`;if(!chunks.has(id))chunks.set(id,{id,cx,cz,assets:[],sizeMb:0,dependencies:new Set()});const c=chunks.get(id),sizeMb=clamp(a.sizeMb,0,1024);c.assets.push(cleanId(a.id));c.sizeMb+=sizeMb;for(const dep of(a.dependencies||[]).slice(0,16))c.dependencies.add(cleanId(dep));}const out=[...chunks.values()].map(c=>({id:c.id,cx:c.cx,cz:c.cz,assets:c.assets,sizeMb:+c.sizeMb.toFixed(2),dependencies:[...c.dependencies],overBudget:c.sizeMb>budget,priority:Math.abs(c.cx)+Math.abs(c.cz),preloadRings:clamp(preloadRings,0,4)})).sort((a,b)=>a.priority-b.priority||a.id.localeCompare(b.id));return{chunkSize:size,chunkBudgetMb:budget,chunks:out,overBudgetChunks:out.filter(c=>c.overBudget).map(c=>c.id),deterministic:true};}
