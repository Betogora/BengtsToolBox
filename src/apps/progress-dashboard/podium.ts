import { cn } from '@/lib/utils'

// Gold, Silber und Bronze für die Plätze 1 bis 3; Platz 0 bleibt neutral.
// Größe und Schrift ergänzt der Aufrufer passend zur Zeilenhöhe.
export function getPodiumRankClass(rank: number) {
  return cn(
    'inline-flex shrink-0 items-center justify-center rounded-md border bg-card tabular-nums',
    rank === 1 && 'border-[#c9961a]/50 bg-podium-1-strong',
    rank === 2 && 'border-[#aab0b8]/60 bg-podium-2-strong',
    rank === 3 && 'border-[#b8794f]/50 bg-podium-3-strong',
  )
}
