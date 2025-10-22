import { formatWeekRange, generateMockWeekTodos } from './utils/activity';
import { useMemo } from 'react';

interface ActivityWeekDetailProps {
  year: number;
  week: number;
  onBack: () => void;
}

export default function ActivityWeekDetail({ year, week, onBack }: ActivityWeekDetailProps) {
  const todos = useMemo(() => generateMockWeekTodos(year, week), [year, week]);

  // Group todos by day
  const todosByDay = useMemo(() => {
    const groups = new Map<string, typeof todos>();
    todos.forEach(todo => {
      const key = todo.date.toISOString().split('T')[0];
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(todo);
    });
    return groups;
  }, [todos]);

  const weekDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  // Get unique dates in order
  const dates = Array.from(todosByDay.keys()).sort();

  return (
    <div className="activity-week-detail">
      <div className="activity-week-header">
        <button onClick={onBack} className="activity-back-button">
          ← Back
        </button>
        <h2>Week {week}, {year}</h2>
        <p className="activity-week-range">{formatWeekRange(year, week)}</p>
      </div>

      <div className="activity-week-content">
        {dates.length === 0 ? (
          <p className="activity-empty-message">No todos completed this week</p>
        ) : (
          dates.map(dateKey => {
            const date = new Date(dateKey);
            const dayTodos = todosByDay.get(dateKey) || [];
            const dayName = weekDays[date.getDay() - 1];
            const monthName = months[date.getMonth()];

            return (
              <div key={dateKey} className="activity-day-group">
                <h3 className="activity-day-header">
                  {dayName}, {monthName} {date.getDate()}
                </h3>
                <ul className="activity-todo-list">
                  {dayTodos.map((todo, index) => (
                    <li key={index} className="activity-todo-item">
                      <span className="activity-todo-check">✓</span>
                      <span className="activity-todo-text">{todo.text}</span>
                      {todo.url && (
                        <a
                          href={todo.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="activity-todo-link"
                        >
                          🔗
                        </a>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
