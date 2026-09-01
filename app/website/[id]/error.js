"use client";

export default function WebsiteError({reset}){
  return <main className="premiumRouteState"><div className="stateScene error"><span>!</span><small>SAFE RECOVERY</small><h1>The Website did not open</h1><p>Please try again. The project and its current version remain unchanged.</p><button onClick={()=>reset()}>Try Website Again</button></div></main>;
}
