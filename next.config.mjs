/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  transpilePackages: [],
  webpack: (config) => {
    // Add support for resolving modules without extensions
    config.resolve.extensions = ['.ts', '.tsx', '.js', '.jsx', '.json']
    
    // Ensure alias for @ is set correctly
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': __dirname,
    }
    
    return config
  }
}

export default nextConfig
