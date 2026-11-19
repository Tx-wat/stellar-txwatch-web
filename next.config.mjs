import bundleAnalyzer from '@next/bundle-analyzer'
import { createJiti } from 'jiti'

// Validate environment variables before building; lib/env.ts throws with a
// readable list of problems if any value is invalid.
const jiti = createJiti(import.meta.url)
const { env } = await jiti.import('./lib/env.ts')

const withBundleAnalyzer = bundleAnalyzer({
  enabled: env.ANALYZE,
})

/** @type {import('next').NextConfig} */
const nextConfig = {
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        ],
      },
    ]
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'stellar.expert' },
    ],
  },
}

export default withBundleAnalyzer(nextConfig)
