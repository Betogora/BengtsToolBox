import { gzipSync } from 'node:zlib'

const RAW_MINIMUM_HEADROOM_BYTES = 16 * 1024
const GZIP_MINIMUM_HEADROOM_BYTES = 4 * 1024
const RELATIVE_HEADROOM = 0.2

function normalizePath(value = '') {
  return value.replaceAll('\\', '/')
}

function outputBuffer(output) {
  if (output.type === 'chunk') {
    return Buffer.from(output.code)
  }

  return Buffer.isBuffer(output.source)
    ? output.source
    : Buffer.from(output.source)
}

function measureOutputs(outputs) {
  return outputs.reduce(
    (total, output) => {
      const value = outputBuffer(output)
      total.rawBytes += value.byteLength
      total.gzipBytes += gzipSync(value).byteLength
      return total
    },
    { rawBytes: 0, gzipBytes: 0 },
  )
}

function appIdFromChunk(chunk) {
  const facadeModuleId = normalizePath(chunk.facadeModuleId ?? '')
  return facadeModuleId.match(/\/src\/apps\/([^/]+)\/index\.(?:ts|tsx)$/)?.[1] ?? null
}

function datasetKeyFromOutput(output) {
  if (output.type === 'asset') {
    const names = [
      output.fileName,
      output.name,
      ...(output.names ?? []),
      ...(output.originalFileNames ?? []),
    ]
      .filter(Boolean)
      .map(normalizePath)

    if (names.some((name) => name.endsWith('/questions.ndjson') || name === 'questions.ndjson')) {
      return 'dataset:next-question/questions.ndjson'
    }

    return null
  }

  const facadeModuleId = normalizePath(output.facadeModuleId ?? '')
  const territoryDataset = facadeModuleId.match(
    /\/src\/apps\/territory-map\/data\/([^/]+)\.(?:ts|tsx)$/,
  )

  return territoryDataset ? `dataset:territory-map/${territoryDataset[1]}` : null
}

function hasFirebaseModule(chunk) {
  return Object.keys(chunk.modules ?? {}).some((moduleId) => {
    const normalizedId = normalizePath(moduleId)
    return (
      normalizedId.includes('/node_modules/@firebase/') ||
      normalizedId.includes('/node_modules/firebase/')
    )
  })
}

export function createBundleMetrics(bundle, toolchain = {}) {
  const outputs = Object.values(bundle)
  const chunks = outputs.filter((output) => output.type === 'chunk')
  const assets = outputs.filter((output) => output.type === 'asset')
  const groupedOutputs = new Map()

  function addMetricOutput(key, output) {
    groupedOutputs.set(key, [...(groupedOutputs.get(key) ?? []), output])
  }

  chunks.filter((chunk) => chunk.isEntry).forEach((chunk) => addMetricOutput('entry:js', chunk))
  assets
    .filter((asset) => asset.fileName.endsWith('.css'))
    .forEach((asset) => addMetricOutput('entry:css', asset))
  chunks.filter(hasFirebaseModule).forEach((chunk) => addMetricOutput('firebase', chunk))

  chunks.forEach((chunk) => {
    const appId = appIdFromChunk(chunk)
    if (appId) {
      addMetricOutput(`app:${appId}`, chunk)
    }
  })

  outputs.forEach((output) => {
    const datasetKey = datasetKeyFromOutput(output)
    if (datasetKey) {
      addMetricOutput(datasetKey, output)
    }
  })

  const metrics = Object.fromEntries(
    [...groupedOutputs.entries()]
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, metricOutputs]) => [key, measureOutputs(metricOutputs)]),
  )

  return {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    toolchain,
    metrics,
  }
}

export function bundleMetricsPlugin() {
  return {
    name: 'bengtstoolbox-bundle-metrics',
    apply: 'build',
    enforce: 'post',
    generateBundle: {
      order: 'post',
      handler(_options, bundle) {
        const report = createBundleMetrics(bundle, {
          node: process.version,
          vite: this.meta.viteVersion,
          rolldown: this.meta.rolldownVersion ?? null,
        })

        this.emitFile({
          type: 'asset',
          fileName: 'performance/bundle-metrics.json',
          source: `${JSON.stringify(report, null, 2)}\n`,
        })
      },
    },
  }
}

export function calculateBudget(metric) {
  return {
    rawBytes:
      metric.rawBytes +
      Math.max(Math.ceil(metric.rawBytes * RELATIVE_HEADROOM), RAW_MINIMUM_HEADROOM_BYTES),
    gzipBytes:
      metric.gzipBytes +
      Math.max(
        Math.ceil(metric.gzipBytes * RELATIVE_HEADROOM),
        GZIP_MINIMUM_HEADROOM_BYTES,
      ),
  }
}

function isMetric(value) {
  return (
    value &&
    Number.isSafeInteger(value.rawBytes) &&
    value.rawBytes >= 0 &&
    Number.isSafeInteger(value.gzipBytes) &&
    value.gzipBytes >= 0
  )
}

export function validateMetricsDocument(document, label) {
  if (!document || document.schemaVersion !== 1 || !document.metrics) {
    throw new Error(`${label} verwendet kein unterstütztes Bundle-Metrikformat.`)
  }

  for (const [key, metric] of Object.entries(document.metrics)) {
    if (!isMetric(metric)) {
      throw new Error(`${label} enthält ungültige Werte für ${key}.`)
    }
  }
}

export function compareBundleMetrics(baseline, current) {
  validateMetricsDocument(baseline, 'Die Bundle-Baseline')
  validateMetricsDocument(current, 'Der aktuelle Bundle-Report')

  const violations = []
  const baselineKeys = new Set(Object.keys(baseline.metrics))
  const currentKeys = new Set(Object.keys(current.metrics))

  for (const key of [...baselineKeys].sort()) {
    if (!currentKeys.has(key)) {
      violations.push({ type: 'missing-current', key })
      continue
    }

    const baselineMetric = baseline.metrics[key]
    const currentMetric = current.metrics[key]
    const budget = calculateBudget(baselineMetric)

    for (const measurement of ['rawBytes', 'gzipBytes']) {
      if (currentMetric[measurement] > budget[measurement]) {
        violations.push({
          type: 'over-budget',
          key,
          measurement,
          baseline: baselineMetric[measurement],
          budget: budget[measurement],
          current: currentMetric[measurement],
        })
      }
    }
  }

  for (const key of [...currentKeys].sort()) {
    if (!baselineKeys.has(key)) {
      violations.push({ type: 'missing-baseline', key })
    }
  }

  return violations
}

export function formatBytes(value) {
  return `${new Intl.NumberFormat('de-DE').format(value)} Bytes`
}

export function formatBundleViolations(violations) {
  return violations.map((violation) => {
    if (violation.type === 'missing-baseline') {
      return `- ${violation.key}: keine Baseline vorhanden`
    }

    if (violation.type === 'missing-current') {
      return `- ${violation.key}: im aktuellen Build nicht gefunden`
    }

    const measurement = violation.measurement === 'rawBytes' ? 'roh' : 'gzip'
    return `- ${violation.key} (${measurement}): Baseline ${formatBytes(violation.baseline)}, Budget ${formatBytes(violation.budget)}, aktuell ${formatBytes(violation.current)}`
  })
}
