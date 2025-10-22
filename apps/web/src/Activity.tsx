import { useState, useMemo, useEffect } from 'react';
import ActivityWeekDetail from './ActivityWeekDetail';
import ActivityDayPopup from './ActivityDayPopup';
import { generateMockActivityData, getMonthDays, getWeekDayIndex, getActivityColor } from './utils/activity';

interface ActivityProps {
  year: number;
}

export default function Activity({ year }: ActivityProps) {
  const [selectedWeek, setSelectedWeek] = useState<{ year: number; week: number } | null>(null);
  const [selectedDay, setSelectedDay] = useState<{
    date: Date;
    todos: Array<{ text: string; url?: string }>;
    position: { x: number; y: number };
  } | null>(null);
  const [showAISummaries, setShowAISummaries] = useState(false);

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

  // Mock AI summaries for each week
  const mockAISummaries: Record<number, string> = useMemo(() => {
    const summaries: Record<number, string> = {};
    const sampleSummaries = [
      'Focused on backend refactoring and API improvements. Completed authentication overhaul and migrated legacy endpoints to REST v2.',
      'UI/UX polish week with component library updates. Implemented new design system patterns and accessibility improvements.',
      'Deep dive into performance optimization. Reduced bundle size by 30% and improved load times across mobile devices.',
      'Team collaboration and code reviews. Helped onboard new engineers while maintaining steady feature development pace.',
      'Sprint planning and architectural decisions. Mapped out Q2 roadmap and evaluated new technologies for upcoming features.',
      'Bug fixes and technical debt cleanup. Addressed critical issues in payment flow and resolved customer-reported edge cases.',
      'Database optimization and query tuning. Implemented caching layer and reduced database load by 45% during peak hours.',
      'Documentation sprint. Updated API docs, wrote internal guides, and created video tutorials for common workflows.',
      'Testing improvements across the stack. Added integration tests and increased code coverage from 65% to 82%.',
      'Feature launch week. Shipped collaborative editing feature and monitored rollout metrics for stability issues.',
    ];

    // Generate summaries for weeks 1-52
    for (let week = 1; week <= 52; week++) {
      // 70% chance of having activity
      if (Math.random() > 0.3) {
        summaries[week] = sampleSummaries[Math.floor(Math.random() * sampleSummaries.length)];
      }
    }

    return summaries;
  }, [year]);

  // TAB key listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Tab' && !selectedWeek && !selectedDay) {
        e.preventDefault();
        setShowAISummaries(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedWeek, selectedDay]);

  // Generate mock data for entire year
  const activityData = useMemo(() => {
    const yearData = new Map<string, number>();
    for (let month = 0; month < 12; month++) {
      const monthData = generateMockActivityData(year, month);
      monthData.forEach((value, key) => {
        yearData.set(key, value);
      });
    }
    return yearData;
  }, [year]);

  const handleDayClick = (date: Date, event: React.MouseEvent) => {
    // Generate mock todos for this day
    const dayTodos = [];
    const dateKey = date.toISOString().split('T')[0];
    const count = activityData.get(dateKey) || 0;

    const sampleTodos = [
      'Finish feature implementation',
      'Review pull requests',
      'Update documentation',
      'Deploy to staging',
      'Run integration tests',
      'Fix authentication bug',
    ];

    for (let i = 0; i < count && i < 6; i++) {
      dayTodos.push({
        text: sampleTodos[i],
        url: Math.random() > 0.7 ? 'https://github.com' : undefined,
      });
    }

    // Calculate popup position
    const rect = (event.target as HTMLElement).getBoundingClientRect();
    const position = {
      x: rect.left + rect.width / 2,
      y: rect.bottom + 8,
    };

    setSelectedDay({ date, todos: dayTodos, position });
  };

  const handleBackToYear = () => {
    setSelectedWeek(null);
  };

  if (selectedWeek) {
    return (
      <div className="flex-1 overflow-y-auto bg-[var(--color-bg-secondary)]">
        <ActivityWeekDetail
          year={selectedWeek.year}
          week={selectedWeek.week}
          onBack={handleBackToYear}
        />
      </div>
    );
  }

  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

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

                      const summary = mockAISummaries[weekNumber];

                      return (
                        <div key={weekIndex} className="activity-week-summary">
                          <strong className="activity-week-label">Week {weekNumber}:</strong>{' '}
                          {summary ? (
                            summary
                          ) : (
                            <span className="activity-no-summary">no activity</span>
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
                    {weeks.map((week, weekIndex) => (
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
                              title={`${monthName} ${day.getDate()}: ${count} todos completed`}
                            />
                          );
                        })}
                      </div>
                    ))}
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
