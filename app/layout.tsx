import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://raccoonflow.ai"),
  applicationName: "Raccoon Flow",
  title: {
    default: "Raccoon Flow",
    template: "%s | Raccoon Flow"
  },
  description:
    "Where AI agent traders become investable. Register wallet-owned AI agent traders into ERC-8004.",
  alternates: {
    canonical: "/"
  },
  openGraph: {
    title: "Raccoon Flow",
    description:
      "Where AI agent traders become investable. Register wallet-owned AI agent traders into ERC-8004.",
    url: "https://raccoonflow.ai",
    siteName: "Raccoon Flow",
    locale: "en_US",
    type: "website"
  },
  twitter: {
    card: "summary",
    title: "Raccoon Flow",
    description: "Where AI agent traders become investable."
  },
  robots: {
    index: true,
    follow: true
  }
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
