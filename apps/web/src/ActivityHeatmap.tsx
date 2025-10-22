import { getMonthDays, getWeekDayIndex, getActivityColor, getSequentialWeek } from './utils/activity';

interface ActivityHeatmapProps {
  year: number;
  month: number;
  activityData: Map<string, number>;
  onDayClick: (year: number, week: number) => void;
}

export default function ActivityHeatmap({ year, month, activityData, onDayClick }: ActivityHeatmapProps) {
  const days = getMonthDays(year, month);
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  // Group days by week (Mon-Fri only)
  const weeks: Date[][] = [];
  let currentWeek: Date[] = [];

  days.forEach(day => {
    const weekDayIndex = getWeekDayIndex(day);
    if (weekDayIndex === -1) return; // Skip weekends

    if (weekDayIndex === 0 && currentWeek.length > 0) {
      // Start of new week
      weeks.push(currentWeek);
      currentWeek = [];
    }
    currentWeek.push(day);
  });

  if (currentWeek.length > 0) {
    weeks.push(currentWeek);
  }

  const handleDayClick = (day: Date) => {
    const { year, week } = getSequentialWeek(day);
    onDayClick(year, week);
  };

  return (
    <div className="activity-heatmap">
      <div className="activity-header">
        <h2>{monthNames[month]} {year}</h2>
      </div>

      <div className="activity-grid">
        {/* Day headers */}
        <div className="activity-day-headers">
          <div>Mon</div>
          <div>Tue</div>
          <div>Wed</div>
          <div>Thu</div>
          <div>Fri</div>
        </div>

        {/* Weeks */}
        {weeks.map((week, weekIndex) => (
          <div key={weekIndex} className="activity-week">
            {[0, 1, 2, 3, 4].map(dayIndex => {
              const day = week.find(d => getWeekDayIndex(d) === dayIndex);
              if (!day) {
                return <div key={dayIndex} className="activity-day activity-empty" />;
              }

              const dateKey = day.toISOString().split('T')[0];
              const count = activityData.get(dateKey) || 0;
              const colorClass = getActivityColor(count);

              return (
                <div
                  key={dayIndex}
                  className={`activity-day ${colorClass}`}
                  onClick={() => handleDayClick(day)}
                  title={`${monthNames[day.getMonth()]} ${day.getDate()}: ${count} todos completed`}
                >
                  <span className="activity-day-number">{day.getDate()}</span>
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="activity-legend">
        <span className="activity-legend-label">Less</span>
        <div className="activity-0" />
        <div className="activity-1" />
        <div className="activity-2" />
        <div className="activity-3" />
        <div className="activity-4" />
        <span className="activity-legend-label">More</span>
      </div>
    </div>
  );
}
