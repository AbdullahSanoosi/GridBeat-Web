import type { Metadata } from "next";

const description = "Every circuit Formula 1 has raced at — facts, records, and track maps.";

export const metadata: Metadata = {
  title: "Circuit Guide",
  description,
  openGraph: { title: "Circuit Guide | GridBeat", description },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
