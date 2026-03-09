type CalendarDayProps = {
  dayName: string;
  monthDay: string;
  todos?: Array<{ text: string; completed: boolean }>;
};

export const CalendarDay: React.FC<CalendarDayProps> = ({
  dayName,
  monthDay,
  todos = [],
}) => {
  return (
    <div className="flex flex-col bg-gray-800 py-2 h-full border-r border-gray-700 last:border-r-0">
      {/* Day header */}
      <div className="flex justify-between items-start mb-2 px-3">
        <time className="text-xs font-semibold text-white">
          {monthDay}
        </time>
        <span className="text-xs font-medium text-gray-400">
          {dayName}
        </span>
      </div>

      {/* Todos list */}
      <div className="flex-1 overflow-y-auto min-h-0 pb-4">
        {todos.map((todo, index) => (
          <div key={index} className="px-3 py-2">
            <div className="flex gap-3">
              {/* Checkbox */}
              <div className="flex h-5 shrink-0 items-center">
                <div className="grid size-4 grid-cols-1">
                  <input
                    type="checkbox"
                    checked={todo.completed}
                    readOnly
                    className="col-start-1 row-start-1 appearance-none rounded-sm border border-gray-600 bg-gray-900"
                    style={{ pointerEvents: 'none' }}
                  />
                </div>
              </div>
              {/* Todo text */}
              <div
                className="flex-1 min-w-0 text-white text-sm leading-5"
                style={{
                  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                }}
              >
                {todo.text}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
