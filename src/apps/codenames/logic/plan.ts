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
  /** Kleinste zulässige ZAHL bei LETZTE_CHANCE, sonst 0. */
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
  const minNumber = turns === 1 ? own - (ownRest.length > 0 ? 1 : 0) : 0
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
      let text = `Gegner ist voraussichtlich im nächsten Zug fertig: alle ${plan.own} eigenen Karten in diesem Zug erreichbar machen.`
      if (plan.ownRest.length && fresh.length) {
        text += ` Ziele müssen alle frischen Begriffe umfassen (${up(fresh)}); Reste früherer Hinweise (${up(plan.ownRest)}) holen die Ratenden über den Zusatzversuch (höchstens einen) oder über „unbegrenzt“.`
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
 * Sind nach diesem Hinweis alle eigenen Karten in diesem Zug erreichbar?
 * Nicht gemeinte eigene Karten müssen Reste früherer Hinweise sein; bei einer festen ZAHL
 * darf höchstens eine davon offen bleiben (Zusatzversuch).
 */
export function reachesAll(state: GameState, team: Team, number: number | null, targets: string[]): string | null {
  const meant = new Set(targets.map((t) => indexOfWord(state, t)))
  const rest = new Set(leftovers(state, team))
  const uncovered = state.words.filter((_, i) => state.colors[i] === team && !state.revealed[i] && !meant.has(i))
  const unreachable = uncovered.filter((w) => !rest.has(w))
  if (unreachable.length) {
    return `Letzte Chance: ${unreachable.join(', ')} ist kein Ziel und kein Rest eines früheren Hinweises und bleibt so in diesem Zug unerreichbar.`
  }
  if (number !== null && number !== 0 && uncovered.length > 1) {
    return `Letzte Chance: Mit ZAHL ${number} bleiben ${uncovered.length} Reste offen (${uncovered.join(', ')}); der Zusatzversuch holt nur einen. Mehr Ziele oder „unbegrenzt“ wählen.`
  }
  return null
}
