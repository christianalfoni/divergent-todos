import { useState, useMemo, useEffect, useCallback } from 'react';
import ActivityDayPopup from './ActivityDayPopup';
import { useAppFocus } from './hooks/useAppFocus';
import { getMonthDays, getWeekDayIndex, getActivityColor, getSequentialWeek } from './utils/activity';
import type { ActivityWeek } from './firebase/types/activity';

interface ActivityProps {
  year: number;
  activityWeeks: ActivityWeek[];
  loading: boolean;
  onLoaded?: () => void;
}

export default function Activity({ year, activityWeeks, loading, onLoaded }: ActivityProps) {
  const [selectedDay, setSelectedDay] = useState<{
    date: Date;
    todos: Array<{ text: string; url?: string }>;
    position: { x: number; y: number };
  } | null>(null);
  const [showAISummaries, setShowAISummaries] = useState(false);
  const [visibilityTrigger, setVisibilityTrigger] = useState(0);

  // Get current week number for highlighting (recalculates when visibilityTrigger changes)
  const today = useMemo(() => new Date(), [visibilityTrigger]);
  const currentWeekInfo = useMemo(() => getSequentialWeek(today), [today]);
  const currentWeekNumber = currentWeekInfo.week;
  const currentYear = currentWeekInfo.year;

  // Helper to check if a day is in the current week
  const isCurrentWeek = (day: Date): boolean => {
    const dayWeekInfo = getSequentialWeek(day);
    return dayWeekInfo.week === currentWeekNumber && dayWeekInfo.year === currentYear;
  };

  // Handle app focus when day changes - recalculate current week
  const handleDayChange = useCallback(() => {
    // Force re-render to recalculate current week
    setVisibilityTrigger((prev) => prev + 1);
  }, []);

  useAppFocus(handleDayChange);

  // Calculate sequential week numbers starting from first Monday in January
  const weekNumbers = useMemo(() => {
    const weekMap = new Map<string, number>();
    let currentWeekNumber = 0;
    let lastWeekStart: Date | null = null;

    for (let month = 0; month < 12; month++) {
      const days = getMonthDays(year, month);

      days.forEach(day => {
        const weekDayIndex = getWeekDayIndex(day);
        if (weekDayIndex === -1) return; // Skip weekends

        // Start of a new week (Monday)
        if (weekDayIndex === 0) {
          currentWeekNumber++;
          lastWeekStart = day;
        }

        // Assign this day's week number
        if (lastWeekStart) {
          const dateKey = day.toISOString().split('T')[0];
          weekMap.set(dateKey, currentWeekNumber);
        }
      });
    }

    return weekMap;
  }, [year]);

  // Build AI summaries map from activity data
  const aiSummaries: Record<number, string> = useMemo(() => {
    const summaries: Record<number, string> = {};
    activityWeeks.forEach(week => {
      if (week.aiSummary) {
        summaries[week.week] = week.aiSummary;
      }
    });
    return summaries;
  }, [activityWeeks]);

  // Notify parent when loading is complete
  useEffect(() => {
    if (!loading && onLoaded) {
      onLoaded();
    }
  }, [loading, onLoaded]);

  // TAB key listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Tab' && !selectedDay) {
        e.preventDefault();
        setShowAISummaries(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedDay]);

  // Build activity data map (date -> count) by counting completedTodos per day
  const activityData = useMemo(() => {
    const dataMap = new Map<string, number>();

    activityWeeks.forEach(week => {
      // Count todos per date
      week.completedTodos.forEach(todo => {
        const count = dataMap.get(todo.date) || 0;
        dataMap.set(todo.date, count + 1);
      });
    });

    return dataMap;
  }, [activityWeeks]);

  const handleDayClick = (date: Date, event: React.MouseEvent) => {
    const dateKey = date.toISOString().split('T')[0];

    // Find todos from activity weeks data
    let dayTodos: Array<{ text: string; url?: string }> = [];

    for (const week of activityWeeks) {
      const todosForDay = week.completedTodos.filter(todo => todo.date === dateKey);
      if (todosForDay.length > 0) {
        dayTodos = todosForDay.map(todo => ({
          text: todo.text,
          url: todo.hasUrl ? 'url-placeholder' : undefined,
        }));
        break;
      }
    }

    // Don't open popup if there are no todos
    if (dayTodos.length === 0) {
      return;
    }

    // Calculate popup position
    const rect = (event.target as HTMLElement).getBoundingClientRect();
    const position = {
      x: rect.left + rect.width / 2,
      y: rect.bottom + 8,
    };

    setSelectedDay({ date, todos: dayTodos, position });
  };

  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-[var(--color-bg-secondary)]">
        <p className="text-[var(--color-text-secondary)]">Loading reflection...</p>
      </div>
    );
  }

  return (
    <>
      <div className="flex-1 overflow-hidden bg-[var(--color-bg-secondary)]">
        <div className="h-full p-4">
          {/* Year Grid - All 12 months */}
          <div className="activity-year-grid">
          {months.map((monthName, monthIndex) => {
            const days = getMonthDays(year, monthIndex);

            // Group days by week (Mon-Fri only)
            const weeks: Date[][] = [];
            let currentWeek: Date[] = [];

            days.forEach(day => {
              const weekDayIndex = getWeekDayIndex(day);
              if (weekDayIndex === -1) return; // Skip weekends

              if (weekDayIndex === 0 && currentWeek.length > 0) {
                weeks.push(currentWeek);
                currentWeek = [];
              }
              currentWeek.push(day);
            });

            if (currentWeek.length > 0) {
              weeks.push(currentWeek);
            }

            // Pad to 5 weeks for consistent layout
            while (weeks.length < 5) {
              weeks.push([]);
            }

            return (
              <div key={monthIndex} className="activity-month-block">
                <h3 className="activity-month-title">{monthName}</h3>

                {showAISummaries ? (
                  // AI Summary View
                  <div className="activity-ai-summary-view">
                    {weeks.map((week, weekIndex) => {
                      // Get week number from first day in the week
                      const firstDay = week.length > 0 ? week[0] : null;

                      // Skip empty weeks (no days)
                      if (!firstDay) return null;

                      // Get sequential week number
                      const dateKey = firstDay.toISOString().split('T')[0];
                      const weekNumber = weekNumbers.get(dateKey);

                      if (!weekNumber) return null;

                      const summary = aiSummaries[weekNumber];

                      return (
                        <div key={weekIndex} className="activity-week-summary">
                          <strong className="activity-week-label">Week {weekNumber}:</strong>{' '}
                          {summary ? (
                            summary
                          ) : (
                            <span className="activity-no-summary">no reflection</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  // Heatmap View
                  <div className="activity-month-grid">
                    {/* Day headers */}
                    <div className="activity-day-headers-compact">
                      <div>M</div>
                      <div>T</div>
                      <div>W</div>
                      <div>T</div>
                      <div>F</div>
                    </div>

                    {/* Weeks */}
                    {weeks.map((week, weekIndex) => {
                      // Check if this week is the current week
                      const firstDay = week.length > 0 ? week[0] : null;
                      const isCurrentWeekRow = firstDay && isCurrentWeek(firstDay);

                      if (isCurrentWeekRow) {
                        // Format date range for current week
                        const lastDay = week[week.length - 1];
                        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                        const startMonth = monthNames[firstDay.getMonth()];
                        const endMonth = monthNames[lastDay.getMonth()];
                        const startDate = firstDay.getDate();
                        const endDate = lastDay.getDate();

                        const dateRange = startMonth === endMonth
                          ? `${startMonth} ${startDate} - ${endDate}`
                          : `${startMonth} ${startDate} - ${endMonth} ${endDate}`;

                        // Render as unified "Ongoing" container
                        return (
                          <div
                            key={weekIndex}
                            className="activity-week-in-progress"
                          >
                            {dateRange} - Ongoing
                          </div>
                        );
                      }

                      // Regular week rendering
                      return (
                        <div key={weekIndex} className="activity-week-compact">
                          {[0, 1, 2, 3, 4].map(dayIndex => {
                            const day = week.find(d => getWeekDayIndex(d) === dayIndex);
                            if (!day) {
                              return <div key={dayIndex} className="activity-day-compact activity-empty" />;
                            }

                            const dateKey = day.toISOString().split('T')[0];
                            const count = activityData.get(dateKey) || 0;
                            const colorClass = getActivityColor(count);

                            return (
                              <div
                                key={dayIndex}
                                className={`activity-day-compact ${colorClass}`}
                                onClick={(e) => handleDayClick(day, e)}
                                title={`${monthName} ${day.getDate()}: ${count} focus completed`}
                              />
                            );
                          })}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>

    {selectedDay && (
      <ActivityDayPopup
        date={selectedDay.date}
        todos={selectedDay.todos}
        position={selectedDay.position}
        onClose={() => setSelectedDay(null)}
      />
    )}
  </>
  );
}
