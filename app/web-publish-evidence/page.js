import WebPublishEvidenceClient from "./WebPublishEvidenceClient.js";

export const metadata = {
  title: "Web Publish Evidence — LANERIQ AI",
  description: "Authenticated publish, anonymous public-route and automatic cleanup evidence for LANERIQ AI projects.",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

const COMMIT_SHA=/^[0-9a-f]{40}$/i;

function productionBuildIdentity(){
  const commitSha=String(process.env.VERCEL_GIT_COMMIT_SHA||"").trim();
  const commitRef=String(process.env.VERCEL_GIT_COMMIT_REF||"").trim();
  const environment=String(process.env.VERCEL_ENV||"").trim().toLowerCase();
  const exactProductionBuildVerified=environment==="production"&&commitRef==="main"&&COMMIT_SHA.test(commitSha);
  return Object.freeze({commitSha,commitRef,environment,exactProductionBuildVerified});
}

export default function WebPublishEvidencePage() {
  const build=productionBuildIdentity();
  if(!build.exactProductionBuildVerified){
    return <main style={{minHeight:"100svh",padding:"48px 20px",background:"#03100d",color:"#f5fff9",fontFamily:"Inter,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif"}}>
      <div style={{maxWidth:760,margin:"0 auto",padding:24,border:"1px solid #ffffff1f",borderRadius:22,background:"#071914"}}>
        <p style={{color:"#d8bf62",fontWeight:900,letterSpacing:".14em",fontSize:12}}>LANERIQ AI · TRUTH GATE</p>
        <h1 style={{fontSize:"clamp(30px,7vw,48px)",margin:"10px 0"}}>Production evidence is locked</h1>
        <p style={{lineHeight:1.65,color:"#b7c9c0"}}>Web Publish LIVE evidence may run only on an exact Vercel Production deployment built from the <code>main</code> branch with a verifiable 40-character commit SHA. Preview, local and non-main deployments cannot execute this evidence workflow.</p>
        <pre style={{whiteSpace:"pre-wrap",overflowWrap:"anywhere",padding:14,borderRadius:14,background:"#020b08",color:"#d7e7df"}}>{JSON.stringify(build,null,2)}</pre>
      </div>
    </main>;
  }
  return <div data-laneriq-production-evidence="exact-main" data-production-sha={build.commitSha} data-production-ref={build.commitRef} data-production-environment={build.environment}>
    <WebPublishEvidenceClient />
  </div>;
}
