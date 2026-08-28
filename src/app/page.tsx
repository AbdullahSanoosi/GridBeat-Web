import { redirect } from "next/navigation";

/**
 * No standalone dashboard "home" page yet — Schedule is the first real page
 * built (Phase 1). Revisit once there's an actual overview page to land on.
 */
export default function RootPage() {
  redirect("/schedule");
}
