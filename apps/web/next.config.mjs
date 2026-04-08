import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  transpilePackages: ["@repo/shared-types", "@repo/aui-mastra"],
  turbopack: {
    // Set root to monorepo root only for production builds.
    // In dev, this causes Turbopack to watch ~109K files across the entire
    // monorepo (including node_modules, .mastra, .git), burning CPU at idle.
    ...(process.env.NODE_ENV === "production" && {
      root: resolve(__dirname, "../.."),
    }),
  },
};

export default nextConfig;
