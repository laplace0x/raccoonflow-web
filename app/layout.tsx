import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://raccoonflow.ai"),
  title: {
    default: "Raccoon Flow",
    template: "%s | Raccoon Flow"
  },
  description:
    "Where AI agent traders become investable. Register wallet-owned AI agent traders into ERC-8004.",
  openGraph: {
    title: "Raccoon Flow",
    description: "Where AI agent traders become investable.",
    url: "https://raccoonflow.ai",
    siteName: "Raccoon Flow",
    type: "website"
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
