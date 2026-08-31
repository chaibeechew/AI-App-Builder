// Cross-genre game platform systems for SoolenAI.
// These are provider-neutral engineering contracts. They never claim a live service is connected without evidence.

function clamp(v,min,max){return Math.max(min,Math.min(max,Number(v)||0));}
function text(v){return String(v??"").trim();}

export const GAME_PLATFORM_SYSTEMS_V1=Object.freeze({
  version:"game-platform-systems-v1",
  systems:[
    "replay","spectator","guild-clan","leaderboard","achievement","cloud-save","ugc-level-editor"
  ],
  liveServicesVerified:false
});

export function inferGamePlatformCapabilities(idea=""){
  const source=text(idea);
  const wants={
    replay:/replay|回放|录像|錄像|战斗记录|戰鬥記錄/i.test(source),
    spectator:/spectat|观战|觀戰|旁观|旁觀/i.test(source),
    guild:/guild|clan|公会|公會|战队|戰隊|联盟|聯盟/i.test(source),
    leaderboard:/leaderboard|ranking|ranked|排行榜|排名|天梯/i.test(source),
    achievements:/achievement|trophy|成就|奖杯|獎盃/i.test(source),
    cloudSave:/cloud save|cross.?device|云存档|雲存檔|跨设备|跨裝置/i.test(source),
    ugc:/ugc|level editor|map editor|user.?generated|关卡编辑|關卡編輯|地图编辑|地圖編輯|创意工坊|創意工坊/i.test(source)
  };
  const always=["achievement","leaderboard","replay","cloud-save"];
  const requested=Object.entries(wants).filter(([,v])=>v).map(([k])=>k);
  return{
    wants,
    requested,
    recommended:always,
    systems:[
      "Replay: bounded deterministic event/snapshot recording, scrub/seek metadata, version compatibility and privacy-safe sharing.",
      "Spectator: read-only delayed authoritative snapshots with no gameplay input authority and optional anti-stream-sniping delay.",
      "Guild/Clan: membership roles, permissions, invitations, moderation/audit hooks and server-authoritative ownership when connected.",
      "Leaderboard: season-scoped score submissions, deterministic tie-breaks, anti-tamper validation and privacy-safe display names.",
      "Achievement: data-driven conditions, idempotent unlocks, progress counters and offline-first queueing without inventing platform trophy success.",
      "Cloud Save: versioned save envelopes, device revision, checksum, conflict detection, merge policy and explicit user recovery; no cloud provider is assumed connected.",
      "UGC / Level Editor: schema-validated draft levels, bounded entity counts, safe asset references, play-test-before-publish and moderation/report hooks before public sharing."
    ],
    truthRule:"Platform systems may be internally complete as contracts, but live guilds, ranked boards, cloud sync, public UGC, platform achievements and spectator services require verified backend/provider evidence before production-ready claims."
  };
}

export function createReplayRecorder({gameVersion="1",maxEvents=5000,maxSnapshots=600}={}){return{version:1,gameVersion:text(gameVersion)||"1",startedAt:0,events:[],snapshots:[],maxEvents:clamp(maxEvents,100,20000),maxSnapshots:clamp(maxSnapshots,10,2000),closed:false};}
export function recordReplayEvent(replay,event){if(!replay||replay.closed||replay.events.length>=replay.maxEvents)return false;const at=Math.max(0,Number(event?.at)||0),type=text(event?.type).slice(0,48);if(!type)return false;replay.events.push({at,type,payload:sanitizePayload(event?.payload)});return true;}
export function recordReplaySnapshot(replay,snapshot){if(!replay||replay.closed||replay.snapshots.length>=replay.maxSnapshots)return false;const at=Math.max(0,Number(snapshot?.at)||0);replay.snapshots.push({at,state:sanitizePayload(snapshot?.state)});return true;}
export function finishReplay(replay,{duration=0}={}){if(!replay)return null;replay.closed=true;return{version:replay.version,gameVersion:replay.gameVersion,duration:Math.max(0,Number(duration)||0),events:[...replay.events],snapshots:[...replay.snapshots],shareable:false,requiresCompatibilityCheck:true};}
export function seekReplay(replay,at=0){const target=Math.max(0,Number(at)||0),snapshots=replay?.snapshots||[],events=replay?.events||[];let snapshot=null;for(const item of snapshots){if(item.at<=target)snapshot=item;else break;}return{target,snapshot,events:events.filter(item=>item.at>(snapshot?.at||0)&&item.at<=target)};}

export function createSpectatorPolicy({delaySeconds=8,maxViewers=100}={}){return{readOnly:true,inputAuthority:false,delaySeconds:clamp(delaySeconds,0,120),maxViewers:clamp(maxViewers,1,100000),authoritativeSnapshotsRequired:true,liveVerified:false};}
export function sanitizeSpectatorSnapshot(snapshot={}){return{tick:Number(snapshot.tick)||0,time:Number(snapshot.time)||0,players:Array.isArray(snapshot.players)?snapshot.players.map(p=>({id:text(p.id).slice(0,64),team:text(p.team).slice(0,32),x:Number(p.x)||0,y:Number(p.y)||0,z:Number(p.z)||0,health:clamp(p.health,0,100)})):[]};}

