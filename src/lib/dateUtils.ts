/** Returns today's date as a YYYY-MM-DD key (local time). */
export function todayDateKey(): string {
  return new Date().toISOString().slice(0, 10)
}

/** Returns yesterday's date as a YYYY-MM-DD key (local time). */
export function yesterdayDateKey(): string {
  const d = new Date()
  d.setDate(d.getDate() - 1)
  return d.toISOString().slice(0, 10)
}
