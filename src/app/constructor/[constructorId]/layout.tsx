import type { Metadata } from "next";
import { getConstructorName } from "@/lib/api/stats-api";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ constructorId: string }>;
}): Promise<Metadata> {
  const { constructorId } = await params;
  const name = await getConstructorName(constructorId).catch(() => null);
  const title = name ?? "Constructor";
  const description = name
    ? `${name}'s F1 history — results, records, rankings, and season-by-season stats.`
    : "Constructor history — results, records, rankings, and season-by-season stats.";
  return { title, description, openGraph: { title: `${title} | GridBeat`, description } };
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