export function createGuildState({id="guild",name="Guild",ownerId="owner"}={}){return{id:text(id),name:text(name).slice(0,48),members:new Map([[text(ownerId),{id:text(ownerId),role:"owner",joinedAt:0}]]),maxMembers:100,audit:[],liveVerified:false};}
export function guildInvite(guild,{actorId,userId}={}){const actor=guild?.members?.get(text(actorId));if(!guild||!actor||!["owner","officer"].includes(actor.role)||guild.members.size>=guild.maxMembers)return{ok:false,reason:"not_allowed"};if(guild.members.has(text(userId)))return{ok:false,reason:"already_member"};return{ok:true,invite:{guildId:guild.id,userId:text(userId),role:"member"}};}
export function guildJoin(guild,invite){if(!guild||invite?.guildId!==guild.id||guild.members.size>=guild.maxMembers)return false;guild.members.set(text(invite.userId),{id:text(invite.userId),role:"member",joinedAt:Date.now()});guild.audit.push({type:"join",userId:text(invite.userId)});return true;}

export function createLeaderboard({season="S1",limit=100}={}){return{season:text(season)||"S1",limit:clamp(limit,10,1000),entries:new Map(),serverValidated:false};}
export function submitLeaderboardScore(board,{playerId,score,tiebreak=0,displayName="Player",validated=false}={}){if(!board||!playerId||validated!==true)return{ok:false,reason:"server_validation_required"};const id=text(playerId),next={playerId:id,displayName:text(displayName).slice(0,32),score:Number(score)||0,tiebreak:Number(tiebreak)||0};const prev=board.entries.get(id);if(!prev||next.score>prev.score||(next.score===prev.score&&next.tiebreak<prev.tiebreak))board.entries.set(id,next);board.serverValidated=true;return{ok:true};}
export function leaderboardRows(board){return[...(board?.entries?.values?.()||[])].sort((a,b)=>b.score-a.score||a.tiebreak-b.tiebreak||a.playerId.localeCompare(b.playerId)).slice(0,board.limit).map((row,index)=>({...row,rank:index+1}));}

export function createAchievementState(definitions=[]){return{definitions:(definitions||[]).slice(0,200).map(d=>({id:text(d.id),target:Math.max(1,Number(d.target)||1)})).filter(d=>d.id),progress:{},unlocked:{},pendingSync:[]};}
export function progressAchievement(state,id,amount=1){const def=state?.definitions?.find(d=>d.id===id);if(!def)return{ok:false,reason:"unknown_achievement"};if(state.unlocked[id])return{ok:true,alreadyUnlocked:true};state.progress[id]=(Number(state.progress[id])||0)+Math.max(0,Number(amount)||0);if(state.progress[id]>=def.target){state.unlocked[id]=true;state.pendingSync.push({id,unlockedAt:Date.now()});return{ok:true,unlocked:true};}return{ok:true,progress:state.progress[id],target:def.target};}

export function createCloudSaveEnvelope({deviceId="device",revision=1,schemaVersion=1,data={}}={}){const payload=sanitizePayload(data);return{schemaVersion:Math.max(1,Number(schemaVersion)||1),revision:Math.max(1,Number(revision)||1),deviceId:text(deviceId).slice(0,64),updatedAt:Date.now(),data:payload,checksum:stableChecksum(payload)};}
export function mergeCloudSave(local,remote,{strategy="newest"}={}){if(!local)return{winner:remote,conflict:false};if(!remote)return{winner:local,conflict:false};if(local.schemaVersion!==remote.schemaVersion)return{winner:null,conflict:true,reason:"schema_mismatch",local,remote};if(local.checksum===remote.checksum)return{winner:local.revision>=remote.revision?local:remote,conflict:false};if(local.revision===remote.revision)return{winner:null,conflict:true,reason:"same_revision_different_content",local,remote};if(strategy==="newest")return{winner:local.revision>remote.revision?local:remote,conflict:false,loser:local.revision>remote.revision?remote:local};return{winner:null,conflict:true,reason:"manual_resolution_required",local,remote};}

export function validateUgcLevel(level={}){const entities=Array.isArray(level.entities)?level.entities:[],bounds=level.bounds||{};const errors=[];if(!text(level.name))errors.push("name_required");if(entities.length>500)errors.push("entity_cap_exceeded");if(!(Number(bounds.width)>0&&Number(bounds.height)>0&&Number(bounds.width)<=10000&&Number(bounds.height)<=10000))errors.push("invalid_bounds");for(const entity of entities){if(!text(entity?.type))errors.push("entity_type_required");if(entity?.externalScript)errors.push("external_scripts_not_allowed");}return{valid:errors.length===0,errors,status:errors.length?"draft_invalid":"draft_valid",publiclyShared:false,requiresPlaytest:true,requiresModeration:true};}

function sanitizePayload(value,depth=0){if(depth>5)return null;if(value==null||typeof value==="string"||typeof value==="boolean")return typeof value==="string"?value.slice(0,2000):value;if(typeof value==="number")return Number.isFinite(value)?value:0;if(Array.isArray(value))return value.slice(0,200).map(v=>sanitizePayload(v,depth+1));if(typeof value==="object"){const out={};for(const [k,v] of Object.entries(value).slice(0,100))out[text(k).slice(0,64)]=sanitizePayload(v,depth+1);return out;}return null;}
function stableChecksum(value){const str=JSON.stringify(value);let h=2166136261;for(let i=0;i<str.length;i++){h^=str.charCodeAt(i);h=Math.imul(h,16777619);}return (h>>>0).toString(16).padStart(8,"0");}
