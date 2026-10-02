import type { NextConfig } from "next";

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  // The workspace embeds the private PDF route in a same-origin iframe;
  // SAMEORIGIN still blocks framing by external sites.
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
];

const privateWorkspaceHeaders = [
  { key: "Cache-Control", value: "private, no-store, max-age=0" },
  { key: "Vary", value: "Cookie" },
];

const nextConfig: NextConfig = {
  serverExternalPackages: ["unpdf"],
  poweredByHeader: false,
  async headers() {
    return [
      { source: "/(.*)", headers: securityHeaders },
      { source: "/dashboard", headers: privateWorkspaceHeaders },
      { source: "/documents/:path*", headers: privateWorkspaceHeaders },
      { source: "/api/:path*", headers: privateWorkspaceHeaders },
    ];
  },
};

export default nextConfig;
