/**
 * Get sequential week number for a given date
 * Week 1 = first Monday-Friday in January
 * Week 2 = second Monday-Friday, etc.
 * This is NOT ISO week numbering - weeks align with calendar year boundary
 */
export function getSequentialWeek(date: Date): { year: number; week: number } {
  const year = date.getFullYear();
  let weekNumber = 0;

  // Iterate through all days from Jan 1 to the target date
  for (let month = 0; month < 12; month++) {
    const days = getMonthDays(year, month);

    for (const day of days) {
      const weekDayIndex = getWeekDayIndex(day);
      if (weekDayIndex === -1) continue; // Skip weekends

      // Start of a new week (Monday)
      if (weekDayIndex === 0) {
        weekNumber++;
      }

      // If we've reached or passed the target date, return the current week
      if (day >= date) {
        return { year, week: weekNumber };
      }
    }
  }

  return { year, week: weekNumber };
}

/**
 * @deprecated Use getSequentialWeek instead. ISO weeks can span year boundaries.
 * Get ISO week number and year for a given date
 * Week starts on Monday, week 1 contains first Thursday
 */
export function getISOWeek(date: Date): { year: number; week: number } {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7; // Make Sunday = 7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum); // Thursday in target week
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return { year: d.getUTCFullYear(), week: weekNo };
}

/**
 * Get day of week index (0=Monday, 4=Friday)
 * Returns -1 for weekends
 */
export function getWeekDayIndex(date: Date): number {
  const day = date.getDay();
  if (day === 0 || day === 6) return -1; // Weekend
  return day - 1; // Convert Sun=0,Mon=1 to Mon=0,Tue=1
}

/**
 * Get all days in a month
 */
export function getMonthDays(year: number, month: number): Date[] {
  const days: Date[] = [];
  const date = new Date(year, month, 1);
  while (date.getMonth() === month) {
    days.push(new Date(date));
    date.setDate(date.getDate() + 1);
  }
  return days;
}

/**
 * Get color intensity class based on completion count
 */
export function getActivityColor(count: number): string {
  if (count === 0) return 'activity-0';
  if (count <= 2) return 'activity-1';
  if (count <= 5) return 'activity-2';
  if (count <= 10) return 'activity-3';
  return 'activity-4';
}

/**
 * Get date range for an ISO week
 */
export function getWeekDateRange(year: number, week: number): { start: Date; end: Date } {
  // Find Thursday of the target week
  const jan4 = new Date(Date.UTC(year, 0, 4));
  const thursday = new Date(jan4.getTime() + ((week - 1) * 7 - (jan4.getDay() || 7) + 4) * 86400000);

  // Get Monday and Friday
  const monday = new Date(thursday);
  monday.setDate(thursday.getDate() - 3);

  const friday = new Date(thursday);
  friday.setDate(thursday.getDate() + 1);

  return { start: monday, end: friday };
}

/**
 * Format date range for display
 */
export function formatWeekRange(year: number, week: number): string {
  const { start, end } = getWeekDateRange(year, week);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  const startMonth = months[start.getMonth()];
  const endMonth = months[end.getMonth()];
  const startDay = start.getDate();
  const endDay = end.getDate();

  if (startMonth === endMonth) {
    return `${startMonth} ${startDay} - ${endDay}`;
  }
  return `${startMonth} ${startDay} - ${endMonth} ${endDay}`;
}

/**
 * Generate mock activity data for UI testing
 */
export function generateMockActivityData(year: number, month: number) {
  const days = getMonthDays(year, month);
  const activityMap = new Map<string, number>();

  // Generate random activity for each weekday
  days.forEach(day => {
    const weekDayIndex = getWeekDayIndex(day);
    if (weekDayIndex === -1) return; // Skip weekends

    // Random chance of activity (70%)
    if (Math.random() > 0.3) {
      const count = Math.floor(Math.random() * 15); // 0-14 completions
      const key = day.toISOString().split('T')[0];
      activityMap.set(key, count);
    }
  });

  return activityMap;
}

/**
 * Generate mock completed todos for a specific week
 */
export function generateMockWeekTodos(year: number, week: number) {
  const { start, end } = getWeekDateRange(year, week);
  const todos: Array<{ date: Date; text: string; url?: string }> = [];

  const sampleTodos = [
    'Finish feature implementation',
    'Review pull requests',
    'Update documentation',
    'Deploy to staging',
    'Run integration tests',
    'Fix authentication bug',
    'Write documentation',
    'Refactor codebase',
    'Update dependencies',
    'Create test cases',
    'Optimize performance',
    'Design new UI components'
  ];

  const current = new Date(start);
  while (current <= end) {
    const weekDayIndex = getWeekDayIndex(current);
    if (weekDayIndex !== -1) {
      // Random number of todos per day (0-5)
      const count = Math.floor(Math.random() * 6);
      for (let i = 0; i < count; i++) {
        todos.push({
          date: new Date(current),
          text: sampleTodos[Math.floor(Math.random() * sampleTodos.length)],
          url: Math.random() > 0.7 ? 'https://github.com' : undefined
        });
      }
    }
    current.setDate(current.getDate() + 1);
  }

  return todos.sort((a, b) => a.date.getTime() - b.date.getTime());
}

/**
 * Extract tag pills from HTML description
 * Parses <span data-tag="tagname"> elements and returns array of tag values
 */
export function extractTags(html: string): string[] {
  const tags: string[] = [];
  const tagRegex = /<span[^>]*data-tag="([^"]+)"[^>]*>/g;
  let match;

  while ((match = tagRegex.exec(html)) !== null) {
    tags.push(match[1]);
  }

  return tags;
}
