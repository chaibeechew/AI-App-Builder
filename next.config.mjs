const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'self'",
  "object-src 'none'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "media-src 'self' blob: https:",
  "font-src 'self' data:",
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co",
  "frame-src 'self'",
  "worker-src 'self' blob:",
  "manifest-src 'self'",
  "upgrade-insecure-requests",
].join("; ");

const SECURITY_HEADERS = [
  { key:"Content-Security-Policy", value:CONTENT_SECURITY_POLICY },
  { key:"Strict-Transport-Security", value:"max-age=63072000; includeSubDomains; preload" },
  { key:"X-Content-Type-Options", value:"nosniff" },
  { key:"X-Frame-Options", value:"SAMEORIGIN" },
  { key:"Referrer-Policy", value:"strict-origin-when-cross-origin" },
  { key:"Permissions-Policy", value:"camera=(self), microphone=(self), geolocation=(self), accelerometer=(self), gyroscope=(self), magnetometer=(self), fullscreen=(self), payment=(self), clipboard-read=(self), clipboard-write=(self), usb=(), serial=(), hid=()" },
  { key:"Cross-Origin-Opener-Policy", value:"same-origin-allow-popups" },
  { key:"Cross-Origin-Resource-Policy", value:"same-site" },
  { key:"X-Permitted-Cross-Domain-Policies", value:"none" },
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  async headers() {
    return [{ source:"/:path*", headers:SECURITY_HEADERS }];
  },
  async redirects() {
    return [
      {
        source:"/image-studio",
        has:[{ type:"query", key:"mode", value:"design" }],
        destination:"/design-studio",
        permanent:false,
      },
    ];
  },
  async rewrites() {
    return [
      {
        source: "/api/video/projects/:id/versions/:versionId",
        destination: "/api/video/projects/:id/compile?versionId=:versionId",
      },
    ];
  },
};

export default nextConfig;
