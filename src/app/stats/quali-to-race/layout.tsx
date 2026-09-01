import type { Metadata } from "next";

const description = "See how the grid moved from qualifying to the chequered flag, any race since 1950.";

// Two levels below root (stats/ -> stats/quali-to-race/) — the root title
// template doesn't cascade through an intermediate layout that doesn't
// redeclare it, so the " | GridBeat" suffix is spelled out here too.
export const metadata: Metadata = {
  title: "Quali → Race Progression | GridBeat",
  description,
  openGraph: { title: "Quali → Race Progression | GridBeat", description },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
