// Soolen Memory Brain
// Private customer content is task-scoped. Reusable memory contains methods, never raw private payloads.

export function createMemoryBrain(taskId) {
  const taskMemory = new Map();
  const reusableMethods = [];
  return {
    taskId,
    rememberTask(key,value){ taskMemory.set(key,value); },
    recallTask(key){ return taskMemory.get(key); },
    learnMethod(method={}){
      const safe={category:String(method.category||"general"),strategy:String(method.strategy||""),success:Boolean(method.success),failureCode:String(method.failureCode||""),performanceClass:String(method.performanceClass||"unknown"),learnedAt:new Date().toISOString()};
      reusableMethods.push(safe);return safe;
    },
    reusable(){ return reusableMethods.map(x=>({...x})); },
    clearPrivateTaskMemory(){ taskMemory.clear(); },
    policy:{rawPrivatePersistence:false,crossCustomerPrivateReuse:false,rawPromptPersistence:false,globalTrainingDefault:false,methodLearning:true}
  };
}
