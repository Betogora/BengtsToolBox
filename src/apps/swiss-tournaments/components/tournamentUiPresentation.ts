import type {
  ByeScore,
  PlayerStatus,
  Tournament,
} from '@/apps/swiss-tournaments/types';
import { type TranslationKey } from '@/lib/i18n';
import { cn } from '@/lib/utils';

export const tournamentWebsiteQrUrl = '/qrcode.svg'

export const byeScoreOptions: Array<{
  value: ByeScore
  label: string
  labelEn: string
}> = [
  { value: 1, label: '1 Punkt', labelEn: '1 point' },
  { value: 0.5, label: '1/2 Punkt', labelEn: '1/2 point' },
  { value: 0, label: '0 Punkte', labelEn: '0 points' },
]

export function tournamentFormatLabelKey(
  format?: Tournament['format'],
): TranslationKey {
  if (format === 'roundRobin') {
    return 'swiss.format.roundRobin'
  }
  if (format === 'handAndBrain') {
    return 'swiss.format.handAndBrain'
  }
  if (format === 'marioKart') {
    return 'swiss.format.marioKart'
  }

  return 'swiss.format.swiss'
}

export function plannedUnitLabelKey(
  format?: Tournament['format'],
): TranslationKey {
  return format === 'marioKart' ? 'swiss.plannedMarioKartRaces' : 'swiss.rounds'
}

export function completedUnitLabelKey(
  format?: Tournament['format'],
): TranslationKey {
  return format === 'marioKart' ? 'swiss.marioKartGames' : 'swiss.rounds'
}

export const marioKartRankGradients: Record<number | 'default', readonly string[]> = {
  1: ['#fff7a8', '#ffd83f', '#b58c18', '#ffe877'],
  2: ['#ffffff', '#dff6f7', '#9fb3bb', '#f4ffff'],
  3: ['#ffe6ca', '#d99c62', '#a56936', '#f7cfaa'],
  default: ['#f4f7f8', '#9aa8ae', '#4d6870', '#c8d2d6'],
}

export function formatPoints(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(2).replace(/0+$/, '').replace(/\.$/, '')
}

export function ordinalSuffix(rank: number) {
  const remainder = rank % 100

  if (remainder >= 11 && remainder <= 13) {
    return 'th'
  }

  switch (rank % 10) {
    case 1:
      return 'st'
    case 2:
      return 'nd'
    case 3:
      return 'rd'
    default:
      return 'th'
  }
}

export const statusLabelKeys: Record<PlayerStatus, TranslationKey> = {
  active: 'swiss.status.active',
  inactive: 'swiss.status.inactive',
  withdrawn: 'swiss.status.withdrawn',
}

export function playerName(tournament: Tournament, playerId?: string) {
  return tournament.players.find((player) => player.id === playerId)?.name ?? '-'
}

export function statusVariant(status: PlayerStatus) {
  if (status === 'active') {
    return 'default' as const
  }

  return status === 'inactive' ? ('secondary' as const) : ('outline' as const)
}

export const pairingHintBadgeClassName = 'type-action uppercase'

export const fixedPairingHintClassName = cn(
  pairingHintBadgeClassName,
  'inline-flex items-center overflow-hidden rounded-md border border-yellow-300 bg-yellow-100 text-yellow-950',
)
