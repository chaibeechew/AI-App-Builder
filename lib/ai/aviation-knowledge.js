// SoolenAI Aviation + Air Combat Knowledge Core
// Public, non-classified knowledge for game creation and simulation design.
// It intentionally avoids weapon-construction instructions, classified performance,
// real-world attack procedures, or claims that external flight/multiplayer services are live.

const AIR_PATTERNS=[/air combat/i,/air.?to.?air/i,/dogfight/i,/fighter jet/i,/flight combat/i,/combat flight/i,/flight simulator/i,/aircraft game/i,/airplane game/i,/warplane/i,/jet fighter/i,/飞机战斗/,/飛機戰鬥/,/空战/,/空戰/,/战斗机游戏/,/戰鬥機遊戲/,/飞行游戏/,/飛行遊戲/,/飞机游戏/,/飛機遊戲/,/航空游戏/,/航空遊戲/];
function text(value){return String(value??"").trim();}
function hasAny(source,patterns){return patterns.some(pattern=>pattern.test(source));}
export function isAirCombatIdea(idea=""){return hasAny(text(idea),AIR_PATTERNS);}

export const AVIATION_ERAS=Object.freeze([
  {id:"pioneer",label:"Pioneer / Early Aviation",notes:"low-power piston aircraft, fabric/wood structures, basic instruments"},
  {id:"ww1",label:"World War I",notes:"biplanes, rotary/in-line piston engines, low-speed energy fighting"},
  {id:"interwar",label:"Interwar",notes:"rapid transition to metal monoplanes, retractable gear and higher performance"},
  {id:"ww2",label:"World War II",notes:"mature piston fighters, bombers, naval aviation and early jets"},
  {id:"early_jet",label:"Early Jet Age",notes:"straight/swept-wing jets, transonic limits, early radar and missiles"},
  {id:"cold_war",label:"Cold War",notes:"supersonic fighters, interceptors, strike aircraft, carrier aviation and radar networks"},
  {id:"modern",label:"Modern",notes:"multirole aircraft, digital flight controls, sensor fusion, networked warfare and low-observable design concepts"},
  {id:"future_fiction",label:"Original Future / Fictional",notes:"original aircraft only; preserve believable flight-system constraints and clear fictional labeling"},
]);

export const AIRCRAFT_ROLES=Object.freeze([
  "fighter","interceptor","multirole","strike","close-support","bomber","carrier-fighter","trainer","reconnaissance","electronic-warfare","airborne-early-warning","tanker","transport","maritime-patrol","utility","helicopter","tiltrotor","uav","civil-airliner","business-jet","general-aviation","cargo","experimental"
]);

