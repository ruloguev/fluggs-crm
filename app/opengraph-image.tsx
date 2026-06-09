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
            width: "96px",
            height: "96px",
            borderRadius: "20px",
            background: "#09090b",
            border: "2px solid rgba(34, 211, 238, 0.3)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: "24px",
          }}
        >
          <span style={{ fontSize: "56px", fontWeight: 800, color: "#22D3EE" }}>F</span>
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
