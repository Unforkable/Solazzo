import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SOLAZZO — Whitepaper v1",
  description: "A Conviction-Based NFT Identity Protocol on Solana",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
