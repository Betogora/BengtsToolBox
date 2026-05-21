export type RollResult = {
  id: string
  value: number
  createdAt: string
}

export type RandomizerState = {
  min: number
  max: number
  lastRoll: number | null
  history: RollResult[]
  updatedBy?: string
}
