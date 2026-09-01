import type { Metadata } from "next";
import { getDriverName } from "@/lib/api/stats-api";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ driverId: string }>;
}): Promise<Metadata> {
  const { driverId } = await params;
  const name = await getDriverName(driverId).catch(() => null);
  const title = name ?? "Driver";
  const description = name
    ? `${name}'s F1 career — results, records, rankings, and head-to-head stats.`
    : "Driver career results, records, rankings, and head-to-head stats.";
  return { title, description, openGraph: { title: `${title} | GridBeat`, description } };
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
