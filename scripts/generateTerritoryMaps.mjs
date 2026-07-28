import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import {
  mkdir,
  mkdtemp,
  readFile,
  rm,
  stat,
  writeFile,
} from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { gzipSync } from 'node:zlib'

const repositoryRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
)
const dataDirectory = path.join(
  repositoryRoot,
  'src',
  'apps',
  'territory-map',
  'data',
)
const metadataPath = path.join(dataDirectory, 'territory-options.source.json')
const mapshaperPath = path.join(
  repositoryRoot,
  'node_modules',
  'mapshaper',
  'bin',
  'mapshaper',
)
const naturalEarthVersion = 'v5.1.2'
const sourceBaseUrl =
  `https://raw.githubusercontent.com/nvkelso/natural-earth-vector/${naturalEarthVersion}/geojson`
const sourceCacheDirectory = path.join(
  tmpdir(),
  `bengtstoolbox-natural-earth-${naturalEarthVersion}`,
)
const isCheck = process.argv.includes('--check')

const sources = {
  countries: {
    fileName: 'ne_10m_admin_0_countries.geojson',
    sha256: '239eec57ac17f100a11e2536cffc56752c318b50ae765b0918ff7aab4ce8f255',
  },
  states: {
    fileName: 'ne_10m_admin_1_states_provinces.geojson',
    sha256: '22d0e3ad85eb3e27f17cabf8ba2d50e554fbc27a87796ff891d958185da62fb5',
  },
  subunits: {
    fileName: 'ne_10m_admin_0_map_subunits.geojson',
    sha256: '76896018b9265072d8063e118e46df765be0ceb54a803b1a2571ebe25b36a071',
  },
}

const mapDefinitions = {
  germany: {
    gzipBudget: 11_000,
    height: 447,
    outputFileName: 'germanyTerritories.ts',
    exportName: 'germanyTerritoryPaths',
    width: 520,
  },
  world: {
    gzipBudget: 38_000,
    height: 520,
    outputFileName: 'worldTerritories.ts',
    exportName: 'worldTerritoryPaths',
    width: 960,
  },
}

function sha256(value) {
  return createHash('sha256').update(value).digest('hex')
}

async function fileExists(filePath) {
  try {
    await stat(filePath)
    return true
  } catch {
    return false
  }
}

async function readVerifiedSource(source) {
  const cachePath = path.join(sourceCacheDirectory, source.fileName)

  if (await fileExists(cachePath)) {
    const cached = await readFile(cachePath)

    if (sha256(cached) === source.sha256) {
      return JSON.parse(cached.toString('utf8'))
    }
  }

  const response = await fetch(`${sourceBaseUrl}/${source.fileName}`)

  if (!response.ok) {
    throw new Error(
      `Natural-Earth-Quelle konnte nicht geladen werden: ${response.status} ${response.statusText}`,
    )
  }

  const value = Buffer.from(await response.arrayBuffer())
  const actualHash = sha256(value)

  if (actualHash !== source.sha256) {
    throw new Error(
      `Prüfsumme für ${source.fileName} stimmt nicht: ${actualHash}`,
    )
  }

  await writeFile(cachePath, value)
  return JSON.parse(value.toString('utf8'))
}

function findSingleFeature(features, predicate, label) {
  const matches = features.filter(predicate)

  if (matches.length !== 1) {
    throw new Error(`${label}: ${matches.length} Geometrien gefunden.`)
  }

  return matches[0]
}

function createFeature(feature, id, order) {
  return {
    ...feature,
    properties: {
      id,
      labelX: feature.properties.LABEL_X ?? feature.properties.longitude,
      labelY: feature.properties.LABEL_Y ?? feature.properties.latitude,
      order,
    },
  }
}

