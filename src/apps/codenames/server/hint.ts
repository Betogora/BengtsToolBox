// Läuft nur im KI-Proxy. Ein Prompt pro Zugwechsel: Spielstand als JSON an OpenRouter, Antwort deterministisch prüfen,
// bei Regelverstoß genau ein zweiter Versuch. Der Schlüssel taucht nie in Meldungen oder Logs auf.
import { indexOfWord, leftovers, type NewClue } from '../logic/engine'
import { reachesAll, situationText, turnPlan } from '../logic/plan'
import { CONFIDENCE_LEVELS, OTHER, type Confidence, type GameState } from '../logic/types'
import type { Calibration } from '../logic/protocol'
import { displayWord, norm } from '../logic/wordlist'

export const SYSTEM_PROMPT = `Du bist Geheimdienstchef in Codenames und gibst dem Team in "team" einen Hinweis. Du willst
das Spiel gewinnen, nicht einen schönen Hinweis geben. Du kennst die Farben aller offenen
Karten ("brett"); die Ratenden kennen sie nicht.

Regeln für den Hinweis: genau ein deutsches Wort (Eigennamen erlaubt), nur über die Bedeutung.
Kein offener Begriff, kein Wortteil oder keine Wortform davon, keine Anspielung auf Position,
Buchstaben oder Wortlänge, kein Wort aus "verwendeteHinweise". ZAHL = Anzahl der gemeinten
Begriffe; die Ratenden dürfen ZAHL + 1 Mal raten. "unbegrenzt" erlaubt beliebig viele Versuche.

Rangfolge:
1. Die Lage bestimmt, wie viel dieser Zug leisten muss ("lage.profil"):
   - LETZTE_CHANCE: Der Gegner gewinnt voraussichtlich im nächsten Zug. Mache alle eigenen
     Karten in diesem Zug erreichbar: ZAHL ≥ "mindestZahl", oder einen Hinweis für die frischen
     Ziele mit ZAHL "unbegrenzt", damit die Ratenden die Reste früherer Hinweise nachraten.
     Ein vorsichtiger kleiner Hinweis verliert hier fast sicher. Gegner- und neutrale Nähe in
     Kauf nehmen.
   - ABSCHLUSS: höchstens 2 eigene offen; alle in einem Hinweis, sonst den sichersten einzelnen.
   - OFFENSIV: mit Zweiern zu langsam; mindestens 3 Ziele, kleiner nur, wenn kein Dreier den
     Attentäter fernhält. Neutrale Nähe ist in Ordnung.
   - AUSGEGLICHEN: bester erwarteter Ertrag bei klarer Abgrenzung; ein klarer Dreier schafft Luft.
   - DEFENSIV: Sicherheit vor Menge; Begriffe, die mit Gegner oder Attentäter kollidieren,
     dürfen warten.
2. Der Attentäter bleibt fern – in jedem Profil. Er beendet das Spiel. Verwirf jeden Hinweis,
   bei dem der Attentäter unter den ersten ZAHL + 1 Begriffen der Ratenden landen könnte oder
   eine naheliegende Brücke zu ihm führt: Redewendung, zusammengesetztes Wort, Trinkspruch,
   Film, Lied (Kelch → "Prost, auf das Glück" → Glück).
3. Innerhalb dieser Grenzen zählt der erwartete Ertrag über das restliche Spiel.

Vorgehen:
- Verteile die eigenen Begriffe gedanklich auf die verbleibenden Züge (5 in 2 Zügen = 3 + 2)
  und lass keine Einzelgänger zurück.
- Suche Kandidaten aus allen Quellen: Oberbegriff (Bad → Schwamm, Becken, Spiegel),
  zusammengesetztes Wort (See → Seepferd, Seekrake), Redewendung, Eigenname, Film
  (Hannibal → Elefant, Berg), Doppelbedeutung eines Ziels (Kiefer als Baum und Knochen).
  Reste früherer Hinweise dürfen mitgemeint sein.
- Ordne für jeden Kandidaten alle offenen Begriffe so, wie ein durchschnittlicher
  deutschsprachiger Mitspieler sie ohne Farbkenntnis nennen würde – als kenntest du die
  Ziele nicht. Es zählt die Rangfolge.
- Wähle den Kandidaten mit dem höchsten erwarteten Ertrag, der Lage und Attentäter-Grenze
  erfüllt.

Schätze die Zuversicht je Ziel ehrlich (sicher, wahrscheinlich, wackelig) und eiche sie an
"trefferquote". Nenne im Feld "gefahrenfeld" bis zu 8 Wörter, die spontan zum Attentäter
führen; dein Hinweis darf keines davon sein.

Antworte ausschließlich mit JSON nach dem vorgegebenen Schema.`

