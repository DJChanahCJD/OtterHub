/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  env: {
    // 从环境变量中读取后端URL，默认使用当前地址
    BACKEND_URL: process.env.NEXT_PUBLIC_BACKEND_URL || '',
  },
}

export default nextConfig