// Seed catalog: public, high-level references only. No classified or precise combat-performance data.
// The architecture is intentionally extensible; SoolenAI should treat this as a representative catalog,
// not a claim that every aircraft ever built is embedded in one source file.
export const AIRCRAFT_CATALOG_SEED=Object.freeze([
  {id:"wright-flyer",name:"Wright Flyer",era:"pioneer",origin:"United States",role:"experimental",propulsion:"piston-prop",traits:["very-low-speed","early-control-system"]},
  {id:"sopwith-camel",name:"Sopwith Camel",era:"ww1",origin:"United Kingdom",role:"fighter",propulsion:"piston-prop",traits:["biplane","high-turn-response-for-era"]},
  {id:"fokker-dr1",name:"Fokker Dr.I",era:"ww1",origin:"Germany",role:"fighter",propulsion:"piston-prop",traits:["triplane","low-speed-maneuvering"]},
  {id:"spitfire",name:"Supermarine Spitfire",era:"ww2",origin:"United Kingdom",role:"fighter",propulsion:"piston-prop",traits:["elliptical-wing","energy-and-turn-fighting"]},
  {id:"bf109",name:"Messerschmitt Bf 109",era:"ww2",origin:"Germany",role:"fighter",propulsion:"piston-prop",traits:["compact-fighter","climb-and-energy-fighting"]},
  {id:"p51",name:"North American P-51 Mustang",era:"ww2",origin:"United States",role:"fighter",propulsion:"piston-prop",traits:["long-range-escort","high-speed-piston-fighter"]},
  {id:"f4u",name:"Vought F4U Corsair",era:"ww2",origin:"United States",role:"carrier-fighter",propulsion:"piston-prop",traits:["carrier-capable","high-power-prop"]},
  {id:"a6m-zero",name:"Mitsubishi A6M Zero",era:"ww2",origin:"Japan",role:"carrier-fighter",propulsion:"piston-prop",traits:["lightweight","low-speed-turning"]},
  {id:"p38",name:"Lockheed P-38 Lightning",era:"ww2",origin:"United States",role:"fighter",propulsion:"twin-piston-prop",traits:["twin-engine","high-altitude-capable-for-era"]},
  {id:"me262",name:"Messerschmitt Me 262",era:"ww2",origin:"Germany",role:"fighter",propulsion:"turbojet",traits:["early-jet","high-speed-for-era"]},
  {id:"f86",name:"North American F-86 Sabre",era:"early_jet",origin:"United States",role:"fighter",propulsion:"turbojet",traits:["swept-wing","transonic-era"]},
  {id:"mig15",name:"Mikoyan-Gurevich MiG-15",era:"early_jet",origin:"Soviet Union",role:"fighter",propulsion:"turbojet",traits:["swept-wing","high-climb-for-era"]},
  {id:"mig21",name:"Mikoyan-Gurevich MiG-21",era:"cold_war",origin:"Soviet Union",role:"interceptor",propulsion:"turbojet",traits:["delta-wing","lightweight-supersonic"]},
  {id:"f4-phantom",name:"McDonnell Douglas F-4 Phantom II",era:"cold_war",origin:"United States",role:"multirole",propulsion:"twin-turbojet",traits:["carrier-capable-variants","heavy-fighter"]},
  {id:"f14",name:"Grumman F-14 Tomcat",era:"cold_war",origin:"United States",role:"carrier-fighter",propulsion:"twin-turbofan",traits:["variable-sweep-wing","fleet-defense-role"]},
  {id:"f15",name:"McDonnell Douglas F-15 Eagle",era:"cold_war",origin:"United States",role:"fighter",propulsion:"twin-turbofan",traits:["air-superiority","high-thrust"]},
  {id:"f16",name:"General Dynamics F-16 Fighting Falcon",era:"modern",origin:"United States",role:"multirole",propulsion:"turbofan",traits:["fly-by-wire","single-engine-multirole"]},
  {id:"fa18",name:"Boeing F/A-18 Hornet / Super Hornet family",era:"modern",origin:"United States",role:"carrier-fighter",propulsion:"twin-turbofan",traits:["carrier-operations","multirole"]},
  {id:"f22",name:"Lockheed Martin F-22 Raptor",era:"modern",origin:"United States",role:"fighter",propulsion:"twin-turbofan",traits:["low-observable-concept","sensor-fusion-concept"]},
  {id:"f35",name:"Lockheed Martin F-35 family",era:"modern",origin:"United States",role:"multirole",propulsion:"turbofan",traits:["sensor-fusion-concept","multiple-variant-concept"]},
  {id:"a10",name:"Fairchild Republic A-10 Thunderbolt II",era:"cold_war",origin:"United States",role:"close-support",propulsion:"twin-turbofan",traits:["low-speed-control","survivability-focused-design"]},
  {id:"b52",name:"Boeing B-52 Stratofortress",era:"cold_war",origin:"United States",role:"bomber",propulsion:"multi-turbojet-turbofan-family",traits:["long-range","large-airframe"]},
  {id:"b2",name:"Northrop Grumman B-2 Spirit",era:"modern",origin:"United States",role:"bomber",propulsion:"turbofan",traits:["flying-wing","low-observable-concept"]},
  {id:"su27",name:"Sukhoi Su-27 family",era:"modern",origin:"Soviet Union / Russia",role:"fighter",propulsion:"twin-turbofan",traits:["large-fighter","high-maneuverability-concept"]},
  {id:"su30",name:"Sukhoi Su-30 family",era:"modern",origin:"Russia",role:"multirole",propulsion:"twin-turbofan",traits:["multirole","long-range-fighter-family"]},
  {id:"su35",name:"Sukhoi Su-35 family",era:"modern",origin:"Russia",role:"fighter",propulsion:"twin-turbofan",traits:["advanced-flanker-family","high-maneuverability-concept"]},
  {id:"mig29",name:"Mikoyan MiG-29 family",era:"modern",origin:"Soviet Union / Russia",role:"fighter",propulsion:"twin-turbofan",traits:["light-medium-fighter","high-agility-concept"]},
  {id:"rafale",name:"Dassault Rafale",era:"modern",origin:"France",role:"multirole",propulsion:"twin-turbofan",traits:["delta-canard","carrier-variant-exists"]},
  {id:"typhoon",name:"Eurofighter Typhoon",era:"modern",origin:"European consortium",role:"multirole",propulsion:"twin-turbofan",traits:["delta-canard","air-superiority-multirole"]},
  {id:"gripen",name:"Saab JAS 39 Gripen family",era:"modern",origin:"Sweden",role:"multirole",propulsion:"turbofan",traits:["delta-canard","dispersed-operations-concept"]},
  {id:"mirage2000",name:"Dassault Mirage 2000",era:"modern",origin:"France",role:"multirole",propulsion:"turbofan",traits:["delta-wing","single-engine"]},
  {id:"tornado",name:"Panavia Tornado",era:"cold_war",origin:"European consortium",role:"strike",propulsion:"twin-turbofan",traits:["variable-sweep-wing","low-level-strike-concept"]},
  {id:"harrier",name:"Harrier family",era:"cold_war",origin:"United Kingdom / United States",role:"strike",propulsion:"vectored-thrust-turbofan",traits:["vstol-concept","ship-capable-variants"]},
  {id:"j10",name:"Chengdu J-10 family",era:"modern",origin:"China",role:"multirole",propulsion:"turbofan",traits:["delta-canard","single-engine"]},
  {id:"j20",name:"Chengdu J-20",era:"modern",origin:"China",role:"fighter",propulsion:"twin-turbofan",traits:["low-observable-concept","long-range-fighter-concept"]},
  {id:"jf17",name:"JF-17 Thunder",era:"modern",origin:"Pakistan / China",role:"multirole",propulsion:"turbofan",traits:["lightweight-multirole","single-engine"]},
  {id:"tejas",name:"HAL Tejas family",era:"modern",origin:"India",role:"multirole",propulsion:"turbofan",traits:["lightweight","delta-wing"]},
  {id:"kf21",name:"KAI KF-21 Boramae",era:"modern",origin:"South Korea",role:"multirole",propulsion:"twin-turbofan",traits:["modern-multirole","digital-avionics-concept"]},
  {id:"c130",name:"Lockheed C-130 Hercules family",era:"cold_war",origin:"United States",role:"transport",propulsion:"turboprop",traits:["tactical-transport","rough-field-capability-concept"]},
  {id:"c17",name:"Boeing C-17 Globemaster III",era:"modern",origin:"United States",role:"transport",propulsion:"turbofan",traits:["strategic-tactical-transport","large-cargo"]},
  {id:"e3",name:"Boeing E-3 Sentry",era:"cold_war",origin:"United States",role:"airborne-early-warning",propulsion:"turbofan",traits:["airborne-radar-role","battle-management-role"]},
  {id:"kc135",name:"Boeing KC-135 Stratotanker",era:"cold_war",origin:"United States",role:"tanker",propulsion:"turbojet-turbofan-family",traits:["aerial-refueling-role","large-airframe"]},
  {id:"tu95",name:"Tupolev Tu-95",era:"cold_war",origin:"Soviet Union / Russia",role:"bomber",propulsion:"turboprop",traits:["long-range","contra-rotating-propellers"]},
  {id:"tu160",name:"Tupolev Tu-160",era:"modern",origin:"Soviet Union / Russia",role:"bomber",propulsion:"turbofan",traits:["variable-sweep-wing","large-supersonic-bomber-concept"]},
  {id:"ah64",name:"Boeing AH-64 Apache family",era:"modern",origin:"United States",role:"helicopter",propulsion:"turboshaft",traits:["attack-helicopter","rotorcraft-flight-model"]},
  {id:"uh60",name:"Sikorsky UH-60 Black Hawk family",era:"modern",origin:"United States",role:"helicopter",propulsion:"turboshaft",traits:["utility-helicopter","rotorcraft-flight-model"]},
  {id:"v22",name:"Bell Boeing V-22 Osprey",era:"modern",origin:"United States",role:"tiltrotor",propulsion:"turboshaft-tiltrotor",traits:["vertical-to-forward-flight-transition","tiltrotor"]},
  {id:"mq9",name:"General Atomics MQ-9 family",era:"modern",origin:"United States",role:"uav",propulsion:"turboprop",traits:["remotely-piloted","long-endurance-concept"]},
  {id:"cessna172",name:"Cessna 172",era:"modern",origin:"United States",role:"general-aviation",propulsion:"piston-prop",traits:["trainer","stable-general-aviation"]},
  {id:"b737",name:"Boeing 737 family",era:"modern",origin:"United States",role:"civil-airliner",propulsion:"turbofan",traits:["narrow-body","commercial-airliner"]},
  {id:"b747",name:"Boeing 747 family",era:"modern",origin:"United States",role:"civil-airliner",propulsion:"four-turbofan",traits:["wide-body","large-airliner"]},
  {id:"b787",name:"Boeing 787 Dreamliner",era:"modern",origin:"United States",role:"civil-airliner",propulsion:"twin-turbofan",traits:["wide-body","composite-airframe-concept"]},
  {id:"a320",name:"Airbus A320 family",era:"modern",origin:"Europe",role:"civil-airliner",propulsion:"twin-turbofan",traits:["narrow-body","fly-by-wire-commercial-airliner"]},
  {id:"a350",name:"Airbus A350 family",era:"modern",origin:"Europe",role:"civil-airliner",propulsion:"twin-turbofan",traits:["wide-body","long-range-airliner"]},
  {id:"a380",name:"Airbus A380",era:"modern",origin:"Europe",role:"civil-airliner",propulsion:"four-turbofan",traits:["very-large-airliner","double-deck"]},
]);

