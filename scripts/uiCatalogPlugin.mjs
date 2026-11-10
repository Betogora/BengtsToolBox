const start = '<!-- ui-catalog-bundle:start -->'
const end = '<!-- ui-catalog-bundle:end -->'
const bundleRegion = new RegExp(`\\n?[ \\t]*${start}[\\s\\S]*?${end}`)
const liveEntry = '  <script type="module" src="../src/uiElements.tsx"></script>'

function removeUiCatalogBundle(html) {
  return html.replace(bundleRegion, '')
}

export function insertUiCatalogBundle(html, { style, script }) {
  const bundle = [
    `  ${start}`,
    `  <style>${style.replaceAll('</style', '<\\/style')}</style>`,
    `  <script>${script.replaceAll('</script', '<\\/script')}</script>`,
    `  ${end}`,
  ].join('\n')
  // Funktion statt String, damit `$`-Folgen im Bundle keine Ersetzungsmuster sind.
  return removeUiCatalogBundle(html).replace('</body>', () => `${bundle}\n</body>`)
}

// docs/ui-elements.html bettet seine Live-Demos für den direkten Dateiaufruf ein.
// Dev-Server und Build ersetzen dieses Bundle durch das Modul aus src.
export function uiCatalogPlugin() {
  return {
    name: 'bengtstoolbox-ui-catalog',
    transformIndexHtml: {
      order: 'pre',
      handler(html, { filename }) {
        if (!filename.replaceAll('\\', '/').endsWith('/docs/ui-elements.html')) return html
        return removeUiCatalogBundle(html).replace('</body>', () => `${liveEntry}\n</body>`)
      },
    },
  }
}
