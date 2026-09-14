/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  eslint: { ignoreDuringBuilds: true },
  // Typecheck dijalankan terpisah via `tsc --noEmit` (sudah bersih);
  // type-check bawaan next build mem-fork worker yang diblokir sandbox Windows.
  typescript: { ignoreBuildErrors: true },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'data.bmkg.go.id' },
      { protocol: 'http', hostname: 'data.bmkg.go.id' },
    ],
  },
};

module.exports = nextConfig;
