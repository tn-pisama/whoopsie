import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "whoopsie — see your AI app's failures live",
  description:
    "Vercel AI SDK middleware that catches loops, hallucinations, and cost spikes. Free forever.",
  metadataBase: new URL("https://whoopsie.dev"),
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
