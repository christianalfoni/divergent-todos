export function getWeekdaysForThreeWeeks() {
  const today = new Date()
  const currentDay = today.getDay()

  // Calculate days offset to get to Monday of current week
  const daysToCurrentMonday = currentDay === 0 ? 6 : currentDay - 1

  const weekdays: Date[] = []

  // Start from Monday of current week
  const startDate = new Date(today)
  startDate.setDate(today.getDate() - daysToCurrentMonday)

  // Add 10 weekdays (Monday-Friday for 2 weeks)
  let addedDays = 0
  let currentDate = new Date(startDate)

  while (addedDays < 10) {
    const dayOfWeek = currentDate.getDay()
    // Only add Monday (1) through Friday (5)
    if (dayOfWeek >= 1 && dayOfWeek <= 5) {
      weekdays.push(new Date(currentDate))
      addedDays++
    }
    currentDate.setDate(currentDate.getDate() + 1)
  }

  return weekdays
}

export function formatDayName(date: Date): string {
  return date.toLocaleDateString('en-US', { weekday: 'long' })
}

export function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export function formatHeader(date: Date): string {
  return `${formatDayName(date)} - ${formatDate(date)}`
}

export function isToday(date: Date): boolean {
  const today = new Date()
  return date.toDateString() === today.toDateString()
}

export function getDateId(date: Date): string {
  return date.toISOString().split('T')[0]
}

export function getNextMonday(): Date {
  const today = new Date()
  const dayOfWeek = today.getDay()

  // Calculate days until next Monday
  // If Sunday (0), add 1 day. If Saturday (6), add 2 days
  const daysUntilMonday = dayOfWeek === 0 ? 1 : dayOfWeek === 6 ? 2 : 0

  const nextMonday = new Date(today)
  nextMonday.setDate(today.getDate() + daysUntilMonday)
  nextMonday.setHours(0, 0, 0, 0)

  return nextMonday
}

export function isNextMonday(date: Date): boolean {
  const today = new Date()
  const dayOfWeek = today.getDay()
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6

  if (!isWeekend) return false

  const nextMonday = getNextMonday()
  return date.toDateString() === nextMonday.toDateString()
}

export function getCurrentWeekStart(): Date {
  const today = new Date()
  const currentDay = today.getDay()
  const daysToMonday = currentDay === 0 ? 6 : currentDay - 1

  const monday = new Date(today)
  monday.setDate(today.getDate() - daysToMonday)
  monday.setHours(0, 0, 0, 0)

  return monday
}

export function getNextWeekEnd(): Date {
  const currentWeekStart = getCurrentWeekStart()

  // Next week ends on Friday (4 days after next Monday)
  const nextWeekEnd = new Date(currentWeekStart)
  nextWeekEnd.setDate(currentWeekStart.getDate() + 11) // 7 days + 4 days (Mon-Fri)
  nextWeekEnd.setHours(23, 59, 59, 999)

  return nextWeekEnd
}
