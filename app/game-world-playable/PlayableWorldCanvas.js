"use client";

import {useEffect,useRef,useState} from "react";

function mul(a,b){const o=new Float32Array(16);for(let r=0;r<4;r++)for(let c=0;c<4;c++)o[c*4+r]=a[0*4+r]*b[c*4+0]+a[1*4+r]*b[c*4+1]+a[2*4+r]*b[c*4+2]+a[3*4+r]*b[c*4+3];return o;}
function perspective(fov,aspect,near,far){const f=1/Math.tan(fov/2),nf=1/(near-far);return new Float32Array([f/aspect,0,0,0,0,f,0,0,0,0,(far+near)*nf,-1,0,0,2*far*near*nf,0]);}
function lookAt(eye,center,up=[0,1,0]){let zx=eye[0]-center[0],zy=eye[1]-center[1],zz=eye[2]-center[2];let l=Math.hypot(zx,zy,zz)||1;zx/=l;zy/=l;zz/=l;let xx=up[1]*zz-up[2]*zy,xy=up[2]*zx-up[0]*zz,xz=up[0]*zy-up[1]*zx;l=Math.hypot(xx,xy,xz)||1;xx/=l;xy/=l;xz/=l;const yx=zy*xz-zz*xy,yy=zz*xx-zx*xz,yz=zx*xy-zy*xx;return new Float32Array([xx,yx,zx,0,xy,yy,zy,0,xz,yz,zz,0,-(xx*eye[0]+xy*eye[1]+xz*eye[2]),-(yx*eye[0]+yy*eye[1]+yz*eye[2]),-(zx*eye[0]+zy*eye[1]+zz*eye[2]),1]);}
function shader(gl,type,source){const s=gl.createShader(type);gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(s)||"shader compile failed");return s;}
function program(gl){const vs=shader(gl,gl.VERTEX_SHADER,`attribute vec3 aPosition;attribute vec3 aColor;uniform mat4 uVP;varying vec3 vColor;void main(){vColor=aColor;gl_Position=uVP*vec4(aPosition,1.0);}`);const fs=shader(gl,gl.FRAGMENT_SHADER,`precision mediump float;varying vec3 vColor;void main(){float fog=clamp(gl_FragCoord.z,0.0,1.0);gl_FragColor=vec4(vColor*(1.0-fog*0.28),1.0);}`);const p=gl.createProgram();gl.attachShader(p,vs);gl.attachShader(p,fs);gl.linkProgram(p);if(!gl.getProgramParameter(p,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(p)||"program link failed");return p;}
function heightAt(x,z,seed){const s=(Number(seed)||1)%997;return Math.sin((x+s)*.028)*5+Math.cos((z-s)*.024)*4+Math.sin((x+z+s)*.013)*2;}
function chunkGeometry(chunk){const out=[],grid=chunk.grid,size=chunk.size,step=size/grid,x0=chunk.center[0]-size/2,z0=chunk.center[2]-size/2;const push=(x,z)=>{const y=heightAt(x,z,chunk.heightSeed);const slope=Math.min(1,Math.abs(y)/12),r=.10+.18*slope,g=.34+.32*(1-slope),b=.22+.18*(1-slope);out.push(x,y,z,r,g,b);};for(let z=0;z<grid;z++)for(let x=0;x<grid;x++){const ax=x0+x*step,bx=ax+step,az=z0+z*step,bz=az+step;push(ax,az);push(bx,az);push(ax,bz);push(bx,az);push(bx,bz);push(ax,bz);}return new Float32Array(out);}
function poiGeometry(pois){const out=[];for(const poi of pois||[]){const [x,y,z]=poi.position||[0,2,0],s=2.2,h=7;const c=[.88,.64,.20];const v=[[x,y+h,z],[x-s,y,z-s],[x+s,y,z-s],[x+s,y,z+s],[x-s,y,z+s]];for(const [a,b,d] of [[0,1,2],[0,2,3],[0,3,4],[0,4,1],[1,4,3],[1,3,2]])for(const i of [a,b,d])out.push(...v[i],...c);}return new Float32Array(out);}
function makeBuffer(gl,data){const b=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,b);gl.bufferData(gl.ARRAY_BUFFER,data,gl.STATIC_DRAW);return{buffer:b,count:data.length/6};}

