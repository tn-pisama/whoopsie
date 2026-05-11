import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";

export const metadata: Metadata = {
  title: "whoopsie — see your AI app's failures live",
  description:
    "Vercel AI SDK middleware that catches loops, hallucinations, and cost spikes.",
  metadataBase: new URL("https://whoopsie.dev"),
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">
        {children}
        <Analytics />
      </body>
    </html>
  );
}
