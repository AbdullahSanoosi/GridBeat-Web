import type { Metadata } from "next";

const description = "Ten F1 cars that changed the sport, from the Lotus 72 to the RB19 — scrub the timeline.";

export const metadata: Metadata = {
  title: "Evolution",
  description,
  openGraph: { title: "Evolution | GridBeat", description },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