export const RESPONSE_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['gefahrenfeld', 'hinweis'],
  properties: {
    gefahrenfeld: { type: 'array', items: { type: 'string' } },
    hinweis: {
      type: 'object',
      additionalProperties: false,
      required: ['wort', 'zahl', 'ziele'],
      properties: {
        wort: { type: 'string' },
        zahl: { anyOf: [{ type: 'integer' }, { type: 'string', enum: ['unbegrenzt'] }] },
        ziele: {
          type: 'array',
          items: {
            type: 'object',
            additionalProperties: false,
            required: ['wort', 'zuversicht'],
            properties: {
              wort: { type: 'string' },
              zuversicht: { type: 'string', enum: [...CONFIDENCE_LEVELS] },
            },
          },
        },
      },
    },
  },
} as const

export type { Calibration }

const up = (w: string) => displayWord(w)

/** Spielstand für den Prompt (Beispiel siehe app-vorschlag.md, Abschnitt 4). */
export function buildPromptState(state: GameState, calibration?: Calibration) {
  const team = state.turn
  const plan = turnPlan(state)
  const open = (pred: (c: string) => boolean) =>
    state.words.filter((_, i) => !state.revealed[i] && pred(state.colors[i]!)).map(up)
  const trefferquote: Partial<Record<Confidence, string>> = {}
  for (const level of CONFIDENCE_LEVELS) {
    const [hit, all] = calibration?.[level] ?? [0, 0]
    if (all) trefferquote[level] = `${hit}/${all}`
  }
  return {
    team,
    lage: {
      eigeneOffen: plan.own,
      gegnerOffen: plan.opp,
      resteEigen: plan.ownRest.map(up),
      resteGegner: plan.oppRest.map(up),
      gegnerFertigIn: plan.turns,
      profil: plan.profile,
      ...(plan.profile === 'LETZTE_CHANCE' ? { mindestZahl: plan.minNumber } : {}),
      hinweis: situationText(state, plan),
    },
    brett: {
      eigene: open((c) => c === team),
      gegner: open((c) => c === OTHER[team]),
      neutral: open((c) => c === 'neutral'),
      attentaeter: open((c) => c === 'attentaeter')[0] ?? '',
    },
    verlauf: state.clues
      .filter((c) => c.team === team)
      .map((c) => ({
        team: c.team,
        hinweis: up(c.word),
        zahl: c.number === null ? 'unbegrenzt' : c.number,
        ziele: c.targets.map(up),
        geraten: c.results.map((r) => up(r.word)),
      })),
    verwendeteHinweise: state.clues.map((c) => up(c.word)),
    trefferquote,
  }
}

/** Trefferquote aus Spielen: Ein Ziel gilt als getroffen, wenn es im Zug seines Hinweises geraten wurde. */
export function calibrationFrom(games: Pick<GameState, 'clues'>[]): Calibration {
  const tally = Object.fromEntries(CONFIDENCE_LEVELS.map((l) => [l, [0, 0]])) as Calibration
  for (const g of games) {
    for (const c of g.clues ?? []) {
      for (const [word, level] of Object.entries(c.confidence ?? {})) {
        if (!tally[level as Confidence]) continue
        tally[level as Confidence][1]++
        if (c.results.some((r) => norm(r.word) === norm(word))) tally[level as Confidence][0]++
      }
    }
  }
  return tally
}

export type ValidationResult = { ok: true; clue: NewClue } | { ok: false; error: string }

