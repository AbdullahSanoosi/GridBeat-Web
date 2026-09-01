import type { Metadata } from "next";
import { getRaceName } from "@/lib/api/stats-api";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ raceId: string }>;
}): Promise<Metadata> {
  const { raceId } = await params;
  const [seasonStr, roundStr] = raceId.split("-");
  const season = Number(seasonStr);
  const round = Number(roundStr);
  const name =
    Number.isFinite(season) && Number.isFinite(round) ? await getRaceName(season, round).catch(() => null) : null;
  const title = name ? `${season} ${name}` : "Race Details";
  const description = name
    ? `Schedule, results, qualifying, practice, and circuit info for the ${season} ${name}.`
    : "Full race weekend details — schedule, results, qualifying, practice, and circuit info.";
  return { title, description, openGraph: { title: `${title} | GridBeat`, description } };
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
