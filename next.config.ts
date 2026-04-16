import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // pdf-parse (v1) is CJS; keep external so the ingest route resolves it like Node at runtime
  serverExternalPackages: ["pdf-parse"],
};

export default nextConfig;
