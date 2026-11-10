import { readdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { build } from 'vite'

import { insertUiCatalogBundle } from './uiCatalogPlugin.mjs'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const catalogPath = path.join(root, 'docs/ui-elements.html')

// Der Katalog nutzt nur die Metadaten der Registry. Ihre Lazy Loader würden im
// Einzeldatei-Bundle sonst alle Apps samt Fragenkatalog einbetten.
const withoutAppLoaders = {
  name: 'ui-catalog-without-app-loaders',
  transform(code, id) {
    if (!id.replaceAll('\\', '/').endsWith('/src/apps/registry.ts')) return null
    return code.replace(/\bimport\((['"])[^'"]+\1\)/g, 'Promise.reject(new Error("Apps laufen nicht im UI-Katalog"))')
  },
}

// Ein klassisches Skript kennt kein import.meta; als Basis eingebetteter Bilder genügt die Seite.
const withDocumentBase = {
  name: 'ui-catalog-document-base',
  enforce: 'post',
  transform(code) {
    return code.includes('import.meta.url') ? code.replaceAll('import.meta.url', 'document.baseURI') : null
  },
}

// Baut die Live-Demos aus src/uiElements.tsx als ein klassisches Skript samt CSS,
// damit docs/ui-elements.html auch direkt als Datei ohne Server funktioniert.
async function buildBundle() {
  const output = await build({
    configFile: false,
    envDir: false,
    // Bilder aus public/ werden so als Data-URI eingebettet statt absolut verlinkt.
    publicDir: false,
    root,
    logLevel: 'warn',
    plugins: [react(), tailwindcss(), withoutAppLoaders, withDocumentBase],
    resolve: { alias: { '@': path.join(root, 'src') } },
    build: {
      write: false,
      cssCodeSplit: false,
      modulePreload: false,
      assetsInlineLimit: Number.POSITIVE_INFINITY,
      rolldownOptions: {
        input: path.join(root, 'src/uiElements.tsx'),
        output: { format: 'iife', codeSplitting: false },
        // Vites Preload-Helfer bleibt ungenutzt, weil die Registry keine Loader mehr hat.
        onLog: (level, log, handler) => log.code !== 'EMPTY_IMPORT_META' && handler(level, log),
      },
    },
  })
  const files = (Array.isArray(output) ? output : [output]).flatMap((result) => result.output)
  const inlineImages = await publicImageDataUris()
  return {
    script: inlineImages(files.filter((file) => file.type === 'chunk').map((file) => file.code).join('\n')),
    // CSS-Bilder sind Hintergründe von App-Seiten, die im Katalog nicht vorkommen.
    style: files
      .filter((file) => file.type === 'asset' && file.fileName.endsWith('.css'))
      .map((file) => String(file.source))
      .join('\n')
      // Die Seite bettet Manrope selbst ein; der absolute Pfad der App existiert hier nicht.
      .replace(/@font-face\{[^}]*\/fonts\/manrope\/[^}]*\}/g, ''),
  }
}

// Absolute App-Pfade wie /sk-anderten-watermark.png gibt es ohne Server nicht.
async function publicImageDataUris() {
  const publicDir = path.join(root, 'public')
  const types = { '.png': 'image/png', '.svg': 'image/svg+xml' }
  const images = new Map()
  for (const name of await readdir(publicDir)) {
    const type = types[path.extname(name)]
    if (type) images.set(name, `data:${type};base64,${(await readFile(path.join(publicDir, name))).toString('base64')}`)
  }
  return (code) => code.replace(/(?<=["'`(])\/([\w.-]+\.(?:png|svg))(?=["'`)])/g, (match, name) => images.get(name) ?? match)
}

const html = await readFile(catalogPath, 'utf8')
const updated = insertUiCatalogBundle(html, await buildBundle())

if (process.argv.includes('--check')) {
  if (updated !== html) {
    console.error('docs/ui-elements.html enthält veraltete Live-Demos; npm run docs:ui-catalog ausführen.')
    process.exit(1)
  }
  console.log('UI catalog bundle is current.')
} else {
  await writeFile(catalogPath, updated)
  console.log(`docs/ui-elements.html: ${Math.round(Buffer.byteLength(updated) / 1024)} KB`)
}
