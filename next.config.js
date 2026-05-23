/** @type {import('next').NextConfig} */
const nextConfig = {
  turbopack: {},
  typescript: { ignoreBuildErrors: true },
  devIndicators: false,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'app-cdn.appgen.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        port: '',
        pathname: '/**',
      },
    ],
  },
}

module.exports = nextConfig
