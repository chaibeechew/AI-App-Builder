import SeoLandingPage from "../components/SeoLandingPage";
import { buildSeoMetadata } from "../../lib/seo-foundation.js";

export const metadata = buildSeoMetadata("ai-game-builder");
export default function Page(){return <SeoLandingPage slug="ai-game-builder"/>;}
