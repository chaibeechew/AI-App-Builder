function finite(value,fallback=0){const n=Number(value);return Number.isFinite(n)?n:fallback;}
export function clamp(value,min,max){return Math.max(min,Math.min(max,finite(value,min)));}
export function vec3(x=0,y=0,z=0){return{x:finite(x),y:finite(y),z:finite(z)};}
export function add3(a,b){return vec3(a.x+b.x,a.y+b.y,a.z+b.z);}
export function sub3(a,b){return vec3(a.x-b.x,a.y-b.y,a.z-b.z);}
export function scale3(a,s){return vec3(a.x*s,a.y*s,a.z*s);}
export function length3(a){return Math.hypot(a.x,a.y,a.z);}
export function normalize3(a){const m=length3(a)||1;return scale3(a,1/m);}
export function dot3(a,b){return a.x*b.x+a.y*b.y+a.z*b.z;}
export function cross3(a,b){return vec3(a.y*b.z-a.z*b.y,a.z*b.x-a.x*b.z,a.x*b.y-a.y*b.x);}
export function degToRad(value){return finite(value)*Math.PI/180;}
export function radToDeg(value){return finite(value)*180/Math.PI;}

export function orientationBasis({yaw=0,pitch=0,roll=0}={}){
  const y=degToRad(yaw),p=degToRad(pitch),r=degToRad(roll);
  const forward=normalize3(vec3(Math.sin(y)*Math.cos(p),Math.sin(p),Math.cos(y)*Math.cos(p)));
  const worldUp=vec3(0,1,0);let right=normalize3(cross3(worldUp,forward));if(length3(right)<.01)right=vec3(1,0,0);
  let up=normalize3(cross3(forward,right));
  const cr=Math.cos(r),sr=Math.sin(r);const rolledRight=add3(scale3(right,cr),scale3(up,sr));const rolledUp=add3(scale3(up,cr),scale3(right,-sr));
  return{forward,right:normalize3(rolledRight),up:normalize3(rolledUp)};
}

export function createFlightBody({x=0,y=600,z=0,yaw=0,pitch=0,roll=0,speed=180,minSpeed=75,maxSpeed=420,health=100}={}){
  return{position:vec3(x,y,z),yaw,pitch,roll,speed,minSpeed,maxSpeed,verticalSpeed:0,throttle:.62,health,maxHealth:health,stalled:false,gLoad:1,energy:speed*speed*.5+9.81*y};
}

export function stepFlight3D(body,input={},dt=.016,model={}){
  const step=clamp(dt,.001,.05),next={...body,position:{...body.position}};
  const throttle=clamp(input.throttle??next.throttle,0,1),pitchInput=clamp(input.pitch??0,-1,1),rollInput=clamp(input.roll??0,-1,1),yawInput=clamp(input.yaw??0,-1,1);
  const pitchRate=finite(model.pitchRate,52),rollRate=finite(model.rollRate,95),yawRate=finite(model.yawRate,24),thrustAccel=finite(model.thrustAccel,48),dragBase=finite(model.dragBase,.00052),gravity=finite(model.gravity,9.81),stallSpeed=finite(model.stallSpeed,next.minSpeed),ceiling=finite(model.ceiling,16000);
  next.throttle=throttle;next.pitch=clamp(next.pitch+pitchInput*pitchRate*step,-82,82);next.roll=((next.roll+rollInput*rollRate*step+540)%360)-180;next.yaw=((next.yaw+(yawInput*yawRate+Math.sin(degToRad(next.roll))*Math.cos(degToRad(next.pitch))*32)*step+540)%360)-180;
  const anglePenalty=Math.abs(next.pitch)/90*.18+Math.abs(next.roll)/180*.08;const drag=dragBase*next.speed*next.speed*(1+anglePenalty);next.speed=clamp(next.speed+(throttle*thrustAccel-drag-gravity*Math.sin(degToRad(next.pitch))*.55)*step,next.minSpeed*.55,next.maxSpeed);
  next.stalled=next.speed<stallSpeed*(1+Math.max(0,Math.abs(next.pitch)-20)/150);if(next.stalled){next.pitch=Math.max(-28,next.pitch-34*step);next.roll*=Math.max(0,1-step*.8);next.speed=Math.max(next.minSpeed*.55,next.speed+gravity*1.8*step);}
  const basis=orientationBasis(next);const velocity=scale3(basis.forward,next.speed);next.position=add3(next.position,scale3(velocity,step));next.verticalSpeed=velocity.y;next.position.y=clamp(next.position.y,0,ceiling);if(next.position.y<=0){next.position.y=0;next.speed=Math.max(next.minSpeed*.55,next.speed*.985);}
  next.gLoad=clamp(1+Math.abs(rollInput)*1.7+Math.abs(pitchInput)*2.6,1,6);next.energy=next.speed*next.speed*.5+gravity*next.position.y;
  return next;
}

export function cameraFromFlight(body,{distance=55,height=16}={}){const basis=orientationBasis(body);return{position:add3(add3(body.position,scale3(basis.forward,-distance)),scale3(basis.up,height)),forward:basis.forward,right:basis.right,up:basis.up};}

export function projectWorldPoint(point,camera,{width=960,height=600,fov=72,near=.5}={}){
  const rel=sub3(point,camera.position),z=dot3(rel,camera.forward);if(z<=near)return null;const x=dot3(rel,camera.right),y=dot3(rel,camera.up),f=(width*.5)/Math.tan(degToRad(fov*.5));return{x:width*.5+x/z*f,y:height*.5-y/z*f,depth:z,scale:f/z,visible:true};
}

export function fixedStepAccumulator(accumulator,frameDelta,{step=1/60,maxSteps=4}={}){let value=Math.min(.2,Math.max(0,finite(accumulator)+Math.max(0,finite(frameDelta)))),steps=0;while(value>=step&&steps<maxSteps){value-=step;steps++;}return{remainder:value,steps,step};}

export const RUNTIME_3D_FOUNDATION=Object.freeze({version:"runtime-3d-foundation-v1",zeroCost:true,serverlessFunctionsAdded:0,systems:["3d-vectors","orientation-basis","flight-kinematics","stall-model","energy-model","fixed-timestep","perspective-projection","camera-follow","bounded-world","mobile-performance-budget"]});
