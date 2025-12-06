import { useEffect, useState, useMemo, useCallback } from "react";
import { DndContext, DragOverlay } from "@dnd-kit/core";
import DayCell from "./DayCell";
import SmartEditor from "./SmartEditor";
import TimeBoxDialog from "./TimeBoxDialog";
import WeekendDialog from "./WeekendDialog";
import { useAuthentication } from "./hooks/useAuthentication";
import { useAppFocus } from "./hooks/useAppFocus";
import { useTodoDragAndDrop } from "./hooks/useTodoDragAndDrop";
import { useViewMode } from "./hooks/useViewMode";
import { useOnboarding } from "./contexts/OnboardingContext";
import {
  getWeekdaysForThreeWeeks,
  isToday,
  isNextMonday,
} from "./utils/calendar";
import type { Todo } from "./App";
import type { Profile } from "./firebase";
import { trackTimeboxOpened } from "./firebase/analytics";

interface CalendarProps {
  todos: Todo[];
  isLoading: boolean;
  onAddTodo: (todo: Omit<Todo, "id" | "position"> & { position?: string }) => void;
  onToggleTodoComplete: (todoId: string) => void;
  onMoveTodo: (todoId: string, newDate: string, newIndex?: number) => void;
  onCopyTodo: (todoId: string, newDate: string, newIndex?: number) => void;
  onUpdateTodo: (todoId: string, text: string) => void;
  onDeleteTodo: (todoId: string) => void;
  onMoveIncompleteTodosToToday: () => void;
  hasOldUncompletedTodos: boolean;
  profile: Profile | null;
}

const isWeekend = () => {
  const day = new Date().getDay();
  return day === 0 || day === 6; // Sunday or Saturday
};

