import type { Metadata } from "next";

const description = "Live F1 timing, telemetry, race control, and a 3D track map.";

export const metadata: Metadata = {
  title: "Live Timing",
  description,
  openGraph: { title: "Live Timing | GridBeat", description },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