function createWorldFeatures(options, countries, subunits) {
  const ukSourceCodes = {
    'gb-eng': 'ENG',
    'gb-nir': 'NIR',
    'gb-sct': 'SCT',
    'gb-wls': 'WLS',
  }

  return options.map((option, order) => {
    const ukSourceCode = ukSourceCodes[option.id]

    if (ukSourceCode) {
      const feature = findSingleFeature(
        subunits.features,
        (candidate) =>
          candidate.properties.ADM0_A3 === 'GBR' &&
          candidate.properties.SU_A3 === ukSourceCode,
        option.id,
      )

      return createFeature(feature, option.id, order)
    }

    let matches = countries.features.filter(
      (candidate) => candidate.properties.ISO_A2 === option.isoCode,
    )

    if (matches.length !== 1) {
      matches = countries.features.filter(
        (candidate) =>
          candidate.properties.ADM0_A3 === option.isoCode ||
          candidate.properties.ADM0_A3 === option.id.toUpperCase(),
      )
    }

    if (matches.length !== 1) {
      throw new Error(`${option.id}: ${matches.length} Weltgeometrien gefunden.`)
    }

    return createFeature(matches[0], option.id, order)
  })
}

function createGermanyFeatures(options, states) {
  return options.map((option, order) =>
    createFeature(
      findSingleFeature(
        states.features,
        (candidate) => candidate.properties.iso_3166_2 === option.id,
        option.id,
      ),
      option.id,
      order,
    ),
  )
}

function extractAttribute(attributes, name) {
  return attributes.match(new RegExp(`\\b${name}="([^"]+)"`))?.[1]
}

function compactPath(pathData) {
  return pathData
    .trim()
    .replaceAll(/\s+/g, ' ')
    .replaceAll(/([A-Za-z]) /g, '$1')
    .replaceAll(/ ([A-Za-z])/g, '$1')
}

function getCoordinateBounds(featureCollection) {
  const bounds = {
    maxX: Number.NEGATIVE_INFINITY,
    maxY: Number.NEGATIVE_INFINITY,
    minX: Number.POSITIVE_INFINITY,
    minY: Number.POSITIVE_INFINITY,
  }

  function visit(value) {
    if (
      Array.isArray(value) &&
      value.length >= 2 &&
      typeof value[0] === 'number' &&
      typeof value[1] === 'number'
    ) {
      bounds.minX = Math.min(bounds.minX, value[0])
      bounds.maxX = Math.max(bounds.maxX, value[0])
      bounds.minY = Math.min(bounds.minY, value[1])
      bounds.maxY = Math.max(bounds.maxY, value[1])
      return
    }

    value.forEach(visit)
  }

  featureCollection.features.forEach((feature) =>
    visit(feature.geometry.coordinates),
  )
  return bounds
}

function createFallbackPath(feature, featureCollection, definition) {
  const bounds = getCoordinateBounds(featureCollection)
  const scale = Math.min(
    definition.width / (bounds.maxX - bounds.minX),
    definition.height / (bounds.maxY - bounds.minY),
  )
  const offsetX =
    (definition.width - (bounds.maxX - bounds.minX) * scale) / 2
  const offsetY =
    (definition.height - (bounds.maxY - bounds.minY) * scale) / 2
  const x = (feature.properties.labelX - bounds.minX) * scale + offsetX
  const y = (bounds.maxY - feature.properties.labelY) * scale + offsetY

  return `M${x.toFixed(2)} ${y.toFixed(2)}h.2v.2h-.2Z`
}

function readPathsFromSvg(svg, featureCollection, definition) {
  const renderedPaths = [...svg.matchAll(/<path\b([^>]*)\/>/g)]
    .map((match) => {
      const attributes = match[1]

      return {
        id: extractAttribute(attributes, 'data-id'),
        path: compactPath(extractAttribute(attributes, 'd') ?? ''),
      }
    })
  const pathsById = new Map(
    renderedPaths.map((entry) => [entry.id, entry.path]),
  )
  const paths = featureCollection.features.map(
    (feature) =>
      pathsById.get(feature.properties.id) ??
      createFallbackPath(feature, featureCollection, definition),
  )

  if (paths.some((entry) => !entry)) {
    throw new Error(
      'SVG-Pfade stimmen nicht mit den Territoriumsmetadaten überein.',
    )
  }

  return paths
}

