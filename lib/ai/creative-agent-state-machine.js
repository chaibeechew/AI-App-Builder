const freeze=value=>Object.freeze(value);

export const CREATIVE_AGENT_STATES=freeze([
  'draft','planned','executing','quality-check','retrying','approval-required','ready-to-persist','completed','failed','cancelled',
]);

const TRANSITIONS=freeze({
  draft:['planned','cancelled'],
  planned:['executing','cancelled'],
  executing:['quality-check','failed','cancelled'],
  'quality-check':['retrying','approval-required','ready-to-persist','failed','cancelled'],
  retrying:['executing','failed','cancelled'],
  'approval-required':['ready-to-persist','failed','cancelled'],
  'ready-to-persist':['completed','failed','cancelled'],
  completed:[],
  failed:[],
  cancelled:[],
});

export function validateCreativeAgentTransition(from,to){
  const a=String(from||'').trim();
  const b=String(to||'').trim();
  const known=CREATIVE_AGENT_STATES.includes(a)&&CREATIVE_AGENT_STATES.includes(b);
  const allowed=known&&(TRANSITIONS[a]||[]).includes(b);
  return freeze({ok:allowed,from:a||null,to:b||null,code:allowed?null:(known?'CREATIVE_AGENT_TRANSITION_BLOCKED':'CREATIVE_AGENT_STATE_UNKNOWN')});
}
