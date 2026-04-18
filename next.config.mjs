/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: { serverComponentsExternalPackages: ['@prisma/client', '@resvg/resvg-js'] },
  webpack: (config) => {
    // Treat resvg's optional platform binaries as externals so Next doesn't
    // try to bundle every architecture.
    config.externals = config.externals || [];
    config.externals.push({ '@resvg/resvg-js': 'commonjs @resvg/resvg-js' });
    return config;
  },
};

export default nextConfig;
