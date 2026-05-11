import { ImageResponse } from "next/og";

// Open Graph / Twitter card image. Wordmark + tagline + dot, on paper.
export const alt = "whoopsie — see your AI app's failures live";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          padding: 80,
          background: "#fafaf8",
          color: "#0e0f0d",
          fontFamily: "ui-sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
            fontSize: 36,
            color: "#0e0f0d",
            letterSpacing: "-0.01em",
          }}
        >
          <div
            style={{
              width: 18,
              height: 18,
              borderRadius: "50%",
              background: "#ff5a4e",
            }}
          />
          <span>whoopsie</span>
        </div>

        <div style={{ flex: 1 }} />

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 20,
          }}
        >
          <div
            style={{
              fontSize: 84,
              fontWeight: 600,
              letterSpacing: "-0.02em",
              lineHeight: 1.05,
              maxWidth: 980,
            }}
          >
            See when your AI app breaks itself.
          </div>
          <div
            style={{
              fontSize: 28,
              color: "#6b6c66",
              maxWidth: 880,
              lineHeight: 1.4,
            }}
          >
            Loops. Hallucinations. Cost spikes. Live, in plain English.
          </div>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginTop: 60,
            color: "#6b6c66",
            fontSize: 22,
          }}
        >
          <span>whoopsie.dev</span>
          <span style={{ color: "#ff5a4e" }}>npx @whoopsie/cli init</span>
        </div>
      </div>
    ),
    size,
  );
}
