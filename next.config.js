/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    NEXT_PUBLIC_APP_NAME: 'CarpCast 2.0',
    NEXT_PUBLIC_APP_URL: process.env.VERCEL_URL || 'http://localhost:3000',
  },
}

module.exports = nextConfig