import type { Metadata } from "next";
import { Cormorant_Garamond, DM_Sans } from "next/font/google";
import { Navbar } from "@/components/navbar";
import { SolanaProvider } from "@/components/solana-provider";
import "./globals.css";

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  variable: "--font-display",
  display: "swap",
});

const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-body",
  display: "swap",
});

export const metadata: Metadata = {
  title: "SOLAZZO — Portrait Studio",
  description:
    "Upload a selfie, receive a Baroque oil portrait in the Solazzo style.",
  openGraph: {
    title: "SOLAZZO — Portrait Studio",
    description:
      "Upload a selfie, receive a Baroque oil portrait in the Solazzo style.",
    siteName: "SOLAZZO",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${cormorant.variable} ${dmSans.variable} pt-14`}>
        <SolanaProvider>
          <Navbar />
          {children}
        </SolanaProvider>
      </body>
    </html>
  );
}
