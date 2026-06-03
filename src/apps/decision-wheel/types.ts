export type DecisionWheelEntry = {
  id: string
  text: string
  color: string
  weight: number
}

export type DecisionWheelResult = {
  id: string
  entryId: string
  text: string
  color: string
  weight: number
  createdAt: string
}

export type DecisionWheelState = {
  entries: DecisionWheelEntry[]
  lastResult: DecisionWheelResult | null
  history: DecisionWheelResult[]
  removeWinnerAfterSpin?: boolean
  updatedAt?: unknown
  updatedBy?: string
}
