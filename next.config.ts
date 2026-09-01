import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  distDir: "dist",
  output: "export",
  images: {
    unoptimized: true,
  },
  ...(process.env.NODE_ENV === "development"
    ? {
        async rewrites() {
          const target =
            process.env.NEXT_PUBLIC_API_TARGET || "http://127.0.0.1:25774";
          return [
            {
              source: "/api/:path*",
              destination: `${target}/api/:path*`,
            },
            {
              source: "/themes/:path*",
              destination: `${target}/themes/:path*`,
            },
          ];
        },
      }
    : {}),
};

export default nextConfig;
