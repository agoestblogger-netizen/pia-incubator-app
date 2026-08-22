import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: [
    "@supabase/supabase-js",
    "@supabase/ssr",
    "postgres",
    "drizzle-orm",
  ],
};

export default nextConfig;
