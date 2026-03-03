import type { Metadata } from "next";
import "./globals.css";

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
      <body>{children}</body>
    </html>
  );
}
