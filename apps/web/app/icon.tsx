import { ImageResponse } from "next/og";

// Browser tab icon. Coral pulse-dot on the brand paper background,
// matching the live-dashboard motif.
export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#fafaf8",
          borderRadius: 6,
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
      </div>
    ),
    size,
  );
}
