// Runtime/UI verification plan for generated apps.
export function createRuntimeTestPlan(spec={}){
 const pages=Array.isArray(spec.pages)?spec.pages:[];
 const navigation=Array.isArray(spec.navigation)?spec.navigation:[];
 return {checks:[
  {id:"boot",type:"runtime",expect:"application starts without uncaught error"},
  ...pages.map(p=>({id:`route:${p.id||p.route}`,type:"route",route:p.route||"/",expect:"renders without fatal error"})),
  ...navigation.map((n,i)=>({id:`nav:${i}`,type:"navigation",route:n.route||n.href||"/",expect:"target route resolves"})),
  {id:"console",type:"runtime",expect:"no uncaught exceptions"},
  {id:"security",type:"security",expect:"sandbox policy remains enforced"},
 ]};
}
export function summarizeRuntimeTests(results=[]){
 const failed=results.filter(x=>x?.passed===false);return {passed:failed.length===0,total:results.length,failed:failed.length,failures:failed.map(x=>({id:x.id,error:String(x.error||"runtime-test-failed").slice(0,500)}))};
}
