import type { WheelId } from './types.ts'

export function wheelIdForDate(date = new Date()): WheelId {
  const month = date.getMonth() + 1
  if (month === 10) return 'halloween'
  if (month === 12) return 'christmas'
  return 'regular'
}

export function wheelLabel(wheel: WheelId): string {
  if (wheel === 'halloween') return 'Halloween'
  if (wheel === 'christmas') return 'Christmas'
  return 'Friday Movie Night'
}
