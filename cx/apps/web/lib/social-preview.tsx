import { ImageResponse } from "next/og"

export function createSocialPreviewImage(size: {
  width: number
  height: number
}) {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        background: "#090909",
        color: "#f7f7f7",
        padding: "64px 72px",
        fontFamily: "sans-serif",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          borderBottom: "1px solid #2d2d2d",
          paddingBottom: 28,
        }}
      >
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              display: "flex",
              fontSize: 34,
              fontWeight: 700,
              letterSpacing: "-0.05em",
            }}
          >
            got.cx
          </div>
          <div
            style={{
              display: "flex",
              marginTop: 5,
              color: "#a7a7a7",
              fontSize: 12,
              fontWeight: 600,
              letterSpacing: "0.18em",
            }}
          >
            GLOBAL ONCHAIN TRANSFERS
          </div>
        </div>
        <div
          style={{
            display: "flex",
            color: "#a7a7a7",
            fontSize: 18,
            fontWeight: 600,
            letterSpacing: "0.14em",
          }}
        >
          ONCHAIN TRANSFER SOLUTIONS
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column" }}>
        <div
          style={{
            display: "flex",
            maxWidth: 980,
            fontSize: 78,
            fontWeight: 700,
            lineHeight: 0.98,
            letterSpacing: "-0.055em",
          }}
        >
          Accept onchain transfers now
        </div>
        <div
          style={{
            display: "flex",
            marginTop: 30,
            maxWidth: 880,
            color: "#b5b5b5",
            fontSize: 27,
            lineHeight: 1.35,
          }}
        >
          Create a transfer link. Share it anywhere. Receive USDC directly
          onchain.
        </div>
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          borderTop: "1px solid #2d2d2d",
          paddingTop: 25,
          fontSize: 20,
        }}
      >
        <div style={{ display: "flex", fontStyle: "italic" }}>
          Send it. GOT it.
        </div>
        <div
          style={{
            display: "flex",
            color: "#a7a7a7",
            letterSpacing: "0.04em",
          }}
        >
          got.cx
        </div>
      </div>
    </div>,
    size
  )
}
