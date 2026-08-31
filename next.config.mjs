/** @type {import('next').NextConfig} */
const nextConfig = {
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
