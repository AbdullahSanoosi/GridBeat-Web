import type { Metadata } from "next";

const description = "F1 stats and leaderboards across the full history of the sport, since 1950.";

export const metadata: Metadata = {
  title: "Stats",
  description,
  openGraph: { title: "Stats | GridBeat", description },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
