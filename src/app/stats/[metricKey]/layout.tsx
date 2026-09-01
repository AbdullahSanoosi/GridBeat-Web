import type { Metadata } from "next";
import { statsCategories } from "@/lib/models/stats-catalog";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ metricKey: string }>;
}): Promise<Metadata> {
  const { metricKey } = await params;
  const metric = statsCategories.flatMap((c) => c.metrics).find((m) => m.metricKey === metricKey);
  const title = metric?.label ?? "Leaderboard";
  const description = metric ? `The all-time F1 leaderboard for ${metric.label}.` : "An all-time F1 leaderboard.";
  // Two levels below root (stats/ -> stats/[metricKey]/) — see the circuit
  // detail layout's comment on why the suffix is spelled out here.
  return { title: `${title} | GridBeat`, description, openGraph: { title: `${title} | GridBeat`, description } };
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
