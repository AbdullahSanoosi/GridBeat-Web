import type { Metadata } from "next";
import "./globals.css";
import { QueryProvider } from "@/components/providers/query-provider";
import { Sidebar } from "@/components/layout/sidebar";

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
      <body className="min-h-full flex">
        <QueryProvider>
          <Sidebar />
          <div className="flex min-h-screen flex-1 flex-col">{children}</div>
        </QueryProvider>
      </body>
    </html>
  );
}
