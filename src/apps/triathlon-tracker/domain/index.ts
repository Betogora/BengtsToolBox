export {
  addDaysToLocalDate,
  addMonthsToLocalDate,
  getCurrentLocalDate,
  getLocalDateRange,
  getWeekLocalDates,
  getWeekStartLocalDate,
  getWeekStartsInRange,
  isInRollingMonthWindow,
  isValidLocalDate,
} from './dates'
export { getEfficiencyTrend } from './efficiency'
export type { EfficiencyPoint, EfficiencyTrend } from './efficiency'
export {
  analyzeBike,
  analyzeRun,
  analyzeSwim,
  calculateDisciplineProgressIndex,
  calculateOverallProgressIndex,
  getDistanceActivityPerformancePoints,
  getPowerActivityPerformancePoints,
} from './performance'
export type {
  BikeAnalysisOptions,
  DistanceActivityPerformancePoint,
  DistanceAnalysisOptions,
  PowerActivityPerformancePoint,
} from './performance'
export {
  averagePaceReferenceMeters,
  averagePaceSeconds,
  durationSecondsFromAveragePace,
  formatPace,
  kilometersToMeters,
  metersToKilometers,
  minutesToSeconds,
  parsePace,
  paceSecondsPerKilometer,
  secondsToMinutes,
} from './units'
export {
  validateActualTraining,
  validatePlannedTraining,
  validateSettings,
} from './validation'
export { summarizeWeek, summarizeWeeks } from './weeklyStats'
