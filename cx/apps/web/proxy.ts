import { NextResponse, type NextRequest } from "next/server"

function origin(value: string | undefined, fallback: string) {
  try {
    return new URL(value || fallback).origin
  } catch {
    return new URL(fallback).origin
  }
}

function contentSecurityPolicy(nonce: string) {
  const isDev = process.env.NODE_ENV === "development"
  const apiOrigin = origin(
    process.env.NEXT_PUBLIC_GOT_API_URL,
    "https://api.got.cx"
  )
  const rpcOrigin = origin(
    process.env.NEXT_PUBLIC_BASE_RPC_URL,
    "https://mainnet.base.org"
  )
  const connectSources = [
    "'self'",
    apiOrigin,
    rpcOrigin,
    ...(isDev ? ["http:", "ws:", "wss:"] : []),
  ]

  return `
    default-src 'self';
    script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDev ? " 'unsafe-eval'" : ""};
    script-src-attr 'none';
    style-src 'self' ${isDev ? "'unsafe-inline'" : `'nonce-${nonce}'`};
    style-src-attr 'unsafe-inline';
    connect-src ${[...new Set(connectSources)].join(" ")};
    img-src 'self' blob: data:;
    font-src 'self';
    media-src 'none';
    object-src 'none';
    frame-src 'none';
    worker-src 'self' blob:;
    manifest-src 'self';
    base-uri 'self';
    form-action 'self';
    frame-ancestors 'none';
    ${isDev ? "" : "upgrade-insecure-requests;"}
  `
    .replace(/\s{2,}/g, " ")
    .trim()
}

export function proxy(request: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64")
  const csp = contentSecurityPolicy(nonce)
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set("x-nonce", nonce)
  requestHeaders.set("Content-Security-Policy", csp)

  const response = NextResponse.next({ request: { headers: requestHeaders } })
  response.headers.set("Content-Security-Policy", csp)
  response.headers.set("Cross-Origin-Opener-Policy", "same-origin-allow-popups")
  response.headers.set("Cross-Origin-Resource-Policy", "same-origin")
  response.headers.set("Origin-Agent-Cluster", "?1")
  response.headers.set(
    "Permissions-Policy",
    "camera=(), geolocation=(), microphone=(), usb=()"
  )
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin")
  response.headers.set("X-Content-Type-Options", "nosniff")
  response.headers.set("X-Frame-Options", "DENY")
  response.headers.set("X-XSS-Protection", "0")
  if (process.env.NODE_ENV === "production") {
    response.headers.set(
      "Strict-Transport-Security",
      "max-age=63072000; includeSubDomains; preload"
    )
  }
  return response
}

export const config = {
  matcher: [
    {
      source: "/((?!_next/static|_next/image|favicon.ico).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
}
