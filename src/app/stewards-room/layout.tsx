import type { Metadata } from "next";

const description = "Live steward decisions, the Super Licence penalty-points ledger, and grid/tyre notices.";

export const metadata: Metadata = {
  title: "Stewards' Room",
  description,
  openGraph: { title: "Stewards' Room | GridBeat", description },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
