import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import {
  compareBundleMetrics,
  formatBundleViolations,
  formatBytes,
  validateMetricsDocument,
} from './bundleMetrics.mjs'

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const baselinePath = path.join(repositoryRoot, 'benchmarks', 'bundle-baseline.json')
const reportPath = path.join(repositoryRoot, 'dist', 'performance', 'bundle-metrics.json')

async function readJson(filePath, label) {
  try {
    return JSON.parse(await readFile(filePath, 'utf8'))
  } catch (error) {
    throw new Error(`${label} konnte nicht gelesen werden: ${filePath}`, { cause: error })
  }
}

const baseline = await readJson(baselinePath, 'Die Bundle-Baseline')
const current = await readJson(reportPath, 'Der aktuelle Bundle-Report')

validateMetricsDocument(baseline, 'Die Bundle-Baseline')
validateMetricsDocument(current, 'Der aktuelle Bundle-Report')

for (const [key, metric] of Object.entries(current.metrics)) {
  console.log(
    `${key.padEnd(48)} ${formatBytes(metric.rawBytes).padStart(18)} roh  ${formatBytes(metric.gzipBytes).padStart(18)} gzip`,
  )
}

const violations = compareBundleMetrics(baseline, current)

if (violations.length > 0) {
  console.error('\nBundle-Budget verletzt:')
  formatBundleViolations(violations).forEach((line) => console.error(line))
  console.error('\nNur bewusste Größenänderungen mit npm run perf:baseline:update übernehmen.')
  process.exitCode = 1
} else {
  console.log('\nBundle-Budgets eingehalten.')
}
