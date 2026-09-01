import type { Metadata } from "next";
import "./globals.css";
import { QueryProvider } from "@/components/providers/query-provider";
import { Sidebar } from "@/components/layout/sidebar";
import { SplashScreen } from "@/components/layout/splash-screen";

export const metadata: Metadata = {
  title: {
    default: "GridBeat",
    template: "%s | GridBeat",
  },
  description: "Live F1 timing, standings, results, and stats — GridBeat web dashboard.",
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
