import type { NextConfig } from "next";
import withPWAInit from "next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  // Without these, an installed PWA can keep serving the OLD cached
  // service worker/assets even after a new deploy — the user has to
  // fully close + reopen the app (sometimes more than once) to see
  // updates. skipWaiting + clientsClaim make the new service worker
  // take over immediately instead of waiting for all old tabs to close.
  skipWaiting: true,
  clientsClaim: true,
});

const nextConfig: NextConfig = {
  /* config options here */
  turbopack: {},
  async rewrites() {
    return [{ source: "/l/:code", destination: "/api/l/:code" }];
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          // Was `geolocation=()` — this BLOCKED geolocation entirely,
          // silently breaking the Namaz-Aware Scheduling feature (it
          // needs the browser's location to fetch prayer times). Now
          // allowed for our own origin only, camera/mic still blocked.
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(self)" },
        ],
      },
    ];
  },
};

export default withPWA(nextConfig);
