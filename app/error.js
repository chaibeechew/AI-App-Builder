"use client";

import Link from "next/link";

export default function AppError({ error, reset }) {
  const reference = String(error?.digest || "").slice(0, 80);
  return <main className="premiumRouteState" role="alert"><div className="stateScene error"><span>!</span><small>LANERIQ AI · SAFE RECOVERY</small><h1>This workspace needs another try</h1><p>Your saved projects and versions were not removed. Retry the current screen, or return to your project center.</p><div className="stateActions"><button type="button" onClick={() => reset()}>Try Again</button><Link href="/my-apps">My Projects</Link></div>{reference ? <code>Reference: {reference}</code> : null}</div></main>;
}
