// Läuft nur im KI-Proxy. Ein Prompt pro Zugwechsel: Spielstand als JSON an OpenRouter, Antwort
// deterministisch prüfen, bei Regelverstoß genau ein zweiter Versuch. Der Schlüssel taucht nie in
// Meldungen oder Logs auf.
import { indexOfWord, type NewClue } from '../logic/engine'
import { reachesAll, situationText, turnPlan } from '../logic/plan'
import { OTHER, type GameState } from '../logic/types'
import { displayWord, norm } from '../logic/wordlist'

export const SYSTEM_PROMPT = `Du bist Geheimdienstchef in einer Partie Codenames und gibst dem Team in "team" den nächsten
Hinweis. Du willst das Spiel gewinnen, nicht einen originellen Hinweis geben.

## Spielregeln
- Auf dem Brett liegen 25 Begriffe. Jede Karte gehört zu Team Rot oder Team Blau, ist neutral
  oder ist der Attentäter. Das Startteam hat 9 Karten, das andere 8, dazu 7 neutrale und genau
  einen Attentäter.
- Nur die beiden Geheimdienstchefs kennen die Farben. Die Ratenden sehen nur die Begriffe und
  die bereits aufgedeckten Karten.
- Ein Hinweis besteht aus genau einem Wort und einer ZAHL. Die ZAHL sagt, wie viele offene
  Begriffe des eigenen Teams der Hinweis meint.
- Die Ratenden decken nacheinander Karten auf, mindestens eine, höchstens ZAHL + 1. Der
  Zusatzversuch ist für einen eigenen Begriff gedacht, den ein früherer Hinweis meinte und der
  noch offen ist (Rest). Die Ratenden dürfen jederzeit passen.
- Eigene Karte: Das Team darf weiterraten. Neutrale Karte: Der Zug endet. Gegnerische Karte: Der
  Zug endet, und der Gegner kommt seinem Sieg näher. Attentäter: Das Team verliert sofort.
- Es gewinnt das Team, dessen Karten zuerst alle aufgedeckt sind, auch wenn der Gegner die
  letzte davon aufdeckt.

## Regeln für den Hinweis
- Genau ein deutsches Wort; Eigennamen sind erlaubt. Keine Wortgruppe.
- Der Hinweis zielt nur auf die Bedeutung. Keine Anspielung auf Buchstaben, Wortlänge, Reim,
  Schreibweise oder Position auf dem Brett.
- Der Hinweis teilt mit keinem offenen Begriff einen Wortbestandteil: nicht der Begriff selbst
  oder eine Wortform davon (Plural, Verkleinerung, Ableitung), kein Wort, das einen offenen
  Begriff oder einen seiner Bestandteile enthält, und kein Wort, das in einem offenen Begriff
  steckt. Liegt „Zahnarzt“ aus, sind „Arzt“, „Arztpraxis“, „Zahn“ und „Zahnbürste“ tabu.
- Keine Übersetzung eines offenen Begriffs in eine andere Sprache (bei „Nacht“ nicht „Night“)
  und keine Umschreibung seiner Schreibweise oder Aussprache. Aufgedeckte Begriffe sind frei.
- Kein Wort aus "verwendeteHinweise".
- ZAHL ist eine ganze Zahl von 1 bis 9. Es gibt weder "unbegrenzt" noch 0.
- "ziele" nennt genau ZAHL offene eigene Begriffe, geschrieben wie auf dem Brett. Reste früherer
  Hinweise ("lage.resteEigen") dürfen mitgemeint sein und zählen dann zur ZAHL.

## Lage
"lage.profil" sagt, wie viel dieser Zug leisten muss:
- LETZTE_CHANCE: Der Gegner gewinnt voraussichtlich im nächsten Zug. ZAHL mindestens
  "lage.mindestZahl" (eigene offene Karten minus 1), damit mit dem Zusatzversuch alle eigenen
  Karten in diesem Zug erreichbar sind. Der eine ungenannte Begriff muss ein Rest aus
  "lage.resteEigen" sein, falls es Reste gibt; sonst darf es ein beliebiger eigener Begriff sein,
  den die Ratenden mit etwas Glück trotzdem finden. Wähle einen möglichst umfassenden Begriff und
  nimm Nähe zu neutralen und gegnerischen Karten in Kauf. Ein vorsichtiger kleiner Hinweis
  verliert hier fast sicher.
- ABSCHLUSS: höchstens 2 eigene Karten offen; beide in einem Hinweis, sonst den sichersten
  einzelnen.
- OFFENSIV: Mit Zweier-Hinweisen seid ihr zu langsam; mindestens 3 Ziele, kleiner nur, wenn kein
  Dreier den Attentäter sicher fernhält.
- AUSGEGLICHEN: bester erwarteter Ertrag bei klarer Abgrenzung; ein sauberer Dreier schafft Luft.
- DEFENSIV: Ihr liegt vorn; Sicherheit vor Menge. Begriffe, die mit gegnerischen Karten oder dem
  Attentäter kollidieren, dürfen warten.

## Vorgehen
1. Lies alle offenen Begriffe: eigene, gegnerische, neutrale und den Attentäter. Jeder Begriff,
   der nicht dem eigenen Team gehört, ist eine Falle.
2. Verteile die eigenen Begriffe gedanklich auf die verbleibenden Züge (5 in 2 Zügen = 3 + 2) und
   lass keine Einzelgänger zurück, die sich später kaum noch verbinden lassen.
3. Sammle Kandidaten aus allen Quellen: Oberbegriff (Bad → Schwamm, Becken, Spiegel),
   zusammengesetztes Wort (See → Seepferd, Seekrake), Redewendung, Eigenname, Film oder Buch
   (Hannibal → Elefant, Berg), Doppelbedeutung eines Ziels (Kiefer als Baum und Knochen).
4. Prüfe jeden Kandidaten aus Sicht der Ratenden, als kenntest du die Farben nicht: Ordne alle
   offenen Begriffe danach, wie wahrscheinlich ein durchschnittlicher deutschsprachiger
   Mitspieler sie zu diesem Hinweis wählt. Ein Kandidat taugt nur, wenn die gemeinten Begriffe
   die ersten ZAHL Plätze belegen. Steht auf Platz ZAHL + 1 eine gegnerische Karte, ist er
   riskant; landet der Attentäter weit vorn, ist er verboten.
5. Nutze die ganze Breite des Wortschatzes: Alltagswörter, Eigennamen, Fachbegriffe,
   Redewendungen, Popkultur. Entscheidend ist, dass aufmerksame erwachsene Mitspieler die
   Verbindung nachvollziehen, sobald sie den Hinweis hören; offensichtlich muss sie nicht sein.
   Sehr entlegene Wörter und Verbindungen über mehrere Ecken sind riskant. Ein bloßes Synonym für
   einen einzelnen Begriff ist erlaubt, bringt aber wenig.
6. Wäge Menge und Sicherheit gegeneinander ab: Ein zusätzliches Ziel lohnt sich, wenn es die
   übrigen nicht unsicherer macht und keine Falle nach vorn rückt.
7. Der Attentäter bleibt fern, in jedem Profil. Verwirf jeden Hinweis, bei dem eine naheliegende
   Brücke zum Attentäter führt, auch über Redewendungen, zusammengesetzte Wörter, Filme oder
   Lieder.

Antworte ausschließlich mit JSON nach dem Schema: {"hinweis": Wort, "zahl": ZAHL, "ziele": [Begriffe]}.`

