/** @type {import('next').NextConfig} */
const nextConfig = {
  output: process.env.DOCKER_OUTPUT === 'standalone' ? 'standalone' : undefined,
  experimental: {},
};
export default nextConfig;
