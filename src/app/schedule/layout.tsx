import type { Metadata } from "next";
import { config } from "@/lib/config";

export const metadata: Metadata = {
  title: "Schedule",
  description: `Full ${config.currentSeason} F1 calendar — every round, session times, and a live countdown to the next race.`,
  openGraph: {
    title: `Schedule | GridBeat`,
    description: `Full ${config.currentSeason} F1 calendar — every round, session times, and a live countdown to the next race.`,
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
