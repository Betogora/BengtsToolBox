import { chromium } from '@playwright/test'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createServer } from 'vite'

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const currentReportPath = path.join(
  repositoryRoot,
  'dist',
  'performance',
  'tournament-metrics.json',
)

async function packageVersion(packageName) {
  const packageJsonUrl = import.meta.resolve(`${packageName}/package.json`)
  return JSON.parse(await readFile(fileURLToPath(packageJsonUrl), 'utf8')).version
}

function roundMilliseconds(value) {
  return Math.round(value * 100) / 100
}

export async function runTournamentBenchmark({ writeCurrentReport = true } = {}) {
  const server = await createServer({
    root: repositoryRoot,
    logLevel: 'error',
    server: {
      host: '127.0.0.1',
      port: 5180,
      strictPort: true,
    },
  })
  let browser

  try {
    await server.listen()

    try {
      browser = await chromium.launch({ headless: true })
    } catch (error) {
      throw new Error(
        'Playwright-Chromium fehlt. Installiere es einmalig mit: npx playwright install chromium',
        { cause: error },
      )
    }

    const page = await browser.newPage()
    await page.goto('http://127.0.0.1:5180/benchmarks/tournament-benchmark.html')
    const browserResult = await page.evaluate(async () => {
      const benchmark = await import('/benchmarks/tournamentScenarios.ts')
      return benchmark.runTournamentBenchmarkSuite(3, 10)
    })
    const browserVersion = browser.version()
    const report = {
      schemaVersion: 1,
      generatedAt: new Date().toISOString(),
      environment: {
        node: process.version,
        vite: await packageVersion('vite'),
        playwright: await packageVersion('@playwright/test'),
        browser: `chromium ${browserVersion}`,
        platform: `${os.platform()} ${os.release()} ${os.arch()}`,
        cpu: os.cpus()[0]?.model ?? 'unknown',
        logicalCpuCount: os.cpus().length,
        browserHardwareConcurrency: browserResult.hardwareConcurrency,
        userAgent: browserResult.userAgent,
      },
      warmupIterations: 3,
      sampleIterations: 10,
      longTaskThresholdMilliseconds: 50,
      longTaskApiSupported: browserResult.longTaskApiSupported,
      measurements: browserResult.measurements.map((measurement) => ({
        ...measurement,
        medianMilliseconds: roundMilliseconds(measurement.medianMilliseconds),
        p95Milliseconds: roundMilliseconds(measurement.p95Milliseconds),
        maximumMilliseconds: roundMilliseconds(measurement.maximumMilliseconds),
        longTaskDurationMilliseconds: roundMilliseconds(
          measurement.longTaskDurationMilliseconds,
        ),
      })),
    }

    if (writeCurrentReport) {
      await mkdir(path.dirname(currentReportPath), { recursive: true })
      await writeFile(currentReportPath, `${JSON.stringify(report, null, 2)}\n`)
    }

    console.table(
      report.measurements.map((measurement) => ({
        Szenario: measurement.id,
        Median_ms: measurement.medianMilliseconds,
        P95_ms: measurement.p95Milliseconds,
        Maximum_ms: measurement.maximumMilliseconds,
        Long_Tasks: measurement.longTaskCount,
      })),
    )

    return report
  } finally {
    await browser?.close()
    await server.close()
  }
}

const isDirectExecution =
  process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)

if (isDirectExecution) {
  await runTournamentBenchmark()
}
