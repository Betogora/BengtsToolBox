// Wählt die Browser-Specs, die eine Änderung betreffen kann. Unbekannte Pfade gelten
// als gemeinsame Infrastruktur und starten die volle Suite.
import { execFileSync, spawnSync } from 'node:child_process'
import { appendFileSync, readdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const specDirectory = 'tests/browser'
const translationFiles = ['src/lib/i18n/translations.ts', 'src/lib/i18n/englishTranslations.ts']

// Zusätzlich zur Konvention src/apps/<id>/ → tests/browser/<id>.spec.ts.
export const specDependencies = {
  'browser-smoke': [
    'src/apps/coinflip/',
    'src/apps/schlag-den-raab/',
    'src/apps/scoreboard/',
    // Texte gehören meist zur App im selben Commit; der Smoke-Lauf deckt gemeinsame Texte ab.
    ...translationFiles,
  ],
  'color-picker': [
    'src/apps/decision-wheel/',
    'src/apps/progress-dashboard/',
    'src/apps/scoreboard/',
    'src/apps/territory-map/',
  ],
  'live-buzzer-realtime': ['src/apps/live-buzzer/'],
  scoreboard: ['src/apps/decision-wheel/'],
  'segmented-controls': ['src/apps/triathlon-tracker/'],
  'sync-errors': [
    'src/apps/progress-dashboard/',
    'src/apps/randomizer/',
    'src/apps/schlag-den-raab/',
  ],
  'tournament-smoke': ['src/apps/swiss-tournaments/'],
  'ui-elements': ['docs/ui-elements.html', 'src/uiElements.tsx'],
}

// Dateien ohne Einfluss auf die im lokalen Modus ausgelieferte App.
const irrelevantPatterns = [
  /\.md$/,
  /^docs\//,
  /^\.agents\//,
  /^benchmarks\//,
  /^firebase\//,
  /^firebase\.json$/,
  /^functions\//,
  /^scripts\/(checkBundleBudgets|checkFirebaseSpark|generateTerritoryMaps|runTournamentBenchmark|syncSpecsFingerprint|updatePerformanceBaseline)\.mjs$/,
  /^\.github\/workflows\/firebase-backend\.yml$/,
  /^(LICENSE|\.gitignore|eslint\.config\.js|components\.json|visual-review\.config\.mjs)$/,
]

const appFilePattern = /^src\/apps\/(?!shared\/)([^/]+)\//

export function selectBrowserSpecs(changedFiles, availableSpecs) {
  const available = new Set(availableSpecs)
  const selected = new Set()
  const globalFiles = []

  for (const file of changedFiles) {
    if (/\.test\.(ts|mjs)$/.test(file)) continue

    const ownSpec = file.match(/^tests\/browser\/([^/]+)\.spec\.ts$/)
    if (ownSpec) {
      if (available.has(ownSpec[1])) selected.add(ownSpec[1])
      continue
    }

    const dependents = Object.entries(specDependencies)
      .filter(([, prefixes]) => prefixes.some((prefix) => file.startsWith(prefix)))
      .map(([spec]) => spec)
    const appId = file.match(appFilePattern)?.[1]
    if (appId) dependents.push(appId)

    if (appId || dependents.length > 0) {
      for (const spec of dependents) if (available.has(spec)) selected.add(spec)
      continue
    }

    if (!irrelevantPatterns.some((pattern) => pattern.test(file))) globalFiles.push(file)
  }

  if (globalFiles.length > 0) return { mode: 'all', specs: [...available].sort(), globalFiles }
  return { mode: selected.size > 0 ? 'some' : 'none', specs: [...selected].sort(), globalFiles }
}

export function listAvailableSpecs() {
  return readdirSync(specDirectory)
    .filter((name) => name.endsWith('.spec.ts'))
    .map((name) => name.slice(0, -'.spec.ts'.length))
}

function git(...args) {
  return execFileSync('git', args, { encoding: 'utf8' }).split('\n').filter(Boolean)
}

function changedFilesSince(base, includeWorkingTree) {
  if (!includeWorkingTree) return git('diff', '--name-only', base, 'HEAD')
  return [
    ...git('diff', '--name-only', base),
    ...git('ls-files', '--others', '--exclude-standard'),
  ]
}

// CI: --base <sha> schreibt run/specs nach GITHUB_OUTPUT; ohne Basis läuft alles.
// Lokal: --base origin/main --run startet Playwright für Commits und Arbeitsbaum.
function main(args) {
  const baseIndex = args.indexOf('--base')
  const base = baseIndex >= 0 ? args[baseIndex + 1] : ''
  const runLocally = args.includes('--run')
  let selection

  try {
    if (!base) throw new Error('keine Vergleichsbasis')
    selection = selectBrowserSpecs(changedFilesSince(base, runLocally), listAvailableSpecs())
  } catch (error) {
    console.log(`Volle Browser-Suite: ${error instanceof Error ? error.message : error}`)
    selection = { mode: 'all', specs: [], globalFiles: [] }
  }

  if (selection.globalFiles.length > 0) {
    console.log(`Volle Browser-Suite wegen: ${selection.globalFiles.join(', ')}`)
  } else if (selection.mode === 'some') {
    console.log(`Betroffene Browser-Specs: ${selection.specs.join(', ')}`)
  } else if (selection.mode === 'none') {
    console.log('Keine Browser-Specs betroffen.')
  }

  // Bei voller Suite keine Dateiliste, damit auch neue Specs sicher laufen.
  const specArgs =
    selection.mode === 'some'
      ? selection.specs.map((spec) => `${specDirectory}/${spec}.spec.ts`)
      : []

  if (process.env.GITHUB_OUTPUT) {
    appendFileSync(
      process.env.GITHUB_OUTPUT,
      `run=${selection.mode !== 'none'}\nspecs=${specArgs.join(' ')}\n`,
    )
  }

  if (runLocally && selection.mode !== 'none') {
    const result = spawnSync('npx', ['playwright', 'test', ...specArgs], {
      shell: process.platform === 'win32',
      stdio: 'inherit',
    })
    process.exitCode = result.status ?? 1
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main(process.argv.slice(2))
