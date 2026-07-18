/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  reactStrictMode: true,
  async rewrites() {
    const api = process.env.API_INTERNAL_URL || 'http://localhost:4000';
    return [{ source: '/api/pbx/:path*', destination: `${api}/:path*` }];
  },
};

export default nextConfig;
