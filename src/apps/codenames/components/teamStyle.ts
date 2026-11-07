import type { CardColor, Team } from '@/apps/codenames/logic/types'
import type { TranslationKey } from '@/lib/i18n'

export const TEAM_LABEL_KEY: Record<Team, TranslationKey> = {
  rot: 'codenames.team.rot',
  blau: 'codenames.team.blau',
}

export const COLOR_LABEL_KEY: Record<CardColor, TranslationKey> = {
  rot: 'codenames.color.rot',
  blau: 'codenames.color.blau',
  neutral: 'codenames.color.neutral',
  attentaeter: 'codenames.color.attentaeter',
}

/** Volle Kartenfarbe (aufgedeckt). */
export const SOLID: Record<CardColor, string> = {
  rot: 'border-[var(--cn-red)] bg-[var(--cn-red)] text-white',
  blau: 'border-[var(--cn-blue)] bg-[var(--cn-blue)] text-white',
  neutral: 'border-[var(--cn-neutral)] bg-[var(--cn-neutral)] text-[var(--cn-neutral-foreground)]',
  attentaeter: 'border-[var(--cn-assassin)] bg-[var(--cn-assassin)] text-[var(--cn-assassin-foreground)]',
}

/** Auflösung: nicht aufgedeckte Karten zart bzw. gestrichelt, damit sie sich von aufgedeckten abheben. */
export const SOFT: Record<CardColor, string> = {
  rot: 'border-2 border-[var(--cn-red)] bg-[var(--cn-red-soft)] text-[var(--cn-red-text)]',
  blau: 'border-2 border-[var(--cn-blue)] bg-[var(--cn-blue-soft)] text-[var(--cn-blue-text)]',
  neutral: 'border-2 border-dashed border-border-strong bg-card text-card-foreground',
  attentaeter: 'border-2 border-[var(--cn-assassin)] bg-[var(--cn-assassin)] text-[var(--cn-assassin-foreground)]',
}

export const BADGE: Record<Team, string> = {
  rot: 'bg-[var(--cn-red)] text-white',
  blau: 'bg-[var(--cn-blue)] text-white',
}

export const DOT: Record<CardColor, string> = {
  rot: 'bg-[var(--cn-red)]',
  blau: 'bg-[var(--cn-blue)]',
  neutral: 'bg-[var(--cn-neutral)] ring-1 ring-border-strong',
  attentaeter: 'bg-[var(--cn-assassin)]',
}
