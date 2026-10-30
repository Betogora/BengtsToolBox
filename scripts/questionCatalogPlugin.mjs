import { readFile } from 'node:fs/promises'

// Fields read by parseQuestionCatalog; the rest of each NDJSON line is source metadata.
const runtimeFields = ['id', 'category', 'question', 'answer']

export function slimQuestionCatalog(rawCatalog) {
  const lines = rawCatalog
    .split(/\r?\n/)
    .filter((line) => line.trim().length > 0)
    .map((line) => {
      const question = JSON.parse(line)
      return JSON.stringify(Object.fromEntries(runtimeFields.map((field) => [field, question[field]])))
    })

  return `${lines.join('\n')}\n`
}

// Ships only the runtime fields of the quiz catalog; the source file keeps its full metadata.
export function questionCatalogPlugin() {
  return {
    name: 'bengtstoolbox-question-catalog',
    apply: 'build',
    enforce: 'pre',
    async load(id) {
      if (!id.endsWith('/questions.ndjson?url')) {
        return null
      }

      const filePath = id.slice(0, -'?url'.length)
      this.addWatchFile(filePath)
      const referenceId = this.emitFile({
        type: 'asset',
        name: 'questions.ndjson',
        source: slimQuestionCatalog(await readFile(filePath, 'utf8')),
      })

      return `export default import.meta.ROLLUP_FILE_URL_${referenceId}`
    },
  }
}
