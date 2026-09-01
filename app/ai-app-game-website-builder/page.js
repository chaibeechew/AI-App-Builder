import SeoLandingPage from "../components/SeoLandingPage";
import { buildSeoMetadata } from "../../lib/seo-foundation.js";

export const metadata = buildSeoMetadata("ai-app-game-website-builder");
export default function Page(){return <SeoLandingPage slug="ai-app-game-website-builder"/>;}
