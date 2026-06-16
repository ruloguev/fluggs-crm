import { ImageResponse } from "next/og"

export const contentType = "image/png"
export const size = { width: 1200, height: 630 }

export default function OGImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: "#09090b",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "48px",
          fontFamily: "system-ui, -apple-system, sans-serif",
        }}
      >
        <div
          style={{
            width: "120px",
            height: "120px",
            borderRadius: "24px",
            background: "#09090b",
            border: "1px solid rgba(255,255,255,0.08)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: "32px",
            position: "relative",
          }}
        >
          <span style={{ fontSize: "72px", fontWeight: 800, color: "#f4f4f5", lineHeight: 1 }}>F</span>
          <span style={{ fontSize: "64px", fontWeight: 800, color: "#22D3EE", lineHeight: 1, marginLeft: "-4px" }}>.</span>
        </div>
        <span
          style={{
            fontSize: "48px",
            fontWeight: 700,
            color: "#f4f4f5",
            letterSpacing: "-0.02em",
            marginBottom: "12px",
          }}
        >
          Flugzz CRM
        </span>
        <span
          style={{
            fontSize: "22px",
            color: "#71717a",
            fontWeight: 400,
          }}
        >
          CRM inmobiliario para agentes en campo
        </span>
      </div>
    ),
    size,
  )
}