export const RESPONSE_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['hinweis', 'zahl', 'ziele'],
  properties: {
    hinweis: { type: 'string' },
    zahl: { type: 'integer' },
    ziele: { type: 'array', items: { type: 'string' } },
  },
} as const

const up = (w: string) => displayWord(w)

/** Spielstand für den Prompt: alle offenen Begriffe nach Farbe, Lage und Verlauf beider Teams. */
export function buildPromptState(state: GameState) {
  const team = state.turn
  const plan = turnPlan(state)
  const open = (pred: (c: string) => boolean) =>
    state.words.filter((_, i) => !state.revealed[i] && pred(state.colors[i]!)).map(up)
  return {
    team,
    brett: {
      eigene: open((c) => c === team),
      gegner: open((c) => c === OTHER[team]),
      neutral: open((c) => c === 'neutral'),
      attentaeter: open((c) => c === 'attentaeter')[0] ?? '',
    },
    lage: {
      eigeneOffen: plan.own,
      gegnerOffen: plan.opp,
      resteEigen: plan.ownRest.map(up),
      profil: plan.profile,
      ...(plan.profile === 'LETZTE_CHANCE' ? { mindestZahl: plan.minNumber } : {}),
      hinweis: situationText(state, plan),
    },
    // Gegnerische Hinweise hört der Geheimdienstchef mit, ihre gemeinten Ziele kennt er nicht.
    verlauf: state.clues.map((c) => ({
      team: c.team,
      hinweis: up(c.word),
      zahl: c.number,
      ...(c.team === team ? { ziele: c.targets.map(up) } : {}),
      geraten: c.results.map((r) => up(r.word)),
    })),
    verwendeteHinweise: state.clues.map((c) => up(c.word)),
  }
}

