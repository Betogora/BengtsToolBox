import { ArrowRight, Coins, Target } from 'lucide-react'
import type { CSSProperties } from 'react'
import { Link } from 'react-router-dom'

import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

type GameApp = {
  id: string
  title: string
  href: string
  color: string
  Icon: typeof Coins
}

const games: GameApp[] = [
  {
    id: 'coinflip',
    title: 'Coinflip',
    href: '/schlag-den-rabe/coinflip',
    color: 'var(--brand-orange)',
    Icon: Coins,
  },
]

function GameTile({ game }: { game: GameApp }) {
  return (
    <Link
      to={game.href}
      aria-label={`${game.title} öffnen`}
      className="group block rounded-lg outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
      style={{ '--tile-color': game.color } as CSSProperties}
    >
      <Card className="relative h-full overflow-hidden transition-colors group-hover:border-[var(--tile-color)] group-hover:bg-card/95">
        <div
          className="absolute inset-x-0 top-0 h-2"
          style={{ backgroundColor: game.color }}
        />
        <CardHeader className="grid min-h-36 gap-6 p-6 pt-7">
          <div className="flex items-start justify-between gap-5">
            <div
              className="flex size-12 shrink-0 items-center justify-center rounded-lg text-white"
              style={{
                backgroundColor: game.color,
                boxShadow: `0 14px 30px -18px ${game.color}`,
              }}
            >
              <game.Icon className="size-6" />
            </div>
            <div
              className="flex size-9 shrink-0 translate-x-1 items-center justify-center rounded-md bg-secondary text-secondary-foreground transition-all group-hover:translate-x-0 group-hover:bg-[var(--tile-color)] group-hover:text-white"
              aria-hidden="true"
            >
              <ArrowRight className="size-4" />
            </div>
          </div>

          <div>
            <CardTitle className="text-2xl leading-tight transition-colors group-hover:text-[var(--tile-color)] sm:text-3xl">
              {game.title}
            </CardTitle>
          </div>
        </CardHeader>
      </Card>
    </Link>
  )
}

export function SchlagDenRabePage() {
  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-7 px-4 py-8 sm:px-6 lg:py-12">
      <section className="grid gap-5 lg:grid-cols-[1.4fr_0.6fr] lg:items-end">
        <div className="max-w-3xl">
          <h1 className="text-4xl font-semibold tracking-normal text-foreground sm:text-5xl">
            Schlag den Raab
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground">
            Wähle ein Spiel und leg direkt los.
          </p>
        </div>

        <Card className="bg-primary text-primary-foreground">
          <CardHeader className="flex-row items-center gap-4 p-4">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-primary-foreground/15">
              <Target className="size-5" />
            </div>
            <div>
              <CardTitle className="text-xl">{games.length} Spiel</CardTitle>
              <CardDescription className="text-primary-foreground/75">
                Wettbewerbe und Mini-Games
              </CardDescription>
            </div>
          </CardHeader>
        </Card>
      </section>

      <section className="grid gap-4 sm:grid-cols-2">
        {games.map((game) => (
          <GameTile key={game.id} game={game} />
        ))}
      </section>
    </div>
  )
}
