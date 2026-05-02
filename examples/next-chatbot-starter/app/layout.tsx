import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Chatbot starter — instrumented with whoopsie",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body
        style={{
          fontFamily: "ui-sans-serif, system-ui, -apple-system, sans-serif",
          margin: 0,
          padding: 0,
          background: "#fafaf8",
          color: "#0e0f0d",
        }}
      >
        {children}
      </body>
    </html>
  );
}
