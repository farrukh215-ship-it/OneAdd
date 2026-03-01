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
          background: "linear-gradient(145deg, #e8f5ef 0%, #f6f4ed 100%)"
        }}
      >
        <div
          style={{
            width: 50,
            height: 50,
            borderRadius: 14,
            background: "linear-gradient(140deg, #0f8e66 0%, #1f6f56 100%)",
            color: "#ffffff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 30,
            fontWeight: 900,
            boxShadow: "0 8px 18px rgba(15, 95, 72, 0.28)",
            transform: "rotate(-2deg)",
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
