import type { Metadata } from "next";

const description = "Every F1 driver and constructor on record since 1950, ranked by titles and wins.";

export const metadata: Metadata = {
  title: "Hall of Fame",
  description,
  openGraph: { title: "Hall of Fame | GridBeat", description },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
