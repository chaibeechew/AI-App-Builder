const EXCLUSIVE_ROLES=new Set(['pose','composition','depth','segmentation','background']);
const POLICIES=new Set(['fail-closed','priority-first','weighted-blend']);
function clean(value,max=80){return String(value ?? '').trim().toLowerCase().slice(0,max);}

export function resolveCreativeReferenceConflicts({references=[],policy='fail-closed',dominanceMargin=15}={}){
  const chosenPolicy=clean(policy);
  if(!POLICIES.has(chosenPolicy)) return {ok:false,code:'CREATIVE_REFERENCE_CONFLICT_POLICY_INVALID'};
  const source=Array.isArray(references)?references:[];
  const groups=new Map();
  for(const ref of source){
    if(!ref||typeof ref!=='object'||!ref.referenceId||!ref.role) return {ok:false,code:'CREATIVE_REFERENCE_CONFLICT_INPUT_INVALID'};
    const key=`${ref.role}:${ref.target||'global'}`;
    if(!groups.has(key)) groups.set(key,[]);
    groups.get(key).push(ref);
  }
  const resolutions=[];
  const conflicts=[];
  for(const [key,items] of groups){
    if(items.length===1){resolutions.push({key,mode:'single',references:[items[0].referenceId]});continue;}
    const role=String(items[0].role);
    const locked=items.filter(item=>item.lock===true);
    const exclusive=EXCLUSIVE_ROLES.has(role)||locked.length>0||items.some(item=>item.allowBlend===false);
    const sorted=[...items].sort((a,b)=>(Number(b.priority)||0)-(Number(a.priority)||0)||(Number(b.weight)||0)-(Number(a.weight)||0));
    const margin=(Number(sorted[0]?.priority)||0)-(Number(sorted[1]?.priority)||0);
    if(exclusive&&chosenPolicy==='fail-closed'){
      conflicts.push({key,role,references:sorted.map(item=>item.referenceId),reason:'exclusive-reference-conflict'});
      continue;
    }
    if(exclusive&&chosenPolicy==='priority-first'){
      if(margin<Number(dominanceMargin)){
        conflicts.push({key,role,references:sorted.map(item=>item.referenceId),reason:'priority-margin-insufficient'});
        continue;
      }
      resolutions.push({key,mode:'priority-first',references:[sorted[0].referenceId],discarded:sorted.slice(1).map(item=>item.referenceId)});
      continue;
    }
    if(exclusive&&chosenPolicy==='weighted-blend'&&items.some(item=>item.allowBlend===false||item.lock===true)){
      conflicts.push({key,role,references:sorted.map(item=>item.referenceId),reason:'blend-not-allowed'});
      continue;
    }
    const total=items.reduce((sum,item)=>sum+Math.max(0,Number(item.weight)||0),0)||1;
    resolutions.push({key,mode:'weighted-blend',references:items.map(item=>({referenceId:item.referenceId,normalizedWeight:Number((Math.max(0,Number(item.weight)||0)/total).toFixed(6))}))});
  }
  return {
    ok:conflicts.length===0,
    code:conflicts.length?'CREATIVE_REFERENCE_CONFLICT_UNRESOLVED':null,
    policy:chosenPolicy,
    resolutions,
    conflicts,
    failClosed:conflicts.length>0,
    providerNeutral:true,
    truth:'CODE_READY',
  };
}
