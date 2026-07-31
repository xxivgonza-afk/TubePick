import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      new URL("https://i.ytimg.com/**"),
      new URL("https://yt3.googleusercontent.com/**"),
    ],
  },
};

export default nextConfig;
