import path from "node:path";
import { config } from "dotenv";
import type { NextConfig } from "next";

config({ path: path.join(__dirname, "../../.env") });

const nextConfig: NextConfig = {
  turbopack: {
    root: path.join(__dirname, "../.."),
  },
};

export default nextConfig;
