import { describe, expect, it } from 'vitest'

import {
  calculateBudget,
  compareBundleMetrics,
  createBundleMetrics,
  formatBundleViolations,
  validateMetricsDocument,
} from './bundleMetrics.mjs'

function chunk(overrides) {
  return {
    type: 'chunk',
    code: '',
    modules: {},
    isEntry: false,
    facadeModuleId: null,
    ...overrides,
  }
}

function asset(overrides) {
  return {
    type: 'asset',
    source: '',
    name: undefined,
    names: [],
    originalFileNames: [],
    ...overrides,
  }
}

describe('bundle metrics', () => {
  it('classifies chunks independently from hashed output names', () => {
    const report = createBundleMetrics({
      'assets/index-abc123.js': chunk({
        fileName: 'assets/index-abc123.js',
        code: 'entry code',
        isEntry: true,
      }),
      'assets/index-def456.css': asset({
        fileName: 'assets/index-def456.css',
        source: 'global css',
      }),
      'assets/paths-abc123.js': chunk({
        fileName: 'assets/paths-abc123.js',
        code: 'firebase code',
        modules: { 'C:\\repo\\node_modules\\@firebase\\firestore\\index.js': {} },
      }),
      'assets/swiss-tournaments-abc123.js': chunk({
        fileName: 'assets/swiss-tournaments-abc123.js',
        code: 'tournament code',
        facadeModuleId: 'C:\\repo\\src\\apps\\swiss-tournaments\\index.ts',
      }),
      'assets/worldTerritories-abc123.js': chunk({
        fileName: 'assets/worldTerritories-abc123.js',
        code: 'world data',
        facadeModuleId:
          'C:\\repo\\src\\apps\\territory-map\\data\\worldTerritories.ts',
      }),
      'assets/questions-abc123.ndjson': asset({
        fileName: 'assets/questions-abc123.ndjson',
        source: '{"question":"value"}',
        originalFileNames: ['src/apps/next-question/data/questions.ndjson'],
      }),
    })

    expect(Object.keys(report.metrics)).toEqual([
      'app:swiss-tournaments',
      'dataset:next-question/questions.ndjson',
      'dataset:territory-map/worldTerritories',
      'entry:css',
      'entry:js',
      'firebase',
    ])
    expect(report.metrics['entry:js'].rawBytes).toBe(Buffer.byteLength('entry code'))
    expect(report.metrics.firebase.rawBytes).toBe(Buffer.byteLength('firebase code'))
  })

  it('uses twenty percent or the minimum absolute headroom', () => {
    expect(calculateBudget({ rawBytes: 1000, gzipBytes: 1000 })).toEqual({
      rawBytes: 1000 + 16 * 1024,
      gzipBytes: 1000 + 4 * 1024,
    })
    expect(calculateBudget({ rawBytes: 100_000, gzipBytes: 30_000 })).toEqual({
      rawBytes: 120_000,
      gzipBytes: 36_000,
    })
  })

  it('accepts exact budgets and reports regressions beyond them', () => {
    const baseline = {
      schemaVersion: 1,
      metrics: { entry: { rawBytes: 100_000, gzipBytes: 30_000 } },
    }
    const exactBudget = {
      schemaVersion: 1,
      metrics: { entry: { rawBytes: 120_000, gzipBytes: 36_000 } },
    }
    const overBudget = {
      schemaVersion: 1,
      metrics: { entry: { rawBytes: 120_001, gzipBytes: 36_001 } },
    }

    expect(compareBundleMetrics(baseline, exactBudget)).toEqual([])
    const violations = compareBundleMetrics(baseline, overBudget)
    expect(violations).toHaveLength(2)
    expect(formatBundleViolations(violations).join('\n')).toContain('Budget')
  })

  it('reports missing and newly added categories', () => {
    const baseline = {
      schemaVersion: 1,
      metrics: { entry: { rawBytes: 1, gzipBytes: 1 } },
    }
    const current = {
      schemaVersion: 1,
      metrics: { newApp: { rawBytes: 1, gzipBytes: 1 } },
    }

    expect(compareBundleMetrics(baseline, current)).toEqual([
      { type: 'missing-current', key: 'entry' },
      { type: 'missing-baseline', key: 'newApp' },
    ])
  })

  it('rejects malformed metric documents', () => {
    expect(() =>
      validateMetricsDocument(
        { schemaVersion: 1, metrics: { entry: { rawBytes: -1, gzipBytes: 2 } } },
        'Test',
      ),
    ).toThrow('ungültige Werte')
    expect(() => validateMetricsDocument({}, 'Test')).toThrow('kein unterstütztes')
  })
})
