import type { NextConfig } from "next";
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

const nextConfig: NextConfig = {
  reactStrictMode: true,
};

// `next dev`에서도 wrangler.jsonc의 바인딩(D1 등)을 로컬로 쓸 수 있게 한다.
initOpenNextCloudflareForDev();

export default nextConfig;
