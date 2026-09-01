import type { Metadata } from "next";

const description = "The latest Formula 1 news.";

export const metadata: Metadata = {
  title: "News",
  description,
  openGraph: { title: "News | GridBeat", description },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
