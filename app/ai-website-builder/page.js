import SeoLandingPage from "../components/SeoLandingPage";
import { buildSeoMetadata } from "../../lib/seo-foundation.js";

export const metadata = buildSeoMetadata("ai-website-builder");
export default function Page(){return <SeoLandingPage slug="ai-website-builder"/>;}
