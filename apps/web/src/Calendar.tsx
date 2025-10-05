import { useEffect, useState, useMemo } from "react";
import { DndContext, DragOverlay } from "@dnd-kit/core";
import DayCell from "./DayCell";
import TimeBoxDialog from "./TimeBoxDialog";
import WeekendDialog from "./WeekendDialog";
import { useAuthentication } from "./hooks/useAuthentication";
import { useTodoDragAndDrop } from "./hooks/useTodoDragAndDrop";
import { getWeekdaysForThreeWeeks, isToday, getDateId } from "./utils/calendar";
import type { Todo } from "./App";

interface CalendarProps {
  todos: Todo[];
  onAddTodo: (todo: Omit<Todo, "id">) => void;
  onToggleTodoComplete: (todoId: string) => void;
  onMoveTodo: (todoId: string, newDate: string, newIndex?: number) => void;
  onUpdateTodo: (todoId: string, text: string) => void;
  onDeleteTodo: (todoId: string) => void;
}

const isWeekend = () => {
  const day = new Date().getDay();
  return day === 0 || day === 6; // Sunday or Saturday
};

export default function Calendar({
  todos,
  onAddTodo,
  onToggleTodoComplete,
  onMoveTodo,
  onUpdateTodo,
  onDeleteTodo,
}: CalendarProps) {
  const authentication = useAuthentication();
  const [showThreeWeeks, setShowThreeWeeks] = useState(true);
  const [timeBoxTodo, setTimeBoxTodo] = useState<Todo | null>(null);
  const [showWeekendDialog, setShowWeekendDialog] = useState(false);
  const [, setVisibilityTrigger] = useState(0);
  const allWeekdays = useMemo(() => getWeekdaysForThreeWeeks(), []);

  const {
    sensors,
    hoveredDayId,
    handleDragStart,
    handleDragOver,
    handleDragEnd,
    collisionDetection,
  } = useTodoDragAndDrop({ todos, onMoveTodo });

  const getTodosForDate = (date: Date): Todo[] => {
    const dateString = date.toISOString().split("T")[0];
    return todos.filter((todo) => todo.date === dateString);
  };

  const weekdays = useMemo(() => {
    if (showThreeWeeks) {
      return allWeekdays;
    }

    // If it's weekend (Saturday or Sunday), show next week instead of current week
    const today = new Date();
    const dayOfWeek = today.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

    if (isWeekend) {
      // Show next week (second 5 days)
      return allWeekdays.slice(5, 10);
    }

    // Show current week (first 5 days)
    return allWeekdays.slice(0, 5);
  }, [allWeekdays, showThreeWeeks]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Tab") {
        e.preventDefault();
        setShowThreeWeeks((prev) => !prev);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        // Force re-render when tab becomes visible
        setVisibilityTrigger((prev) => prev + 1);

        // Check if it's weekend and show dialog
        if (isWeekend()) {
          setShowWeekendDialog(true);
        } else {
          setShowWeekendDialog(false);
        }
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () =>
      document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, []);

  // Check weekend status on mount
  useEffect(() => {
    if (isWeekend()) {
      setShowWeekendDialog(true);
    }
  }, []);

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={collisionDetection}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="h-full w-full flex flex-col overflow-hidden">
        <div
          className={`grid grid-cols-5 ${
            showThreeWeeks ? "grid-rows-2" : "grid-rows-1"
          } flex-1 divide-x divide-y divide-[var(--color-border-primary)]`}
        >
          {weekdays.map((date, index) => {
            const dayId = getDateId(date);
            return (
              <DayCell
                key={index}
                date={date}
                isToday={isToday(date)}
                isAuthenticated={!!authentication.user}
                todos={getTodosForDate(date)}
                onAddTodo={onAddTodo}
                onToggleTodoComplete={onToggleTodoComplete}
                onUpdateTodo={onUpdateTodo}
                onDeleteTodo={onDeleteTodo}
                onOpenTimeBox={setTimeBoxTodo}
                isBeingDraggedOver={hoveredDayId === dayId}
              />
            );
          })}
        </div>
      </div>
      <DragOverlay dropAnimation={null}>{null}</DragOverlay>
      <TimeBoxDialog
        open={!!timeBoxTodo}
        todo={timeBoxTodo}
        onClose={() => setTimeBoxTodo(null)}
        onComplete={onToggleTodoComplete}
      />
      <WeekendDialog
        open={showWeekendDialog}
        onClose={() => setShowWeekendDialog(false)}
      />
    </DndContext>
  );
}
