import Link from "next/link";

export default function NotFound() {
  return <main className="premiumRouteState"><div className="stateScene"><span>404</span><small>LANERIQ AI · SAFE ROUTING</small><h1>This page is not available</h1><p>The link may be old, private or incomplete. No project data was changed.</p><div className="stateActions"><Link href="/">Go Home</Link><Link href="/my-apps">My Projects</Link></div></div></main>;
}
