const path = require('path');

module.exports = {
  reactStrictMode: true,
  experimental: {
    typedRoutes: false,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  async rewrites() {
    return [
      {
        source: '/track',
        destination: '/api/track',
      },
      {
        source: '/s/:projectCode',
        destination: '/api/s/:projectCode',
      },
      {
        source: '/redirect/:path*',
        destination: '/api/redirect/:path*',
      },
    ];
  },
  webpack: (config) => {
    config.resolve.alias['@'] = path.resolve(__dirname, 'src');
    return config;
  }
};
