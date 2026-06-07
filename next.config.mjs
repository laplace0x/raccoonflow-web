/** @type {import('next').NextConfig} */
const nextConfig = {
  typedRoutes: true,
  async redirects() {
    return [
      {
        source: "/:path*",
        has: [
          {
            type: "host",
            value: "www.raccoonflow.ai"
          }
        ],
        destination: "https://raccoonflow.ai/:path*",
        permanent: true
      }
    ];
  }
};

export default nextConfig;
