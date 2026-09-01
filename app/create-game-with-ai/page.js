import SeoLandingPage from "../components/SeoLandingPage";
import { buildSeoMetadata } from "../../lib/seo-foundation.js";

export const metadata = buildSeoMetadata("create-game-with-ai");
export default function Page(){return <SeoLandingPage slug="create-game-with-ai"/>;}
