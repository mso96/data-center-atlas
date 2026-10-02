import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Data Center Atlas — Demo",
  description: "Data Center Atlas foundation with clearly fictional demo data.",
};
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en" className="dark"><body>{children}</body></html>;
}