/** Deterministische Prüfung einer Modellantwort gegen Regeln und Lage. */
export function validateResponse(raw: unknown, state: GameState): ValidationResult {
  const errors: string[] = []
  const fail = (error: string): ValidationResult => ({ ok: false, error })
  if (!raw || typeof raw !== 'object') return fail('Die Antwort ist kein JSON-Objekt nach dem Schema.')
  const data = raw as { gefahrenfeld?: unknown; hinweis?: unknown }
  const hinweis = data.hinweis as { wort?: unknown; zahl?: unknown; ziele?: unknown } | undefined
  if (!hinweis || typeof hinweis !== 'object') return fail('Das Feld "hinweis" fehlt.')
  const dangerField = Array.isArray(data.gefahrenfeld)
    ? data.gefahrenfeld.filter((d): d is string => typeof d === 'string' && d.trim() !== '').map((d) => d.trim())
    : []

  const word = typeof hinweis.wort === 'string' ? hinweis.wort.trim() : ''
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
  const danger = dangerField.find((d) => {
    const nd = norm(d)
    return nd === nw || (nd.length >= 4 && nw.includes(nd)) || (nw.length >= 4 && nd.includes(nw))
  })
  if (danger) errors.push(`„${up(word)}“ liegt im eigenen Gefahrenfeld („${up(danger)}“).`)
  if (state.clues.some((c) => norm(c.word) === nw)) errors.push(`„${up(word)}“ wurde schon als Hinweis verwendet.`)

  let number: number | null
  const rawNumber = hinweis.zahl
  if (rawNumber === 'unbegrenzt' || rawNumber === '∞') number = null
  else if (typeof rawNumber === 'number' || (typeof rawNumber === 'string' && /^\d+$/.test(rawNumber.trim()))) {
    number = Number(rawNumber)
    if (!Number.isInteger(number) || number < 0 || number > 9) return fail('ZAHL muss 0–9 oder „unbegrenzt“ sein.')
  } else return fail('ZAHL muss 0–9 oder „unbegrenzt“ sein.')

  const team = state.turn
  const targets: string[] = []
  const confidence: Record<string, Confidence> = {}
  const rawTargets = Array.isArray(hinweis.ziele) ? hinweis.ziele : []
  for (const entry of rawTargets) {
    const t = typeof entry === 'string' ? entry : (entry as { wort?: unknown })?.wort
    if (typeof t !== 'string') {
      errors.push('Jedes Ziel braucht ein Feld "wort".')
      continue
    }
    const i = indexOfWord(state, t)
    if (i < 0 || state.revealed[i] || state.colors[i] !== team) {
      errors.push(`Ziel „${up(t)}“ ist kein offener eigener Begriff.`)
      continue
    }
    const boardWord = state.words[i]!
    if (targets.includes(boardWord)) {
      errors.push(`Ziel „${up(t)}“ ist doppelt genannt.`)
      continue
    }
    targets.push(boardWord)
    const level = (entry as { zuversicht?: unknown })?.zuversicht
    confidence[boardWord] = CONFIDENCE_LEVELS.includes(level as Confidence) ? (level as Confidence) : 'wahrscheinlich'
  }
  if (number !== null && number > 0 && targets.length !== number && !errors.some((e) => e.startsWith('Ziel'))) {
    errors.push(`ZAHL ${number}, aber ${targets.length} Ziele genannt; die Anzahl der Ziele muss ZAHL entsprechen.`)
  }
  if (number === null && targets.length === 0) errors.push('Bei „unbegrenzt“ mindestens ein Ziel nennen.')

  const plan = turnPlan(state)
  if (plan.profile === 'LETZTE_CHANCE' && errors.length === 0) {
    if (number !== null && number !== 0 && number < plan.minNumber) {
      errors.push(`Letzte Chance: Mit ZAHL ${number} sind nicht alle ${plan.own} eigenen Karten in diesem Zug erreichbar. ZAHL mindestens ${plan.minNumber} oder „unbegrenzt“ wählen.`)
    } else {
      const unreachable = reachesAll(state, team, number, targets)
      if (unreachable) errors.push(unreachable)
    }
  }

  if (errors.length) return fail(errors.join(' '))
  return {
    ok: true,
    clue: { word: up(word), number, targets, confidence, dangerField: dangerField.slice(0, 8) },
  }
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

/** Fragt das Modell (höchstens zwei Aufrufe) oder nutzt ohne Schlüssel den Platzhalter. */
export async function generateClue(
  state: GameState,
  config: HintConfig,
  calibration?: Calibration,
): Promise<GeneratedClue> {
  const started = Date.now()
  if (isPlaceholder(config)) {
    return { ...placeholderClue(state), attempts: 0, durationMs: Date.now() - started, source: 'platzhalter' }
  }
  const messages: ChatMessage[] = [
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user', content: JSON.stringify(buildPromptState(state, calibration), null, 2) },
  ]
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
  const team = state.turn
  const plan = turnPlan(state)
  const own = state.words.filter((_, i) => state.colors[i] === team && !state.revealed[i])
  let targets: string[]
  if (plan.profile === 'LETZTE_CHANCE') {
    const rest = leftovers(state, team)
    const skip = rest.find((r) => own.includes(r))
    targets = own.filter((w) => w !== skip)
    if (!targets.length) targets = own.slice(0, 1)
  } else targets = own.slice(0, Math.min(2, own.length))
  const confidence = Object.fromEntries(targets.map((t) => [t, 'wahrscheinlich' as Confidence]))
  for (let n = 0; n < 50; n++) {
    for (const base of PLACEHOLDER_WORDS) {
      const word = n === 0 ? base : `${base}${n + 1}`
      const result = validateResponse(
        { gefahrenfeld: [], hinweis: { wort: word, zahl: targets.length, ziele: targets.map((wort) => ({ wort, zuversicht: confidence[wort] })) } },
        state,
      )
      if (result.ok) return result.clue
    }
  }
  throw new HintError('Kein Platzhalter-Hinweis möglich.')
}
