const clamp=value=>Math.max(0,Math.min(100,Math.round(Number(value)||0)));
const average=(...values)=>clamp(values.reduce((sum,value)=>sum+(Number(value)||0),0)/Math.max(1,values.length));
const textOf=value=>JSON.stringify(value||{}).toLowerCase();

function dimensions(report={}){return Object.fromEntries((Array.isArray(report?.dimensions)?report.dimensions:[]).map(item=>[item.id,clamp(item.score)]));}

export function buildProjectReadiness({specification={},qualityReport={},releaseReady=false,dataGroups=0,workflowCount=0,publishStatus="draft"}={}){
  const scores=dimensions(qualityReport);const specText=textOf(specification);
  const dataIntent=(specification?.data&&Object.keys(specification.data||{}).length>0)||(Array.isArray(specification?.dataModels)&&specification.dataModels.length>0)||/lead|customer|client|record|database|crm|booking|appointment|order|form|inventory|property|listing/.test(specText);
  const automationIntent=/automation|workflow|send_email|send_sms|send_whatsapp|whatsapp|notify|notification|calendar|follow.?up|reminder/.test(specText);
  const design=average(scores.beauty??qualityReport.overall??0,scores.naturalness??qualityReport.overall??0);
  const security=average(scores.security??qualityReport.overall??0,scores.privacy??qualityReport.overall??0);
  const mobile=average(scores.comfort??qualityReport.overall??0,scores.stability??qualityReport.overall??0);
  const data=dataIntent?(Number(dataGroups)>0?100:Math.min(88,clamp(qualityReport.overall||0))):100;
  const automation=automationIntent?(Number(workflowCount)>0?100:Math.min(86,clamp(qualityReport.overall||0))):100;
  const publishing=releaseReady?100:clamp(qualityReport.overall||0);
  const areas=[
    {id:"design",label:"Design",score:design,ready:design>=100,note:design>=100?"Design quality gate ready.":"Visual quality can still be improved."},
    {id:"data",label:"Data",score:data,ready:data>=100,note:!dataIntent?"No data backend is required by the current specification.":Number(dataGroups)>0?"Project data model is connected.":"The specification expects business data but no backend data group is connected yet."},
    {id:"security",label:"Security",score:security,ready:security>=100,note:security>=100?"Specification security and privacy checks are ready.":"Security or privacy quality still needs attention."},
    {id:"mobile",label:"Mobile",score:mobile,ready:mobile>=100,note:mobile>=100?"Mobile usability gate is ready.":"Mobile comfort or stability still needs improvement."},
    {id:"automation",label:"Automation",score:automation,ready:automation>=100,note:!automationIntent?"No automation is required by the current specification.":Number(workflowCount)>0?"At least one enabled automation is connected.":"The project expects automated actions but no enabled workflow is connected yet."},
    {id:"publishing",label:"Publishing",score:publishing,ready:publishing>=100,note:releaseReady?"Internal release gate is ready.":"Internal release quality still needs work before publishing."},
  ];
  const blockers=areas.filter(area=>!area.ready);
  const fixInstruction=[
    "FIX EVERYTHING MODE: Review the whole saved App + Website and improve every verified weak area without removing working features, customer data, ownership protections, permissions, brand identity or version history.",
    blockers.length?`Focus on these current Project Readiness areas: ${blockers.map(area=>`${area.label} ${area.score}/100`).join(", ")}.`:"Re-check the complete project and make only evidence-based improvements.",
    dataIntent&&Number(dataGroups)===0?"The specification expects business data. Preserve the intended data model and prepare the project for its owner-scoped backend instead of faking stored records.":"",
    automationIntent&&Number(workflowCount)===0?"The specification expects automation. Prepare safe workflow logic and Safe Test behavior; never claim external messages or calendar actions were sent without runtime evidence.":"",
    "Run project self-check/self-heal after the edit. Keep the previous known-good version available if validation fails. Do not mark real providers, store submission, payment, email, WhatsApp, SMS, video rendering or real-device testing complete without live evidence."
  ].filter(Boolean).join("\n");
  return {overall:average(...areas.map(area=>area.score)),areas,blockers,fixInstruction,productionEvidenceRequired:true,publishStatus};
}
