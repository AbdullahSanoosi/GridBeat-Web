import type { Metadata } from "next";

const description = "Every F1 season and race result since 1950.";

export const metadata: Metadata = {
  title: "Race Archives",
  description,
  openGraph: { title: "Race Archives | GridBeat", description },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
