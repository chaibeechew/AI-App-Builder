// Hardened executor boundary. A deployment adapter must supply an actual container/browser backend.
const BLOCKED_PACKAGES=["child_process","node:child_process","dockerode","ssh2","puppeteer-extra-plugin-stealth"];
export function dependencySecurity(spec={}){const text=JSON.stringify(spec);const blocked=BLOCKED_PACKAGES.filter(x=>text.includes(x));return {passed:blocked.length===0,blocked};}
export function productionGate({build,runtime,security,privacy}={}){const checks={build:build?.passed===true,runtime:runtime?.passed===true,security:security?.passed===true,privacy:privacy?.passed===true};return {passed:Object.values(checks).every(Boolean),checks,status:Object.values(checks).every(Boolean)?"ready-to-preview":"blocked"};}
export function createExecutor(backend){
 return {
  async build(ws){const dep=dependencySecurity(ws.specification);if(!dep.passed)return {passed:false,status:"dependency-blocked",errors:dep.blocked.map(x=>`blocked-package:${x}`)};if(typeof backend?.build!=="function")return {passed:null,status:"container-backend-not-connected",errors:["Container backend not connected"]};return backend.build(ws);},
  async test(ws,plan){if(typeof backend?.test!=="function")return {passed:null,status:"browser-backend-not-connected",errors:["Browser backend not connected"]};return backend.test(ws,plan);}
 };
}
