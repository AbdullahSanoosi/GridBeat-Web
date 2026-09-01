import type { Metadata } from "next";
import { getCircuitName } from "@/lib/api/stats-api";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ circuitId: string }>;
}): Promise<Metadata> {
  const { circuitId } = await params;
  const circuit = await getCircuitName(circuitId).catch(() => null);
  const title = circuit?.name ?? "Circuit";
  const description = circuit
    ? `${circuit.name}, ${circuit.country} — facts, lap/pit records, and all-time leaderboards.`
    : "Circuit facts, lap/pit records, and all-time leaderboards.";
  // Two levels below root (circuits/ -> circuits/[circuitId]/) — the root
  // title template doesn't cascade through an intermediate layout that
  // doesn't redeclare it, so the " | GridBeat" suffix is spelled out here.
  return { title: `${title} | GridBeat`, description, openGraph: { title: `${title} | GridBeat`, description } };
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
