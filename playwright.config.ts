import { defineConfig } from '@playwright/test'

const localFirebaseEnvironment = {
  VITE_FIREBASE_API_KEY: ' ',
  VITE_FIREBASE_AUTH_DOMAIN: ' ',
  VITE_FIREBASE_PROJECT_ID: ' ',
  VITE_FIREBASE_STORAGE_BUCKET: ' ',
  VITE_FIREBASE_MESSAGING_SENDER_ID: ' ',
  VITE_FIREBASE_APP_ID: ' ',
}

// Die Tests starten immer ihren eigenen Server im lokalen Modus und verwenden nie einen
// laufenden wieder: 5180 kann mit .env.local echtes Firebase nutzen, und andere Projekte
// belegen benachbarte Ports. Ist der Port belegt, bricht der Lauf ab.
const testServerPort = 5288
// Ein Produktionsbuild ohne Dateiwatcher ist schneller als der Dev-Server und lädt
// bei parallelen Quelländerungen keine Testseite neu.
const testBuildDirectory = 'node_modules/.cache/browser-tests'
const vite = 'node node_modules/vite/bin/vite.js'

export default defineConfig({
  testDir: './tests/browser',
  outputDir: 'test-results',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: 0,
  // GitHub-hosted runners for public repositories provide four vCPUs.
  workers: process.env.CI ? 4 : undefined,
  reporter: process.env.CI
    ? [['github'], ['html', { open: 'never', outputFolder: 'playwright-report' }]]
    : [['list'], ['html', { open: 'never', outputFolder: 'playwright-report' }]],
  timeout: 45_000,
  expect: {
    timeout: 10_000,
  },
  use: {
    baseURL: `http://127.0.0.1:${testServerPort}`,
    colorScheme: 'light',
    locale: 'de-DE',
    reducedMotion: 'reduce',
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
    video: 'off',
  },
  // 320 und 1440 führen alle Fälle aus; 390 und 768 nur Fälle mit eigenen Layoutzweigen (@layout).
  projects: [
    {
      name: 'mobile-320',
      grepInvert: /@desktop/,
      use: {
        viewport: { width: 320, height: 720 },
        hasTouch: true,
        isMobile: true,
      },
    },
    {
      name: 'mobile-390',
      grep: /@layout/,
      grepInvert: /@desktop/,
      use: {
        viewport: { width: 390, height: 844 },
        hasTouch: true,
        isMobile: true,
      },
    },
    {
      name: 'tablet',
      grep: /@layout/,
      grepInvert: /@desktop/,
      use: {
        viewport: { width: 768, height: 1024 },
        hasTouch: true,
      },
    },
    {
      name: 'desktop',
      grepInvert: /@touch/,
      use: {
        viewport: { width: 1440, height: 900 },
      },
    },
  ],
  webServer: {
    command: [
      `${vite} build --outDir ${testBuildDirectory} --emptyOutDir --logLevel warn`,
      `${vite} preview --outDir ${testBuildDirectory} --host 127.0.0.1 --port ${testServerPort} --strictPort`,
    ].join(' && '),
    env: localFirebaseEnvironment,
    reuseExistingServer: false,
    timeout: 120_000,
    url: `http://127.0.0.1:${testServerPort}`,
  },
})