export type ValidationResult = { ok: true; clue: NewClue } | { ok: false; error: string }

/** Deterministische Prüfung einer Modellantwort gegen Regeln und Lage. */
export function validateResponse(raw: unknown, state: GameState): ValidationResult {
  const errors: string[] = []
  const fail = (error: string): ValidationResult => ({ ok: false, error })
  if (!raw || typeof raw !== 'object') return fail('Die Antwort ist kein JSON-Objekt nach dem Schema.')
  const data = raw as { hinweis?: unknown; zahl?: unknown; ziele?: unknown }
  if (typeof data.hinweis !== 'string') return fail('Das Feld "hinweis" fehlt.')

  const word = data.hinweis.trim()
  if (!/\p{L}/u.test(word)) return fail('Der Hinweis braucht genau ein Wort mit mindestens einem Buchstaben.')
  if (/\s/.test(word)) return fail(`„${word}“ ist mehr als ein Wort; erlaubt ist genau ein Wort.`)
  const nw = norm(word)

  state.words.forEach((w, i) => {
    if (state.revealed[i]) return
    const nb = norm(w)
    if (nw === nb) errors.push(`„${up(word)}“ ist ein offener Begriff.`)
    else if ((nb.length >= 3 && nw.includes(nb)) || (nw.length >= 3 && nb.includes(nw))) {
      errors.push(`„${up(word)}“ überschneidet sich mit dem offenen Begriff „${up(w)}“.`)
    }
  })
  if (state.clues.some((c) => norm(c.word) === nw)) errors.push(`„${up(word)}“ wurde schon als Hinweis verwendet.`)

  const number = typeof data.zahl === 'string' && /^\d+$/.test(data.zahl.trim()) ? Number(data.zahl) : data.zahl
  if (typeof number !== 'number' || !Number.isInteger(number) || number < 1 || number > 9) {
    return fail('ZAHL muss eine ganze Zahl von 1 bis 9 sein; "unbegrenzt" gibt es nicht.')
  }

  const team = state.turn
  const targets: string[] = []
  for (const t of Array.isArray(data.ziele) ? data.ziele : []) {
    if (typeof t !== 'string') {
      errors.push('Jedes Ziel muss ein Begriff vom Brett sein.')
      continue
    }
    const i = indexOfWord(state, t)
    if (i < 0 || state.revealed[i] || state.colors[i] !== team) {
      errors.push(`Ziel „${up(t)}“ ist kein offener eigener Begriff.`)
      continue
    }
    if (targets.includes(state.words[i]!)) {
      errors.push(`Ziel „${up(t)}“ ist doppelt genannt.`)
      continue
    }
    targets.push(state.words[i]!)
  }
  if (targets.length !== number && !errors.some((e) => e.startsWith('Ziel'))) {
    errors.push(`ZAHL ${number}, aber ${targets.length} Ziele genannt; die Anzahl der Ziele muss ZAHL entsprechen.`)
  }

  const plan = turnPlan(state)
  if (plan.profile === 'LETZTE_CHANCE' && errors.length === 0) {
    if (number < plan.minNumber) {
      errors.push(`Letzte Chance: Mit ZAHL ${number} sind nicht alle ${plan.own} eigenen Karten in diesem Zug erreichbar. ZAHL mindestens ${plan.minNumber} wählen.`)
    } else {
      const unreachable = reachesAll(state, team, targets)
      if (unreachable) errors.push(unreachable)
    }
  }

  if (errors.length) return fail(errors.join(' '))
  return { ok: true, clue: { word: up(word), number, targets } }
}

/** Liest JSON aus der Modellantwort, auch wenn es in einem Codeblock steckt. */
export function parseModelJson(content: string): unknown {
  const trimmed = content.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '')
  try {
    return JSON.parse(trimmed)
  } catch {
    const start = trimmed.indexOf('{')
    const end = trimmed.lastIndexOf('}')
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(trimmed.slice(start, end + 1))
      } catch {
        /* fällt unten durch */
      }
    }
    return undefined
  }
}

export class HintError extends Error {}

export type HintConfig = {
  apiKey?: string
  model?: string
  reasoning?: string
  fetchImpl?: typeof fetch
  timeoutMs?: number
}

export const isPlaceholder = (config: HintConfig) => !config.apiKey || !config.model

