import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // pdf-parse pulls pdfjs-dist; externalize parse layer only (pdfjs-dist is ESM-only for worker path)
  serverExternalPackages: ["pdf-parse"],
};

export default nextConfig;
