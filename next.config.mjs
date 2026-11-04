/** @type {import('next').NextConfig} */
const nextConfig = {
  distDir: process.env.BILLYOURS_NEXT_DIST_DIR || ".next",
  reactStrictMode: true,
  poweredByHeader: false,
};

export default nextConfig;
