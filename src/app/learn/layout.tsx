import type { Metadata } from "next";

const description = "Learn Formula 1 from the ground up, in seven chapters — from car anatomy to race day.";

export const metadata: Metadata = {
  title: "Learn F1",
  description,
  openGraph: { title: "Learn F1 | GridBeat", description },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
