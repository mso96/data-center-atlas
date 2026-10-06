import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.ATLAS_SITE_URL ?? "http://localhost:3001"),
  title: "Data Center Atlas",
  description: "Discover data center facilities with synchronized search and map exploration.",
};
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en" className="dark"><body>{children}</body></html>;
}
