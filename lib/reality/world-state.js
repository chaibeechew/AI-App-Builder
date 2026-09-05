import { REALITY_TRUTH_LEVELS } from './reality-intelligence-contract.js';

const freeze=value=>Object.freeze(value);
const clean=(value,max=200)=>String(value??'').replace(/[\u0000-\u001f\u007f]/g,'').trim().slice(0,max);
const idPattern=/^[A-Za-z0-9._:-]{1,160}$/;
const clone=value=>JSON.parse(JSON.stringify(value));

function validId(value){return idPattern.test(clean(value,160));}
function safeEntity(entity={}){
  const id=clean(entity.id,160);if(!validId(id))throw new Error('REALITY_WORLD_ENTITY_ID_INVALID');
  return freeze({
    id,
    kind:clean(entity.kind||'object',80)||'object',
    label:clean(entity.label||id,160)||id,
    attributes:freeze(clone(entity.attributes&&typeof entity.attributes==='object'&&!Array.isArray(entity.attributes)?entity.attributes:{})),
    revision:Math.max(1,Number(entity.revision)||1),
  });
}
function safeRelation(relation={}){
  const from=clean(relation.from,160),to=clean(relation.to,160),type=clean(relation.type,100);
  if(!validId(from)||!validId(to)||!type)throw new Error('REALITY_WORLD_RELATION_INVALID');
  return freeze({from,to,type,attributes:freeze(clone(relation.attributes&&typeof relation.attributes==='object'&&!Array.isArray(relation.attributes)?relation.attributes:{}))});
}

export function createWorldState({worldId,projectId,entities=[],relations=[],metadata={}}={}){
  const id=clean(worldId,160),project=clean(projectId,160);
  if(!validId(id)||!validId(project))throw new Error('REALITY_WORLD_ID_REQUIRED');
  const normalizedEntities=entities.map(safeEntity);
  const ids=new Set();for(const entity of normalizedEntities){if(ids.has(entity.id))throw new Error('REALITY_WORLD_ENTITY_DUPLICATE');ids.add(entity.id);}
  const normalizedRelations=relations.map(safeRelation);
  for(const relation of normalizedRelations){if(!ids.has(relation.from)||!ids.has(relation.to))throw new Error('REALITY_WORLD_RELATION_ENTITY_MISSING');}
  return freeze({
    schemaVersion:1,worldId:id,projectId:project,version:1,
    entities:freeze(normalizedEntities),relations:freeze(normalizedRelations),
    history:freeze([]),metadata:freeze(clone(metadata&&typeof metadata==='object'&&!Array.isArray(metadata)?metadata:{})),
    truth:REALITY_TRUTH_LEVELS.CODE_READY,
  });
}

export function applyWorldEvent(state,event={}){
  if(!state?.worldId||!state?.projectId)throw new Error('REALITY_WORLD_STATE_INVALID');
  const eventId=clean(event.eventId,160);if(!validId(eventId))throw new Error('REALITY_WORLD_EVENT_ID_INVALID');
  if((state.history||[]).some(row=>row.eventId===eventId))throw new Error('REALITY_WORLD_EVENT_REPLAY');
  const type=clean(event.type,80);if(!['entity.upsert','entity.remove','relation.upsert','relation.remove','metadata.patch'].includes(type))throw new Error('REALITY_WORLD_EVENT_TYPE_UNSUPPORTED');
  const next=clone(state);next.entities=Array.isArray(next.entities)?next.entities:[];next.relations=Array.isArray(next.relations)?next.relations:[];next.history=Array.isArray(next.history)?next.history:[];
  if(type==='entity.upsert'){
    const entity=safeEntity(event.entity);const index=next.entities.findIndex(row=>row.id===entity.id);
    const revision=index>=0?Math.max(Number(next.entities[index].revision)||1,entity.revision)+1:1;
    const row={...entity,revision};if(index>=0)next.entities[index]=row;else next.entities.push(row);
  }else if(type==='entity.remove'){
    const entityId=clean(event.entityId,160);if(!validId(entityId))throw new Error('REALITY_WORLD_ENTITY_ID_INVALID');
    next.entities=next.entities.filter(row=>row.id!==entityId);next.relations=next.relations.filter(row=>row.from!==entityId&&row.to!==entityId);
  }else if(type==='relation.upsert'){
    const relation=safeRelation(event.relation);if(!next.entities.some(row=>row.id===relation.from)||!next.entities.some(row=>row.id===relation.to))throw new Error('REALITY_WORLD_RELATION_ENTITY_MISSING');
    const index=next.relations.findIndex(row=>row.from===relation.from&&row.to===relation.to&&row.type===relation.type);if(index>=0)next.relations[index]=relation;else next.relations.push(relation);
  }else if(type==='relation.remove'){
    const relation=safeRelation(event.relation);next.relations=next.relations.filter(row=>!(row.from===relation.from&&row.to===relation.to&&row.type===relation.type));
  }else{
    const patch=event.patch&&typeof event.patch==='object'&&!Array.isArray(event.patch)?clone(event.patch):{};next.metadata={...(next.metadata||{}),...patch};
  }
  next.version=Math.max(1,Number(state.version)||1)+1;
  next.history.push({eventId,type,version:next.version,reason:clean(event.reason,240)||null,actorType:clean(event.actorType||'system',40)||'system'});
  next.truth=REALITY_TRUTH_LEVELS.CODE_READY;
  return freeze({
    ...next,entities:freeze(next.entities.map(row=>freeze(row))),relations:freeze(next.relations.map(row=>freeze(row))),history:freeze(next.history.map(row=>freeze(row))),metadata:freeze(next.metadata||{}),
  });
}

export function buildWorldMemoryPatch(state){
  if(!state?.worldId||!state?.projectId)throw new Error('REALITY_WORLD_STATE_INVALID');
  return freeze({
    realityWorld:freeze({
      schemaVersion:1,worldId:state.worldId,projectId:state.projectId,version:state.version,
      entities:state.entities,relations:state.relations,metadata:state.metadata,
    }),
  });
}