export type GeneratedClue = NewClue & { attempts: number; durationMs: number; source: string }

type ChatMessage = { role: 'system' | 'user' | 'assistant'; content: string }

async function callOpenRouter(config: HintConfig, messages: ChatMessage[]): Promise<string> {
  const fetchImpl = config.fetchImpl ?? fetch
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), config.timeoutMs ?? 120_000)
  const body: Record<string, unknown> = {
    model: config.model,
    messages,
    response_format: {
      type: 'json_schema',
      json_schema: { name: 'codenames_hinweis', strict: true, schema: RESPONSE_SCHEMA },
    },
  }
  const effort = config.reasoning?.trim() || 'medium'
  if (effort !== 'none') body.reasoning = { effort }
  let response: Response
  try {
    response = await fetchImpl('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://bengtstoolbox.web.app',
        'X-Title': 'BengtsToolBox Codenames',
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    })
  } catch (error) {
    const aborted = (error as Error)?.name === 'AbortError'
    throw new HintError(aborted ? 'Das Modell hat zu lange gebraucht.' : 'OpenRouter ist nicht erreichbar.')
  } finally {
    clearTimeout(timer)
  }
  const payload = (await response.json().catch(() => null)) as
    | { choices?: { message?: { content?: string | null } }[]; error?: { message?: string } }
    | null
  if (!response.ok || payload?.error) {
    const detail = payload?.error?.message ? `: ${payload.error.message}` : ''
    throw new HintError(`OpenRouter meldet Fehler ${response.status}${detail}`.slice(0, 300))
  }
  const content = payload?.choices?.[0]?.message?.content
  if (typeof content !== 'string' || !content.trim()) throw new HintError('Das Modell hat keine Antwort geliefert.')
  return content
}

/** Baut die beiden Nachrichten des ersten Aufrufs: fester Systemprompt plus Spielstand als JSON. */
export function promptMessages(state: GameState): ChatMessage[] {
  return [
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user', content: JSON.stringify(buildPromptState(state)) },
  ]
}

/** Fragt das Modell (höchstens zwei Aufrufe) oder nutzt ohne Schlüssel den Platzhalter. */
export async function generateClue(state: GameState, config: HintConfig): Promise<GeneratedClue> {
  const started = Date.now()
  if (isPlaceholder(config)) {
    return { ...placeholderClue(state), attempts: 0, durationMs: Date.now() - started, source: 'platzhalter' }
  }
  const messages = promptMessages(state)
  let lastError = ''
  for (let attempt = 1; attempt <= 2; attempt++) {
    const content = await callOpenRouter(config, messages)
    const parsed = parseModelJson(content)
    const result = parsed === undefined
      ? ({ ok: false, error: 'Die Antwort war kein gültiges JSON nach dem Schema.' } as const)
      : validateResponse(parsed, state)
    if (result.ok) {
      return { ...result.clue, attempts: attempt, durationMs: Date.now() - started, source: config.model! }
    }
    lastError = result.error
    messages.push(
      { role: 'assistant', content },
      { role: 'user', content: `Ungültig: ${result.error} Wähle einen anderen Hinweis.` },
    )
  }
  throw new HintError(`Das Modell hat zweimal einen ungültigen Hinweis geliefert (${lastError})`)
}

const PLACEHOLDER_WORDS = ['Platzhalter', 'Probelauf', 'Testhinweis', 'Übungswort', 'Geheimtipp']

/** Ohne Modell: regelkonformer Platzhalter-Hinweis, damit die App durchspielbar bleibt. */
export function placeholderClue(state: GameState): NewClue {
  const plan = turnPlan(state)
  const own = state.words.filter((_, i) => state.colors[i] === state.turn && !state.revealed[i])
  let targets: string[]
  if (plan.profile === 'LETZTE_CHANCE') {
    // Ungenannt bleibt höchstens ein Rest; ohne Reste werden alle eigenen Karten gemeint.
    const skip = plan.ownRest.find((r) => own.includes(r))
    targets = own.filter((w) => w !== skip)
    if (!targets.length) targets = own.slice(0, 1)
  } else targets = own.slice(0, Math.min(2, own.length))
  for (let n = 0; n < 50; n++) {
    for (const base of PLACEHOLDER_WORDS) {
      const word = n === 0 ? base : `${base}${n + 1}`
      const result = validateResponse({ hinweis: word, zahl: targets.length, ziele: targets }, state)
      if (result.ok) return result.clue
    }
  }
  throw new HintError('Kein Platzhalter-Hinweis möglich.')
}