function createModule(exportName, paths) {
  return [
    `// Generated from Natural Earth ${naturalEarthVersion} by scripts/generateTerritoryMaps.mjs.`,
    `export const ${exportName}: string[] = [`,
    ...paths.map((value) => `  ${JSON.stringify(value)},`),
    ']',
    '',
  ].join('\n')
}

function generateModule(
  workDirectory,
  mapId,
  definition,
  featureCollection,
  percentage,
) {
  const inputPath = path.join(workDirectory, `${mapId}.geojson`)
  const svgPath = path.join(workDirectory, `${mapId}.svg`)

  return writeFile(inputPath, JSON.stringify(featureCollection)).then(() => {
    execFileSync(
      process.execPath,
      [
        mapshaperPath,
        inputPath,
        '-proj',
        '+proj=eqc',
        '-simplify',
        'weighted',
        `${percentage}%`,
        'keep-shapes',
        '-clean',
        '-o',
        'format=svg',
        `width=${definition.width}`,
        `height=${definition.height}`,
        'margin=0',
        'id-field=id',
        'svg-data=id,order',
        svgPath,
      ],
      { stdio: 'pipe' },
    )

    return readFile(svgPath, 'utf8').then((svg) => {
      const paths = readPathsFromSvg(svg, featureCollection, definition)

      return createModule(definition.exportName, paths)
    })
  })
}

async function findHighestDetailModule(
  workDirectory,
  mapId,
  definition,
  featureCollection,
) {
  let lower = 0.05
  let upper = 100
  let best = null

  for (let iteration = 0; iteration < 12; iteration += 1) {
    const percentage = (lower + upper) / 2
    const module = await generateModule(
      workDirectory,
      mapId,
      definition,
      featureCollection,
      percentage,
    )
    const gzipBytes = gzipSync(module).byteLength

    if (gzipBytes <= definition.gzipBudget) {
      best = { gzipBytes, module, percentage }
      lower = percentage
    } else {
      upper = percentage
    }
  }

  if (!best) {
    throw new Error(`${mapId}: Geometrie passt nicht in das gzip-Budget.`)
  }

  console.log(
    `${mapId}: ${best.percentage.toFixed(4)}%, ${best.gzipBytes} Byte gzip`,
  )
  return best.module
}

async function saveOrCheck(filePath, value) {
  if (isCheck) {
    const current = await readFile(filePath, 'utf8')

    if (current !== value) {
      throw new Error(`${path.relative(repositoryRoot, filePath)} ist nicht aktuell.`)
    }

    return
  }

  await writeFile(filePath, value)
}

async function main() {
  const metadata = JSON.parse(await readFile(metadataPath, 'utf8'))
  const workDirectory = await mkdtemp(
    path.join(tmpdir(), 'bengtstoolbox-territory-maps-'),
  )

  try {
    await mkdir(sourceCacheDirectory, { recursive: true })
    const [countries, states, subunits] = await Promise.all([
      readVerifiedSource(sources.countries),
      readVerifiedSource(sources.states),
      readVerifiedSource(sources.subunits),
    ])
    const featureCollections = {
      germany: {
        type: 'FeatureCollection',
        features: createGermanyFeatures(metadata.germany, states),
      },
      world: {
        type: 'FeatureCollection',
        features: createWorldFeatures(metadata.world, countries, subunits),
      },
    }

    for (const mapId of ['world', 'germany']) {
      const definition = mapDefinitions[mapId]
      const module = await findHighestDetailModule(
        workDirectory,
        mapId,
        definition,
        featureCollections[mapId],
      )

      await saveOrCheck(
        path.join(dataDirectory, definition.outputFileName),
        module,
      )
    }
  } finally {
    await rm(workDirectory, { force: true, recursive: true })
  }
}

await main()
