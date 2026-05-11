// vitest.config.ts
// Config untuk unit test verdict.ts dan fungsi pure lainnya.
// Hanya untuk pure functions — tidak include Next.js / React / browser.
//
// Dibuat: Sesi #125 — keperluan unit test Layer 1 Refactor Verdict

import { defineConfig } from 'vitest/config'
import path             from 'path'

export default defineConfig({
  test: {
    environment: 'node',
    include:     ['lib/**/*.test.ts'],
    exclude:     ['node_modules', '.next'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
})
