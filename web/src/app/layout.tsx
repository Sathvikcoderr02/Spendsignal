import type { Metadata } from "next";
import "./globals.css";
import { getPublicAppUrl } from "@/lib/server/publicAppUrl";

const siteUrl = getPublicAppUrl();
const metadataBase = new URL(siteUrl);

const title = "SpendSignal | Credex AI Spend Audit";
const description =
  "Free AI tool spend audit for startups: enter plans and spend, get instant savings actions, optional email capture, and a shareable report link.";

export const metadata: Metadata = {
  metadataBase,
  title: {
    default: title,
    template: "%s | SpendSignal",
  },
  description,
  applicationName: "SpendSignal",
  openGraph: {
    title,
    description,
    url: metadataBase,
    siteName: "SpendSignal",
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
