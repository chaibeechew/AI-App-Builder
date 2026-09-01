import SeoLandingPage from "../components/SeoLandingPage";
import { buildSeoMetadata } from "../../lib/seo-foundation.js";

export const metadata = buildSeoMetadata("no-code-ai-builder");
export default function Page(){return <SeoLandingPage slug="no-code-ai-builder"/>;}
