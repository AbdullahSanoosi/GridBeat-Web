import type { Metadata } from "next";

const description = "Live F1 driver and constructor championship standings.";

export const metadata: Metadata = {
  title: "Standings",
  description,
  openGraph: { title: "Standings | GridBeat", description },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
