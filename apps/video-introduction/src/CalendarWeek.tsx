import { CalendarDay } from './CalendarDay';

type CalendarWeekProps = {
  highlightedTodo?: string;
};

export const CalendarWeek: React.FC<CalendarWeekProps> = ({ highlightedTodo }) => {
  const days = [
    { dayName: 'Mon', monthDay: 'Feb 24' },
    { dayName: 'Tue', monthDay: 'Feb 25' },
    { dayName: 'Wed', monthDay: 'Feb 26' },
    { dayName: 'Thu', monthDay: 'Feb 27' },
    { dayName: 'Fri', monthDay: 'Feb 28' },
  ];

  return (
    <div className="grid grid-cols-5 h-full border-t border-l border-gray-700">
      {days.map((day, index) => (
        <CalendarDay
          key={index}
          dayName={day.dayName}
          monthDay={day.monthDay}
          todos={
            index === 0 && highlightedTodo
              ? [{ text: highlightedTodo, completed: false }]
              : []
          }
        />
      ))}
    </div>
  );
};
