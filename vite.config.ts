/// <reference types="vitest/config" />

import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'
import { defineConfig } from 'vite'

import { bundleMetricsPlugin } from './scripts/bundleMetrics.mjs'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), bundleMetricsPlugin()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    environment: 'node',
    include: [
      'src/**/*.test.ts',
      'benchmarks/**/*.test.ts',
      'scripts/**/*.test.mjs',
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      reportsDirectory: 'coverage',
      include: [
        'src/apps/swiss-tournaments/logic.ts',
        'src/apps/swiss-tournaments/pairingParticipants.ts',
        'src/apps/swiss-tournaments/tournamentProgress.ts',
        'src/apps/randomizer/random.ts',
        'src/apps/decision-wheel/selection.ts',
        'src/apps/decision-wheel/utils.ts',
        'src/apps/coinflip/coin.ts',
      ],
    },
  },
})