export function searchAircraftKnowledge(query=""){const q=text(query).toLowerCase();if(!q)return AIRCRAFT_CATALOG_SEED.slice();return AIRCRAFT_CATALOG_SEED.filter(item=>[item.id,item.name,item.era,item.origin,item.role,item.propulsion,...item.traits].join(" ").toLowerCase().includes(q));}

export function buildAviationCapabilityPlan(idea=""){
  const source=text(idea);if(!isAirCombatIdea(source))return{matched:false,archetype:null,brief:""};
  const wantsWw2=/ww2|world war ii|二战|二戰/i.test(source),wantsModern=/modern|jet fighter|现代|現代|f-?16|f-?15|f-?35|su-?27|rafale|typhoon|j-?10|j-?20/i.test(source),wantsCarrier=/carrier|aircraft carrier|航母|航空母舰|航空母艦/i.test(source),wantsHelicopter=/helicopter|rotorcraft|直升机|直升機/i.test(source),wantsDrone=/drone|uav|无人机|無人機/i.test(source),wantsSim=/simulator|simulation|realistic|hardcore|模拟|模擬|拟真|擬真/i.test(source),wantsMultiplayer=/multiplayer|pvp|co.?op|多人|联机|聯機/i.test(source);
  const knowledge={
    physics:["lift/drag/thrust/weight balance","angle of attack and stall behavior","induced/parasitic drag tradeoffs","energy management using speed and altitude","turn rate versus turn radius","climb/descent and glide behavior","air-density/altitude effects","transonic/compressibility concepts","G-load and structural/physiological gameplay limits","control-surface response","flaps/gear/airbrake effects","ground effect and runway behavior","propeller torque/P-factor concepts where relevant","rotorcraft lift/translation concepts where relevant"],
    aircraft:["piston-prop","turboprop","turbojet","low/high-bypass turbofan","turboshaft/rotorcraft","tiltrotor","fixed-wing UAV","glider/general-aviation","carrier-capable aircraft","civil airliners and transports","trainers and experimental aircraft"],
    avionics:["flight instruments and HUD abstraction","radar/infrared/electro-optical sensor abstractions","warning-receiver abstraction","navigation and waypoint systems","datalink/team-picture abstraction","electronic-countermeasure game states","sensor quality, field-of-view and update-rate tradeoffs"],
    combat:["cannon/gun game abstraction","generic short/medium/long-range guided-weapon classes without real classified performance","generic air-to-ground guided/unguided gameplay classes","countermeasure timing as a game system","lock/track/launch-envelope abstraction","line-of-sight and aspect concepts","damage ownership and scoring","rules-of-engagement as mission/game constraints, not real-world attack guidance"],
    damage:["airframe integrity","engine damage","fuel-system damage","control-surface damage","hydraulic/electrical degradation","sensor/radar degradation","landing-gear damage","fire/smoke states","pilot/crew survival abstraction","repair/rearm/refuel game loops"],
    environment:["terrain height","sea surface","runways and taxiways","carrier deck abstraction","cloud layers","visibility","wind","crosswind","turbulence","rain/snow","day/night","sun glare","icing as optional simulation rule","temperature/density-altitude gameplay"],
    missions:["training","patrol","intercept","escort","air-superiority","defensive counter-air","strike","close-support abstraction","reconnaissance","rescue/support","transport","airborne-early-warning support","tanker support","carrier launch/recovery","formation/navigation challenge"],
    ai:["takeoff/taxi/launch state machine","formation keeping","patrol and waypoint navigation","intercept geometry at a high level","engage/disengage decisions","energy-aware dogfight behavior","threat scoring","missile/gun evasion as game AI","damage-aware retreat","return-to-base","approach/landing/recovery","wingman commands","difficulty presets","deterministic replay tests"],
    controls:["arcade mode","simulation-assisted mode","advanced-sim mode","touch virtual stick","throttle slider","rudder assist","gyro-look option","camera/target controls","context-sensitive landing controls","gamepad/keyboard preview","accessibility sensitivity/dead-zone settings"],
    progression:["aircraft unlock tree","era/role-based progression","pilot skill progression","mission medals","cosmetic livery system","loadout presets","maintenance/upgrades as fictional or clearly game-balanced systems","difficulty/campaign chapters"],
    performance:["60fps mobile target where feasible","LOD and draw-distance budgets","terrain chunk streaming","bounded AI aircraft count","pooled projectiles/effects","cloud/weather quality levels","cockpit versus external-view budgets","thermal/battery-aware graphics scaling"],
    multiplayer:["authoritative server requirement for competitive PvP","fixed simulation tick","input validation","snapshot interpolation","prediction/reconciliation where safe","lag compensation bounded by server truth","anti-cheat validation","reconnect/state resync","spectator/replay readiness"],
    safety:["use public non-classified aircraft knowledge only","do not invent or expose classified performance","do not provide weapon-construction instructions","do not encode real attack procedures","real aircraft names are references; generated art/liveries should be original and trademark-aware","fictional balance values must be labeled as game values"],
  };
  const era=wantsWw2?"ww2":wantsModern?"modern":"mixed";
  const rows=[
    "SOOLENAI AVIATION / AIR COMBAT ENGINEERING MODE:",
    `Scope: ${era==="ww2"?"World War II aviation":era==="modern"?"modern jet aviation":"mixed-era aviation knowledge"}. ${wantsSim?"Simulation depth requested; expose realism assists and difficulty layers.":"Default to accessible flight controls with optional deeper simulation assists."}` ,
    `Flight physics: ${knowledge.physics.join("; ")}.`,
    `Aircraft taxonomy: ${knowledge.aircraft.join("; ")}.`,
    `Avionics/sensors: ${knowledge.avionics.join("; ")}.`,
    `Air-combat game systems: ${knowledge.combat.join("; ")}.`,
    `Damage/survivability: ${knowledge.damage.join("; ")}.`,
    `World/weather/airfield systems: ${knowledge.environment.join("; ")}.`,
    `Mission families: ${knowledge.missions.join("; ")}.`,
    `AI pilot systems: ${knowledge.ai.join("; ")}.`,
    `Mobile controls: ${knowledge.controls.join("; ")}.`,
    `Progression: ${knowledge.progression.join("; ")}.`,
    `Performance: ${knowledge.performance.join("; ")}.`,
    wantsCarrier?"Carrier operations requested: add deck spawn, launch, approach, landing-area safety, arrest/recovery abstraction and ship motion/weather effects without real operational procedures.":"Carrier operations are optional unless requested.",
    wantsHelicopter?"Rotorcraft requested: use a dedicated rotorcraft flight model rather than treating a helicopter like a fixed-wing aircraft.":"Rotorcraft model is available when requested.",
    wantsDrone?"UAV requested: add remote-sensor/control-link gameplay, endurance and link-loss recovery as fictionalized game systems.":"UAV systems are optional unless requested.",
    wantsMultiplayer?`Competitive multiplayer requested: ${knowledge.multiplayer.join("; ")}. Never claim live online flight combat without verified server evidence.`:"Multiplayer remains integration-ready and off until explicitly requested/verified.",
    `Knowledge catalog seed includes ${AIRCRAFT_CATALOG_SEED.length} representative public aircraft references across pioneer, WWI, WWII, early jet, Cold War, modern, rotorcraft, transport and civil aviation; architecture must remain extensible rather than pretending this finite seed equals every aircraft ever built.`,
    "For real aircraft, use public high-level characteristics to shape game feel. Never hard-code classified or unverified combat data. When exact public figures are not verified, use normalized game attributes such as speed class, climb class, agility class, endurance class and sensor class instead of pretending precision.",
  ];
  return{matched:true,archetype:"air_combat",genre:"Air Combat / Flight",dimensions:"3d-capable",era,carrier:wantsCarrier,rotorcraft:wantsHelicopter,uav:wantsDrone,simulation:wantsSim,multiplayer:wantsMultiplayer,knowledge,catalogSeed:AIRCRAFT_CATALOG_SEED,brief:rows.join("\n")};
}
