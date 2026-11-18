import { cn } from '@/lib/utils'

// Podium-Plättchen: Gold, Silber und Bronze für die Plätze 1 bis 3, ab Platz 4 (und Platz 0)
// nur die Ziffer. Größe und Schrift ergänzt der Aufrufer passend zur Zeilenhöhe.
export function getPodiumRankClass(rank: number) {
  return cn(
    'inline-flex shrink-0 items-center justify-center rounded-md tabular-nums',
    rank === 1 && 'bg-podium-1-strong text-foreground',
    rank === 2 && 'bg-podium-2-strong text-foreground',
    rank === 3 && 'bg-podium-3-strong text-foreground',
    (rank < 1 || rank > 3) && 'text-subtle-foreground',
  )
}
