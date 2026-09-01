import type { Metadata } from "next";
import { getCircuitName } from "@/lib/api/stats-api";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ circuitId: string }>;
}): Promise<Metadata> {
  const { circuitId } = await params;
  const circuit = await getCircuitName(circuitId).catch(() => null);
  const title = circuit ? `${circuit.name} Leaderboard` : "Circuit Leaderboard";
  const description = circuit
    ? `The full ranked all-time leaderboard for ${circuit.name}.`
    : "A full ranked all-time circuit leaderboard.";
  // Three levels below root — see the sibling circuit layout's comment on
  // why the suffix is spelled out rather than left to the root template.
  return { title: `${title} | GridBeat`, description, openGraph: { title: `${title} | GridBeat`, description } };
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
