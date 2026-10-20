import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  // Use the automatic JSX runtime so .tsx components that do not import React
  // (the Next.js/SWC convention) can be rendered under Vitest.
  esbuild: {
    jsx: 'automatic',
  },
  test: {
    environment: 'node',
    globals: true,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
})