export default function PlayableWorldCanvas({runtime}){
  const ref=useRef(null),state=useRef({keys:new Set(),drag:false,lastX:0,lastY:0,yaw:Math.PI,pitch:-.16,pos:[0,14,34]});
  const [status,setStatus]=useState({api:"starting",fps:0,resident:0,error:""});
  useEffect(()=>{
    const canvas=ref.current;if(!canvas)return;
    const gl=canvas.getContext("webgl2",{antialias:true,powerPreference:"high-performance"})||canvas.getContext("webgl",{antialias:true,powerPreference:"high-performance"});
    if(!gl){setStatus({api:"unavailable",fps:0,resident:0,error:"WebGL unavailable on this device"});return;}
    let p;try{p=program(gl);}catch(e){setStatus({api:"shader-error",fps:0,resident:0,error:String(e.message||e)});return;}
    const posLoc=gl.getAttribLocation(p,"aPosition"),colorLoc=gl.getAttribLocation(p,"aColor"),vpLoc=gl.getUniformLocation(p,"uVP");
    const chunkBuffers=(runtime.terrain?.chunks||[]).map(c=>({...c,gpu:makeBuffer(gl,chunkGeometry(c))}));
    const poi=makeBuffer(gl,poiGeometry(runtime.poi));
    gl.enable(gl.DEPTH_TEST);gl.enable(gl.CULL_FACE);gl.clearColor(.025,.045,.065,1);
    state.current.pos=[...(runtime.spawn?.position||[0,14,34])];state.current.yaw=Number(runtime.spawn?.yaw??Math.PI);
    const onKeyDown=e=>{state.current.keys.add(e.key.toLowerCase());if(["arrowup","arrowdown","arrowleft","arrowright"," "].includes(e.key.toLowerCase()))e.preventDefault();};
    const onKeyUp=e=>state.current.keys.delete(e.key.toLowerCase());
    const onDown=e=>{state.current.drag=true;state.current.lastX=e.clientX;state.current.lastY=e.clientY;};
    const onMove=e=>{if(!state.current.drag)return;const dx=e.clientX-state.current.lastX,dy=e.clientY-state.current.lastY;state.current.lastX=e.clientX;state.current.lastY=e.clientY;state.current.yaw-=dx*.005;state.current.pitch=Math.max(-1.1,Math.min(.55,state.current.pitch-dy*.004));};
    const onUp=()=>state.current.drag=false;
    window.addEventListener("keydown",onKeyDown,{passive:false});window.addEventListener("keyup",onKeyUp);canvas.addEventListener("pointerdown",onDown);window.addEventListener("pointermove",onMove);window.addEventListener("pointerup",onUp);
    let raf=0,last=performance.now(),frames=0,fpsClock=last;
    const bind=(buf)=>{gl.bindBuffer(gl.ARRAY_BUFFER,buf.buffer);gl.enableVertexAttribArray(posLoc);gl.vertexAttribPointer(posLoc,3,gl.FLOAT,false,24,0);gl.enableVertexAttribArray(colorLoc);gl.vertexAttribPointer(colorLoc,3,gl.FLOAT,false,24,12);};
    const loop=now=>{
      const dt=Math.min(.05,(now-last)/1000);last=now;const s=state.current,k=s.keys,speed=(k.has("shift")?34:18)*dt;const fx=Math.sin(s.yaw),fz=-Math.cos(s.yaw),rx=Math.cos(s.yaw),rz=Math.sin(s.yaw);let forward=0,side=0;if(k.has("w")||k.has("arrowup"))forward+=1;if(k.has("s")||k.has("arrowdown"))forward-=1;if(k.has("d")||k.has("arrowright"))side+=1;if(k.has("a")||k.has("arrowleft"))side-=1;s.pos[0]+=(fx*forward+rx*side)*speed;s.pos[2]+=(fz*forward+rz*side)*speed;s.pos[1]=Math.max(7,heightAt(s.pos[0],s.pos[2],runtime.terrain?.chunks?.[0]?.heightSeed||1)+8);
      const dpr=Math.min(2,window.devicePixelRatio||1),w=Math.max(1,Math.floor(canvas.clientWidth*dpr)),h=Math.max(1,Math.floor(canvas.clientHeight*dpr));if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;}gl.viewport(0,0,w,h);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);gl.useProgram(p);
      const dir=[Math.sin(s.yaw)*Math.cos(s.pitch),Math.sin(s.pitch),-Math.cos(s.yaw)*Math.cos(s.pitch)],center=[s.pos[0]+dir[0],s.pos[1]+dir[1],s.pos[2]+dir[2]],vp=mul(perspective(Math.PI/3,w/h,.1,900),lookAt(s.pos,center));gl.uniformMatrix4fv(vpLoc,false,vp);
      let resident=0;for(const c of chunkBuffers){const dist=Math.hypot(s.pos[0]-c.center[0],s.pos[2]-c.center[2]);if(dist>runtime.terrain.profile.chunkMeters*2.2)continue;resident++;bind(c.gpu);gl.drawArrays(gl.TRIANGLES,0,c.gpu.count);}bind(poi);gl.drawArrays(gl.TRIANGLES,0,poi.count);
      frames++;if(now-fpsClock>700){setStatus({api:gl instanceof WebGL2RenderingContext?"WebGL2 LIVE":"WebGL1 LIVE",fps:Math.round(frames*1000/(now-fpsClock)),resident,error:""});frames=0;fpsClock=now;}raf=requestAnimationFrame(loop);
    };
    raf=requestAnimationFrame(loop);
    return()=>{cancelAnimationFrame(raf);window.removeEventListener("keydown",onKeyDown);window.removeEventListener("keyup",onKeyUp);canvas.removeEventListener("pointerdown",onDown);window.removeEventListener("pointermove",onMove);window.removeEventListener("pointerup",onUp);for(const c of chunkBuffers)gl.deleteBuffer(c.gpu.buffer);gl.deleteBuffer(poi.buffer);gl.deleteProgram(p);};
  },[runtime]);
  return <div className="playableWorldRuntime"><canvas ref={ref} aria-label="LANERIQ playable 3D world" tabIndex={0}/><div className="runtimeHud"><b>{status.api}</b><span>{status.fps?`${status.fps} FPS`:"GPU probe"}</span><span>{status.resident} chunks resident</span><small>WASD / arrows · drag to look · Shift sprint</small>{status.error?<em>{status.error}</em>:null}</div></div>;
}
