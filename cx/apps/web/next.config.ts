import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  poweredByHeader: false,
  transpilePackages: ["@got-cx/sdk", "@workspace/ui"],
}

export default nextConfig
