// Zugplan und Risikoprofil, deterministisch aus dem Spielstand (Logik aus dem Skill).
import { indexOfWord, leftovers, remaining } from './engine'
import { OTHER, type GameState, type Team } from './types'

export type Profile = 'LETZTE_CHANCE' | 'ABSCHLUSS' | 'OFFENSIV' | 'AUSGEGLICHEN' | 'DEFENSIV'

export type TurnPlan = {
  team: Team
  own: number
  opp: number
  ownRest: string[]
  oppRest: string[]
  /** Züge, bis der Gegner voraussichtlich fertig ist (= uns bleibende Züge). */
  turns: number
  /** Begriffe, die über Zweier hinaus mit Dreiern kommen müssen. */
  extra: number
  /** Kleinste zulässige ZAHL bei LETZTE_CHANCE (eigene minus 1, mindestens 1), sonst 0. */
  minNumber: number
  ownTurnsNeeded: number
  profile: Profile
}

/** Kleinste Zugzahl bei 2 Treffern pro Zug plus höchstens einem Rest je Zug. */
export function turnsNeeded(n: number, rest: number): number {
  let t = 0
  while (2 * t + Math.min(rest, t) < n) t++
  return t
}

/**
 * Der Gegner ist in turnsNeeded(Gegner) Zügen fertig; weil wir zuerst raten, bleiben uns genau
 * so viele Züge. Was darüber hinausgeht, müssen Dreier leisten. Ist der Gegner voraussichtlich
 * im nächsten Zug fertig, ist dies die letzte Chance: alle eigenen Karten in diesem Zug.
 */
export function turnPlan(state: GameState, team: Team = state.turn): TurnPlan {
  const own = remaining(state, team)
  const opp = remaining(state, OTHER[team])
  const ownRest = leftovers(state, team)
  const oppRest = leftovers(state, OTHER[team])
  const turns = turnsNeeded(opp, oppRest.length)
  const extra = own - (2 * turns + Math.min(ownRest.length, turns))
  const minNumber = turns === 1 ? Math.max(1, own - 1) : 0
  let profile: Profile
  if (turns === 1) profile = 'LETZTE_CHANCE'
  else if (own <= 2) profile = 'ABSCHLUSS'
  else if (extra > 0) profile = 'OFFENSIV'
  else if (extra >= -1) profile = 'AUSGEGLICHEN'
  else profile = 'DEFENSIV'
  return {
    team,
    own,
    opp,
    ownRest,
    oppRest,
    turns,
    extra,
    minNumber,
    ownTurnsNeeded: turnsNeeded(own, ownRest.length),
    profile,
  }
}

/** Offene eigene Begriffe, die kein Rest eines früheren Hinweises sind. */
export function freshTargets(state: GameState, team: Team = state.turn): string[] {
  const rest = new Set(leftovers(state, team))
  return state.words.filter((w, i) => state.colors[i] === team && !state.revealed[i] && !rest.has(w))
}

/** Lagebeschreibung in Worten für den Prompt. */
export function situationText(state: GameState, plan: TurnPlan = turnPlan(state)): string {
  const up = (words: string[]) => words.join(', ')
  switch (plan.profile) {
    case 'LETZTE_CHANCE': {
      const fresh = freshTargets(state, plan.team)
      let text = `Gegner ist voraussichtlich im nächsten Zug fertig: alle ${plan.own} eigenen Karten in diesem Zug erreichbar machen, also ZAHL mindestens ${plan.minNumber}.`
      if (plan.ownRest.length && fresh.length) {
        text += ` Ziele müssen alle frischen Begriffe umfassen (${up(fresh)}); höchstens ein Rest früherer Hinweise (${up(plan.ownRest)}) bleibt ungenannt für den Zusatzversuch.`
      }
      return text
    }
    case 'ABSCHLUSS':
      return `Höchstens 2 eigene offen: alle ${plan.own} in einem Hinweis, sonst den sichersten einzelnen.`
    case 'OFFENSIV':
      return `Mit Zweiern zu langsam: ${plan.extra} Begriff(e) müssen über Dreier kommen; mindestens 3 Ziele.`
    case 'AUSGEGLICHEN':
      return 'Zweier reichen knapp, ohne Reserve; ein klarer Dreier schafft Luft.'
    case 'DEFENSIV':
      return `${Math.floor(-plan.extra / 2)} Zug/Züge Reserve: Sicherheit vor Menge.`
  }
}

/**
 * Sind nach diesem Hinweis alle eigenen Karten in diesem Zug erreichbar? Höchstens eine eigene
 * Karte darf ungenannt bleiben (Zusatzversuch). Gibt es Reste früherer Hinweise, muss sie einer
 * davon sein, denn nur diese finden die Ratenden gezielt; ohne Reste bleibt es ein Glückstreffer.
 */
export function reachesAll(state: GameState, team: Team, targets: string[]): string | null {
  const meant = new Set(targets.map((t) => indexOfWord(state, t)))
  const rest = leftovers(state, team)
  const uncovered = state.words.filter((_, i) => state.colors[i] === team && !state.revealed[i] && !meant.has(i))
  if (uncovered.length > 1) {
    return `Letzte Chance: ${uncovered.length} eigene Karten bleiben ungenannt (${uncovered.join(', ')}); der Zusatzversuch holt nur eine. Mehr Ziele wählen.`
  }
  const [single] = uncovered
  if (single && rest.length && !rest.includes(single)) {
    return `Letzte Chance: ${single} ist kein Ziel und kein Rest eines früheren Hinweises und bleibt so in diesem Zug unerreichbar. Ungenannt bleiben darf nur ein Rest (${rest.join(', ')}).`
  }
  return null
}
