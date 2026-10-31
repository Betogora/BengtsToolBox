import { existsSync } from 'node:fs'
import { expect, it } from 'vitest'

import { listAvailableSpecs, selectBrowserSpecs, specDependencies } from './selectBrowserSpecs.mjs'

const specs = listAvailableSpecs().sort()

it.each([
  ['an app file', ['src/apps/triathlon-tracker/TriathlonTrackerPage.tsx'], ['segmented-controls', 'triathlon-tracker']],
  ['an app shared by several specs', ['src/apps/territory-map/TerritoryMapCanvas.tsx'], ['color-picker', 'territory-map']],
  ['translations', ['src/lib/i18n/translations.ts', 'src/apps/swiss-tournaments/logic.ts'], ['browser-smoke', 'tournament-smoke']],
  ['an edited spec', ['tests/browser/live-buzzer.spec.ts'], ['live-buzzer']],
])('selects only the specs affected by %s', (_, files, expected) => {
  expect(selectBrowserSpecs(files, specs)).toEqual({ mode: 'some', specs: expected, globalFiles: [] })
})

it.each([
  ['shared UI', 'src/components/ui/button.tsx'],
  ['shared app code', 'src/apps/shared/adminUnlock.ts'],
  ['the registry', 'src/apps/registry.ts'],
  ['the browser fixture', 'tests/browser/browserApp.ts'],
  ['an unknown file', 'some-new-config.json'],
])('runs the full suite for %s', (_, file) => {
  expect(selectBrowserSpecs(['docs/specs.md', file], specs)).toMatchObject({
    mode: 'all',
    specs,
    globalFiles: [file],
  })
})

it('skips browser tests for documentation, rules and unit tests', () => {
  expect(
    selectBrowserSpecs(
      ['README.md', 'docs/specs.html', 'firebase/firestore.rules', 'src/apps/scoreboard/logic.test.ts'],
      specs,
    ),
  ).toEqual({ mode: 'none', specs: [], globalFiles: [] })
})

it('maps every spec to source paths or an app directory of the same name', () => {
  const unmapped = specs.filter(
    (spec) => !(spec in specDependencies) && !existsSync(`src/apps/${spec}`),
  )
  expect(unmapped).toEqual([])
})
