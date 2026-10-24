import { ImageResponse } from "next/og";

// Home-screen icon for iPhone/iPad (and Safari's fallback favicon): the header mark on a solid tile.
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
          background: "#0d0f13",
        }}
      >
        <div
          style={{
            display: "flex",
            width: 120,
            height: 86,
            borderRadius: 18,
            border: "9px solid #e8ebf0",
            overflow: "hidden",
          }}
        >
          <div style={{ width: "50%", height: "100%", background: "#7d93ff", borderRight: "4px solid rgba(232,235,240,.45)" }} />
        </div>
      </div>
    ),
    size,
  );
}
