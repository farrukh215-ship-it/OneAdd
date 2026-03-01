import { ImageResponse } from "next/og";

export const size = {
  width: 64,
  height: 64
};

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
          background: "linear-gradient(145deg, #edf7f2 0%, #f6f3ed 100%)"
        }}
      >
        <div
          style={{
            width: 50,
            height: 50,
            borderRadius: 14,
            background: "linear-gradient(145deg, #123d31 0%, #1f6f56 100%)",
            color: "white",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 28,
            fontWeight: 900,
            fontFamily: "sans-serif"
          }}
        >
          Z
        </div>
      </div>
    ),
    size
  );
}
