/** @type {import('next').NextConfig} */
const nextConfig = {
  // Basic configuration
  reactStrictMode: true,
  
  // Output configuration
  output: 'export',
  distDir: 'out',
  
  // Image domains - using remotePatterns instead of deprecated domains
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: 'plus.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: 'via.placeholder.com',
      },
      {
        protocol: 'https',
        hostname: 'randomuser.me',
      },
      {
        protocol: 'https',
        hostname: 'i.ytimg.com',
      }
    ],
    unoptimized: true,
    domains: [
      'images.unsplash.com',
      'picsum.photos',
      'trendiingz.com',
      'source.unsplash.com',
      'plus.unsplash.com'
    ],
  },
  
  // Handle server-only modules
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Prevent client-side builds from attempting to use server-side packages
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        os: false,
        crypto: false,
        stream: false,
        http: false,
        https: false,
        zlib: false,
      };
    }
    
    // Only run once on the server during build
    if (isServer) {
      // Run the static data generator script
      const { spawnSync } = require('child_process');
      console.log('🌐 Running static data generator before build...');
      
      const result = spawnSync('node', ['scripts/generate-static-data.js'], {
        stdio: 'inherit',
        encoding: 'utf-8'
      });
      
      if (result.error) {
        console.error('Error running static data generator:', result.error);
      }
    }
    
    return config;
  },
  
  // Ignore build errors to help with recovery
  eslint: {
    ignoreDuringBuilds: true,
  },
  
  typescript: {
    ignoreBuildErrors: true,
  },
}

module.exports = nextConfig; 