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
