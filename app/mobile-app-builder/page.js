import SeoLandingPage from "../components/SeoLandingPage";
import { buildSeoMetadata } from "../../lib/seo-foundation.js";

export const metadata = buildSeoMetadata("mobile-app-builder");
export default function Page(){return <SeoLandingPage slug="mobile-app-builder"/>;}
