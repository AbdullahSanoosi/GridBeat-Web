import type { Metadata } from "next";
import "./globals.css";
import { QueryProvider } from "@/components/providers/query-provider";
import { Sidebar } from "@/components/layout/sidebar";
import { SplashScreen } from "@/components/layout/splash-screen";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "https://dashboard.gridbeat.app"),
  title: {
    default: "GridBeat",
    template: "%s | GridBeat",
  },
  description:
    "GridBeat is the Formula 1 companion for iOS and Android — live timing, telemetry, team radio, race control, standings, results, and a full web dashboard.",
  openGraph: {
    title: "GridBeat — Feel every millisecond",
    description: "Live timing, telemetry, team radio, race control and the full Formula 1 season — in your pocket.",
    type: "website",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "GridBeat — Feel every millisecond" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "GridBeat — Feel every millisecond",
    description: "Live timing, telemetry, team radio, race control and the full Formula 1 season — in your pocket.",
    images: ["/og.png"],
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col lg:flex-row">
        <SplashScreen />
        <QueryProvider>
          <Sidebar />
          {/* min-w-0: flex items default to min-width:auto, so wide page
              content (e.g. the live-timing map's canvas) would otherwise
              force this whole row wider than the viewport instead of being
              contained/scrolled — and squeeze the sidebar down doing it. */}
          <div className="flex min-h-screen min-w-0 flex-1 flex-col">{children}</div>
        </QueryProvider>
      </body>
    </html>
  );
}
