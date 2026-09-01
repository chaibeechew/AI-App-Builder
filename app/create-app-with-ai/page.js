import SeoLandingPage from "../components/SeoLandingPage";
import { buildSeoMetadata } from "../../lib/seo-foundation.js";

export const metadata = buildSeoMetadata("create-app-with-ai");
export default function Page(){return <SeoLandingPage slug="create-app-with-ai"/>;}
