export type CoinflipSide = 'heads' | 'tails'

export type CoinflipResult = {
  id: string
  side: CoinflipSide
  createdAt: string
}

export type CoinflipState = {
  lastFlip: CoinflipResult | null
  history: CoinflipResult[]
  updatedBy?: string
}
