export function sanitizeMemoryJson(memory){
  const input=memory&&typeof memory==="object"&&!Array.isArray(memory)?memory:{};
  return {
    requestedName:String(input.requestedName||input.requested_name||"").slice(0,200),
    brandPreferences:input.brandPreferences&&typeof input.brandPreferences==="object"?input.brandPreferences:{},
    visualPreferences:(input.visualPreferences||input.visual_preferences)&&typeof (input.visualPreferences||input.visual_preferences)==="object"?(input.visualPreferences||input.visual_preferences):{},
    userPreferences:input.userPreferences&&typeof input.userPreferences==="object"?input.userPreferences:{},
    workflowPreferences:input.workflowPreferences&&typeof input.workflowPreferences==="object"?input.workflowPreferences:{},
    contentGuidance:String(input.contentGuidance||input.content_guidance||"").slice(0,6000),
    mediaPreferences:Array.isArray(input.mediaPreferences||input.media_preferences)?(input.mediaPreferences||input.media_preferences).slice(0,30):[],
    lastBuildAt:input.lastBuildAt||input.last_build_at||null,
    lastModificationAt:input.lastModificationAt||input.last_modification_at||null,
    lastModificationInstruction:String(input.lastModificationInstruction||input.last_modification_instruction||"").slice(0,1000),
    learnedFrom:Array.isArray(input.learnedFrom)?input.learnedFrom.slice(0,12):["customer instructions","approved project changes","customer-owned references"],
    rawPrivateAssetsReusableAcrossCustomers:false,
  };
}

export function mergeProjectMemory(current,patch={}){
  const base=sanitizeMemoryJson(current);
  const next=sanitizeMemoryJson({...base,...patch,
    brandPreferences:{...base.brandPreferences,...(patch.brandPreferences||{})},
    visualPreferences:{...base.visualPreferences,...(patch.visualPreferences||{})},
    userPreferences:{...base.userPreferences,...(patch.userPreferences||{})},
    workflowPreferences:{...base.workflowPreferences,...(patch.workflowPreferences||{})},
    mediaPreferences:Array.isArray(patch.mediaPreferences)?patch.mediaPreferences:base.mediaPreferences,
  });
  return next;
}

export function buildProjectMemoryBrief(memoryRow){
  if(!memoryRow)return "";
  const memory=sanitizeMemoryJson(memoryRow.memory_json||memoryRow);
  const rows=[];
  if(memory.requestedName)rows.push(`Preferred project name: ${memory.requestedName}`);
  if(Object.keys(memory.brandPreferences).length)rows.push(`Brand preferences: ${JSON.stringify(memory.brandPreferences)}`);
  if(Object.keys(memory.visualPreferences).length)rows.push(`Visual preferences: ${JSON.stringify(memory.visualPreferences)}`);
  if(Object.keys(memory.userPreferences).length)rows.push(`User preferences: ${JSON.stringify(memory.userPreferences)}`);
  if(Object.keys(memory.workflowPreferences).length)rows.push(`Workflow preferences: ${JSON.stringify(memory.workflowPreferences)}`);
  if(memory.contentGuidance)rows.push(`Content guidance: ${memory.contentGuidance}`);
  if(memory.lastModificationInstruction)rows.push(`Most recent approved modification: ${memory.lastModificationInstruction}`);
  if(memory.mediaPreferences.length)rows.push(`Existing media placement preferences: ${JSON.stringify(memory.mediaPreferences.slice(0,12))}`);
  if(!rows.length)return "";
  return `PROJECT MEMORY\n${rows.join("\n")}\nTreat these as project-specific preferences. They are not permission to reuse private assets across customers. Preserve them unless the customer's current instruction clearly overrides them.`;
}
