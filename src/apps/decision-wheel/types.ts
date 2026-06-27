export type DecisionWheelEntry = {
  id: string
  text: string
  color: string
  weight: number
  isSuccess?: boolean
}

export type DecisionWheelResult = {
  id: string
  entryId: string
  text: string
  color: string
  weight: number
  isSuccess?: boolean
  createdAt: string
}

export type DecisionWheelState = {
  entries: DecisionWheelEntry[]
  lastResult: DecisionWheelResult | null
  history: DecisionWheelResult[]
  updatedAt?: unknown
  updatedBy?: string
}
