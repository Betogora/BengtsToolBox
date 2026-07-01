export type NextQuestion = {
  id: string
  category: string
  question: string
  answer: string
}

export type NextQuestionState = {
  currentIndex: number
  isAnswerVisible: boolean
  updatedBy?: string
}
