import { redirect } from "next/navigation";
import { LAUNCH_MODE, isNoCreditsLaunchMode } from "../../config/launch-mode.js";

export default function CreditsLayout({ children }) {
  if (isNoCreditsLaunchMode() && LAUNCH_MODE.credits.publicBalancePageEnabled === false) {
    redirect("/");
  }
  return children;
}
