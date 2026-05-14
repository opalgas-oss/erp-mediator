import type { NextConfig } from 'next'
import bundleAnalyzer from '@next/bundle-analyzer'

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
  openAnalyzer: true,
})

const nextConfig: NextConfig = {
  // FIX Sesi #081 — collapse per-segment RSC request jadi 1 response
  // Trade-off: shared layout data diduplikasi, tapi request count turun
  // Ref: Next.js 16.2 release notes + research Sesi #080
  //
  // FIX Sesi #145 — BUG-015 Tahap 2: optimizePackageImports
  // Barrel import optimization — mengurangi bundle size SA route
  // yang berkontribusi ke cold start.
  // Default sudah include: lucide-react, @radix-ui/*, date-fns, lodash-es
  // Ditambahkan: recharts (dipakai di M9 Refund + statistik SA ke depan)
  // Ref: vercel.com/blog/how-we-optimized-package-imports-in-next-js
  experimental: {
    prefetchInlining: true,
    optimizePackageImports: ['recharts'],
  },

  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
    ],
  },

  // HTTP Security Headers — wajib ada sebelum Production
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options',           value: 'DENY' },
          { key: 'X-Content-Type-Options',     value: 'nosniff' },
          { key: 'Referrer-Policy',            value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy',         value: 'camera=(), microphone=()' },
          { key: 'Strict-Transport-Security',  value: 'max-age=63072000; includeSubDomains; preload' },
        ],
      },
    ]
  },
}

export default withBundleAnalyzer(nextConfig)
