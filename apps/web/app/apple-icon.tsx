import { ImageResponse } from "next/og";

// Apple touch icon (home screen / pinned tab). Same motif as /icon, scaled up.
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
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
        }}
      >
        <div
          style={{
            width: 110,
            height: 110,
            borderRadius: "50%",
            background: "#ff5a4e",
          }}
        />
      </div>
    ),
    size,
  );
}