export default function Calendar({
  todos,
  isLoading,
  onAddTodo,
  onToggleTodoComplete,
  onMoveTodo,
  onCopyTodo,
  onUpdateTodo,
  onDeleteTodo,
  onMoveIncompleteTodosToToday,
  hasOldUncompletedTodos,
  profile,
}: CalendarProps) {
  const [authentication] = useAuthentication();
  const onboarding = useOnboarding();
  const { viewMode, setViewMode } = useViewMode();
  const [timeBoxTodo, setTimeBoxTodo] = useState<Todo | null>(null);
  const [showWeekendDialog, setShowWeekendDialog] = useState(false);
  const [visibilityTrigger, setVisibilityTrigger] = useState(0);
  const allWeekdays = useMemo(() => getWeekdaysForThreeWeeks(), [visibilityTrigger]);

  // Wrap setTimeBoxTodo to track analytics imperatively
  const handleOpenTimeBox = useCallback((todo: Todo | null) => {
    if (todo) {
      trackTimeboxOpened();
    }
    setTimeBoxTodo(todo);
  }, []);

  const {
    sensors,
    activeTodo,
    isCopyMode,
    handleDragStart,
    handleDragOver,
    handleDragEnd,
  } = useTodoDragAndDrop({ todos, onMoveTodo, onCopyTodo });

  const getTodosForDate = (date: Date): Todo[] => {
    const dateString = date.toISOString().split("T")[0];
    return todos
      .filter((todo) => todo.date === dateString)
      .sort((a, b) => {
        // Use standard string comparison, not localeCompare, to match fractional-indexing library
        if (a.position < b.position) return -1;
        if (a.position > b.position) return 1;
        return 0;
      });
  };

  const weekdays = useMemo(() => {
    if (viewMode === "two-weeks") {
      return allWeekdays;
    }

    // If it's weekend (Saturday or Sunday), show next week instead of current week
    const today = new Date();
    const dayOfWeek = today.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

    if (isWeekend) {
      // Show next week (first 5 days, since allWeekdays starts from next Monday on weekends)
      return allWeekdays.slice(0, 5);
    }

    // Show current week (first 5 days)
    return allWeekdays.slice(0, 5);
  }, [allWeekdays, viewMode]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Tab") {
        e.preventDefault();
        const newViewMode = viewMode === "two-weeks" ? "one-week" : "two-weeks";
        setViewMode(newViewMode);
        // Notify onboarding context about the toggle
        onboarding.notifyWeekModeToggled();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [viewMode, setViewMode, onboarding]);

  // Handle app focus when day changes
  const handleDayChange = useCallback(() => {
    // Force re-render when day changes
    setVisibilityTrigger((prev) => prev + 1);

    // Check if it's weekend, user is authenticated, and user is onboarded
    if (isWeekend() && authentication.user && profile?.isOnboarded) {
      setShowWeekendDialog(true);
    } else {
      setShowWeekendDialog(false);
    }
  }, [authentication.user, profile?.isOnboarded]);

  useAppFocus(handleDayChange);

  // Check weekend status on mount and when authentication/onboarding changes
  useEffect(() => {
    if (isWeekend() && authentication.user && profile?.isOnboarded) {
      setShowWeekendDialog(true);
    }
  }, [authentication.user, profile?.isOnboarded]);

  // Show weekend dialog on every focus (not just day changes)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && isWeekend() && authentication.user && profile?.isOnboarded) {
        setShowWeekendDialog(true);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [authentication.user, profile?.isOnboarded]);

  // Keyboard shortcut for CMD+SHIFT+K to open weekend dialog
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check for Cmd+Shift+K (case insensitive)
      if (e.metaKey && e.shiftKey && (e.key === 'K' || e.key === 'k')) {
        e.preventDefault();
        if (authentication.user && profile?.isOnboarded) {
          setShowWeekendDialog(true);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [authentication.user, profile?.isOnboarded]);

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      {activeTodo && (
        <style>{`
          * {
            cursor: default !important;
            user-select: none !important;
          }
        `}</style>
      )}
      <div className="flex-1 w-full flex flex-col overflow-hidden">
        <div
          className={`grid grid-cols-5 ${
            viewMode === "two-weeks" ? "grid-rows-2" : "grid-rows-1"
          } flex-1 divide-x divide-y divide-[var(--color-border-primary)] min-h-0`}
        >
          {weekdays.map((date, index) => {
            return (
              <DayCell
                key={index}
                date={date}
                isToday={isToday(date)}
                isNextMonday={isNextMonday(date)}
                isAuthenticated={!!authentication.user}
                isLoading={isLoading}
                todos={getTodosForDate(date)}
                allTodos={todos}
                isCopyMode={isCopyMode}
                onAddTodo={onAddTodo}
                onToggleTodoComplete={onToggleTodoComplete}
                onUpdateTodo={onUpdateTodo}
                onDeleteTodo={onDeleteTodo}
                onOpenTimeBox={handleOpenTimeBox}
                onMoveIncompleteTodosToToday={onMoveIncompleteTodosToToday}
                hasOldUncompletedTodos={hasOldUncompletedTodos}
              />
            );
          })}
        </div>
      </div>
      <DragOverlay dropAnimation={null}>
        {activeTodo && (
          <div className="bg-[var(--color-bg-secondary)] px-3 py-1 shadow-xl rotate-3">
            <div className="flex gap-3 text-xs/5">
              <div className="flex h-5 shrink-0 items-center">
                <div className="group/checkbox grid size-4 grid-cols-1">
                  <input
                    disabled
                    type="checkbox"
                    checked={activeTodo.completed}
                    readOnly
                    className="col-start-1 row-start-1 appearance-none rounded-sm border border-[var(--color-border-secondary)] bg-[var(--color-bg-primary)] checked:border-[var(--color-accent-primary)] checked:bg-[var(--color-accent-primary)]"
                  />
                  <svg
                    fill="none"
                    viewBox="0 0 14 14"
                    className="pointer-events-none col-start-1 row-start-1 size-3.5 self-center justify-self-center stroke-white"
                  >
                    <path
                      d="M3 8L6 11L11 3.5"
                      strokeWidth={2}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="opacity-0 group-has-checked/checkbox:opacity-100"
                    />
                  </svg>
                </div>
              </div>
              <div
                className={`flex-1 min-w-0 ${
                  activeTodo.completed
                    ? "line-through text-[var(--color-text-secondary)]"
                    : "text-[var(--color-text-primary)]"
                }`}
              >
                <SmartEditor html={activeTodo.text} editing={false} />
              </div>
            </div>
          </div>
        )}
      </DragOverlay>
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
