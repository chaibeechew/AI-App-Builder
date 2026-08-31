export const GAME_QUALITY_TARGET=100;

export const GAME_QUALITY_DIMENSIONS=Object.freeze([
  {id:"gameplay",name:"Gameplay Loop",weight:10,checks:["playable","winLose","rewardReplay"]},
  {id:"controls",name:"Controls",weight:10,checks:["touch","drag","dpad","keyboardPreview","inputRecovery"]},
  {id:"physics",name:"Physics & Collision",weight:10,checks:["boundedDelta","worldBounds","collision","damageCooldown"]},
  {id:"progression",name:"Level & Progression",weight:10,checks:["levels","difficultyGrowth","levelGoal","victory"]},
  {id:"save",name:"Save & Recovery",weight:10,checks:["versionedSave","validation","autoSave","bestScore"]},
  {id:"feedback",name:"Audio & Haptics",weight:10,checks:["userControlledAudio","noForcedAutoplay","hapticsOptional","visualStatus"]},
  {id:"mobile",name:"iPhone & Android",weight:10,checks:["ios","android","safeAreas","responsive","largeTouchTargets"]},
  {id:"performance",name:"Performance",weight:10,checks:["targetFps","frameClamp","entityCap","reducedMotion"]},
  {id:"accessibility",name:"Accessibility",weight:10,checks:["reducedMotion","highContrast","keyboard","nonAudioFeedback"]},
  {id:"reliability",name:"Lifecycle & Reliability",weight:10,checks:["visibilityPause","blurPause","pageHideSave","deterministicSpawns"]},
]);

function bool(value){return value===true;}

function evidence(config={}){
  const systems=new Set(Array.isArray(config.systems)?config.systems:[]);
  const platforms=new Set(Array.isArray(config.platforms)?config.platforms:[]);
  return {
    gameplay:{playable:bool(config.playable),winLose:systems.has("win-lose-state"),rewardReplay:systems.has("reward-replay-loop")},
    controls:{touch:bool(config.controls?.touch),drag:bool(config.controls?.drag),dpad:bool(config.controls?.dpad),keyboardPreview:bool(config.controls?.keyboardPreview),inputRecovery:bool(config.controls?.inputRecovery)},
    physics:{boundedDelta:bool(config.performance?.boundedDelta),worldBounds:systems.has("world-bounds"),collision:systems.has("collision"),damageCooldown:systems.has("damage-cooldown")},
    progression:{levels:systems.has("level"),difficultyGrowth:Number(config.progression?.levelSpeedGrowth)>0,levelGoal:Number(config.progression?.collectiblesPerLevel)>0,victory:Number(config.progression?.maxLevel)>0},
    save:{versionedSave:Number(config.save?.version)>=1,validation:bool(config.save?.validateOnLoad),autoSave:bool(config.save?.autoSave),bestScore:bool(config.save?.bestScore)},
    feedback:{userControlledAudio:bool(config.audio?.userControlled),noForcedAutoplay:bool(config.safety?.noForcedAutoplayAudio),hapticsOptional:bool(config.haptics?.userControlled),visualStatus:bool(config.feedback?.visualStatus)},
    mobile:{ios:platforms.has("ios"),android:platforms.has("android"),safeAreas:bool(config.safety?.respectSafeAreas),responsive:systems.has("ios-android-responsive"),largeTouchTargets:bool(config.accessibility?.largeTouchTargets)},
    performance:{targetFps:Number(config.performance?.targetFps)>=60,frameClamp:Number(config.performance?.maxDeltaSeconds)>0,entityCap:Number(config.performance?.maxEnemies)>0,reducedMotion:bool(config.accessibility?.reducedMotion)},
    accessibility:{reducedMotion:bool(config.accessibility?.reducedMotion),highContrast:bool(config.accessibility?.highContrast),keyboard:bool(config.controls?.keyboardPreview),nonAudioFeedback:bool(config.accessibility?.nonAudioFeedback)},
    reliability:{visibilityPause:bool(config.lifecycle?.pauseOnVisibilityChange),blurPause:bool(config.lifecycle?.pauseOnBlur),pageHideSave:bool(config.lifecycle?.autoSaveOnPageHide),deterministicSpawns:bool(config.reliability?.deterministicSpawns)},
  };
}

export function evaluateGameQuality100(config={}){
  const ev=evidence(config);let score=0;const dimensions=GAME_QUALITY_DIMENSIONS.map(dimension=>{
    const checks=dimension.checks.map(check=>({check,passed:bool(ev?.[dimension.id]?.[check])}));
    const passed=checks.filter(item=>item.passed).length;
    const dimensionScore=Math.round(dimension.weight*(passed/checks.length));score+=dimensionScore;
    return {...dimension,score:dimensionScore,passed:passed===checks.length,checks};
  });
  score=Math.min(GAME_QUALITY_TARGET,score);
  const missing=dimensions.flatMap(d=>d.checks.filter(c=>!c.passed).map(c=>`${d.name}: ${c.check}`));
  return {target:GAME_QUALITY_TARGET,score,passed:score===GAME_QUALITY_TARGET&&missing.length===0,dimensions,missing};
}
