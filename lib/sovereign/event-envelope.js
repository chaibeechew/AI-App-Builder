import crypto from "node:crypto";

const TYPE=/^[a-z0-9]+(?:\.[a-z0-9_-]+){1,7}$/;
const ID=/^[A-Za-z0-9._:-]{8,180}$/;

function safeText(value,label,max=180){
  const text=String(value||"").trim();
  if(!text||text.length>max)throw new Error(`${label} is invalid.`);
  return text;
}
function jsonSize(value){return Buffer.byteLength(JSON.stringify(value??null),"utf8");}

export function createSovereignEvent(input={}){
  const eventType=safeText(input.eventType,"eventType",160).toLowerCase();
  if(!TYPE.test(eventType))throw new Error("eventType is invalid.");
  const eventId=safeText(input.eventId||crypto.randomUUID(),"eventId",180);
  if(!ID.test(eventId))throw new Error("eventId is invalid.");
  const source=safeText(input.source,"source",80).toLowerCase();
  const subject=safeText(input.subject||"system","subject",180);
  const data=input.data??{};
  if(jsonSize(data)>64*1024)throw new Error("event data is too large.");
  const metadata=input.metadata&&typeof input.metadata==="object"&&!Array.isArray(input.metadata)?input.metadata:{};
  if(jsonSize(metadata)>8*1024)throw new Error("event metadata is too large.");
  return Object.freeze({
    protocol:"laneriq.event.v1",
    eventId,
    eventType,
    source,
    subject,
    occurredAt:String(input.occurredAt||new Date().toISOString()),
    traceId:safeText(input.traceId||eventId,"traceId",180),
    causationId:input.causationId?safeText(input.causationId,"causationId",180):null,
    sensitivity:String(input.sensitivity||"internal"),
    data,
    metadata,
  });
}

export function validateEventRoute(event,{allowedTypes=[],allowedSources=[]}={}){
  if(!event||event.protocol!=="laneriq.event.v1")return {ok:false,reason:"invalid_protocol"};
  if(allowedTypes.length&&!allowedTypes.includes(event.eventType))return {ok:false,reason:"event_type_not_allowed"};
  if(allowedSources.length&&!allowedSources.includes(event.source))return {ok:false,reason:"event_source_not_allowed"};
  return {ok:true,eventId:event.eventId,traceId:event.traceId};
}
