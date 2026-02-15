import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  headers: async () => [
    {
      source: "/:path*.json",
      headers: [
        {
          key: "Cache-Control",
          value: "public, max-age=31536000, immutable",
        },
      ],
    },
  ],
};

export default nextConfig;
