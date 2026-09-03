const SECRET_KEY=/(password|passwd|secret|token|api[_-]?key|credential|private[_-]?key|auth[_-]?key)/i;
const MAX_DEPTH=6,MAX_KEYS=48,MAX_STRING=6000,MAX_ARRAY=40;
function plain(v){return v&&typeof v==="object"&&!Array.isArray(v)?v:{};}
function clean(v,depth=0){
  if(depth>MAX_DEPTH)return undefined;
  if(typeof v==="string")return v.trim().slice(0,MAX_STRING);
  if(typeof v==="boolean")return v;
  if(typeof v==="number"&&Number.isFinite(v))return v;
  if(Array.isArray(v))return v.slice(0,MAX_ARRAY).map(x=>clean(x,depth+1)).filter(x=>x!==undefined);
  if(v&&typeof v==="object"){
    const out={};
    for(const [rawKey,rawValue] of Object.entries(v).slice(0,MAX_KEYS)){
      const key=String(rawKey).trim().slice(0,100).replace(/[^a-zA-Z0-9_ -]/g,"");
      if(!key||SECRET_KEY.test(key))continue;
      const value=clean(rawValue,depth+1);if(value!==undefined)out[key]=value;
    }
    return out;
  }
  return undefined;
}
function merge(base,patch){
  const a=plain(clean(base)||{}),b=plain(clean(patch)||{}),out={...a};
  for(const [k,v] of Object.entries(b)){
    if(v&&typeof v==="object"&&!Array.isArray(v)&&a[k]&&typeof a[k]==="object"&&!Array.isArray(a[k]))out[k]={...a[k],...v};
    else out[k]=v;
  }
  out.rawPrivateAssetsReusableAcrossCustomers=false;
  return clean(out)||{};
}
module.exports={sanitizeMemory:value=>{const out=clean(value)||{};out.rawPrivateAssetsReusableAcrossCustomers=false;return out;},mergeMemory:merge};
