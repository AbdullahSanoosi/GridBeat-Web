import type { Metadata } from "next";

const description = "What actually gets you penalised in F1, ordered by how often it happens, with real steward decisions.";

// Two levels below root (learn/ -> learn/penalties/) — see the circuit
// detail layout's comment on why the suffix is spelled out here too.
export const metadata: Metadata = {
  title: "Penalties | GridBeat",
  description,
  openGraph: { title: "Penalties | GridBeat", description },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
