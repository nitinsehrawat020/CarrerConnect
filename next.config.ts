import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "l8khdtmo7lt4ewzn.public.blob.vercel-storage.com",
      },
    ],
  },
  async redirects() {
    return [
      {
        source: "/",
        destination: "/meetings",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
