import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { DndContext, DragOverlay, pointerWithin } from "@dnd-kit/core";
import DayCell, { type DayCellHandle } from "./DayCell";
import SmartEditor from "./SmartEditor";
import FocusDialog from "./FocusDialog";
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
import { trackFocusOpened } from "./firebase/analytics";

interface CalendarProps {
  todos: Todo[];
  isLoading: boolean;
  onAddTodo: (todo: Omit<Todo, "id" | "position"> & { position?: string }) => string | undefined;
  onToggleTodoComplete: (todoId: string) => void;
  onAddSession: (todoId: string, minutes: number, deepFocus: boolean) => void;
  onMoveTodo: (todoId: string, newDate: string, newIndex?: number) => void;
  onCopyTodo: (todoId: string, newDate: string, newIndex?: number) => void;
  onResetTodoForCopy: (todoId: string) => void;
  onAddTodoWithState: (todo: { text: string; date: string; completed: boolean; position?: string }) => void;
  onUpdateTodo: (todoId: string, text: string) => void;
  onDeleteTodo: (todoId: string) => void;
  onOpenBreakDown: (todo: Todo) => void;
  onMoveIncompleteTodosToToday: () => void;
  hasOldUncompletedTodos: boolean;
  profile: Profile | null;
  onFocusStateChange?: (todo: Todo | null, isMinimized: boolean, onRestore: () => void) => void;
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
  onAddSession,
  onMoveTodo,
  onCopyTodo,
  onResetTodoForCopy,
  onAddTodoWithState,
  onUpdateTodo,
  onDeleteTodo,
  onOpenBreakDown,
  onMoveIncompleteTodosToToday,
  hasOldUncompletedTodos,
  profile,
  onFocusStateChange,
}: CalendarProps) {
  const [authentication] = useAuthentication();
  const onboarding = useOnboarding();
  const { viewMode, setViewMode } = useViewMode();
  const [focusTodoId, setFocusTodoId] = useState<string | null>(null);
  const focusTodo = useMemo(() =>
    focusTodoId ? todos.find(t => t.id === focusTodoId) ?? null : null
    , [todos, focusTodoId]);
  const [isFocusMinimized, setIsFocusMinimized] = useState(false);
  const [showWeekendDialog, setShowWeekendDialog] = useState(false);
  const [visibilityTrigger, setVisibilityTrigger] = useState(0);
  const [selectedTodoId, setSelectedTodoId] = useState<string | null>(null);
  const [editModeTodoId, setEditModeTodoId] = useState<string | null>(null);
  const isEditingRef = useRef(false);
  const todoRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const dayCellRefs = useRef<Map<string, DayCellHandle>>(new Map());
  const allWeekdays = useMemo(() => getWeekdaysForThreeWeeks(), [visibilityTrigger]);

  // Wrap setFocusTodo to track analytics imperatively
  const handleOpenFocus = useCallback((todo: Todo | null) => {
    if (todo) {
      trackFocusOpened();
    }
    setFocusTodoId(todo ? todo.id : null);
    setIsFocusMinimized(false);
  }, []);

  const handleMinimizeFocus = useCallback(() => {
    setIsFocusMinimized(true);
  }, []);

  const handleRestoreFocus = useCallback(() => {
    setIsFocusMinimized(false);
  }, []);

  const handleCloseFocus = useCallback(() => {
    setFocusTodoId(null);
    setIsFocusMinimized(false);
  }, []);

  // Notify parent of focus state changes (only when ID or minimize state changes, not when todo data updates)
  useEffect(() => {
    onFocusStateChange?.(focusTodo, isFocusMinimized, handleRestoreFocus);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusTodoId, isFocusMinimized]);

  const {
    sensors,
    activeTodo,
    handleDragStart,
    handleDragOver,
    handleDragEnd,
  } = useTodoDragAndDrop({ todos, onMoveTodo, onCopyTodo, onResetTodoForCopy, onAddTodoWithState });

  // Wrapper for onAddTodo that selects the newly added todo
  const handleAddTodo = useCallback((todo: Omit<Todo, "id" | "position"> & { position?: string }) => {
    const newTodoId = onAddTodo(todo);
    if (newTodoId) {
      setSelectedTodoId(newTodoId);
    }
    return newTodoId;
  }, [onAddTodo]);

  // Callback to notify Calendar when editing state changes
  const handleEditingChange = useCallback((isEditing: boolean) => {
    isEditingRef.current = isEditing;
  }, []);

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

  const orderedTodos = useMemo(() => {
    return todos
      .sort((a, b) => {
        const dateCompare = a.date.localeCompare(b.date);
        if (dateCompare !== 0) return dateCompare;
        // Use standard string comparison, not localeCompare, to match fractional-indexing library
        if (a.position < b.position) return -1;
        if (a.position > b.position) return 1;
        return 0;
      });
  }, [todos]);

  const datesWithTodos = useMemo(() => {
    const dates = Array.from(new Set(todos.map(t => t.date))).sort();
    return dates;
  }, [todos]);

  const scrollTodoIntoView = useCallback((todoId: string) => {
    const element = todoRefs.current.get(todoId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, []);

  // Handle clicks outside todos to deselect
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      // Don't deselect if we just exited edit mode - but reset the flag
      if (isEditingRef.current) {
        isEditingRef.current = false;
        return;
      }

      // Check if click is outside any todo item
      if (!(e.target as HTMLElement).closest('[data-todo-item]')) {
        setSelectedTodoId(null);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, []);

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

  // Keyboard navigation and actions for todos
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Skip if actively editing (check for contenteditable focus)
      if (document.activeElement?.hasAttribute('contenteditable')) return;
      if (['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName || '')) return;

      // Handle arrow keys for navigation
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        e.preventDefault();

        if (!selectedTodoId) {
          // No selection: select first todo of current day (or next Monday if weekend)
          const today = new Date();
          const dayOfWeek = today.getDay();
          const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

          let targetDate: Date;
          if (isWeekend) {
            // Find next Monday
            const daysUntilMonday = dayOfWeek === 0 ? 1 : 2;
            targetDate = new Date(today);
            targetDate.setDate(today.getDate() + daysUntilMonday);
          } else {
            targetDate = today;
          }

          const targetDateString = targetDate.toISOString().split('T')[0];
          const todosOnTargetDate = orderedTodos.filter(t => t.date === targetDateString);
          if (todosOnTargetDate.length > 0) {
            setSelectedTodoId(todosOnTargetDate[0].id);
            scrollTodoIntoView(todosOnTargetDate[0].id);
          }
          return;
        }

        // Handle navigation with selection
        const currentIndex = orderedTodos.findIndex(t => t.id === selectedTodoId);

        if (e.key === 'ArrowUp' && currentIndex > 0) {
          const prevTodo = orderedTodos[currentIndex - 1];
          setSelectedTodoId(prevTodo.id);
          scrollTodoIntoView(prevTodo.id);
        } else if (e.key === 'ArrowDown' && currentIndex < orderedTodos.length - 1) {
          const nextTodo = orderedTodos[currentIndex + 1];
          setSelectedTodoId(nextTodo.id);
          scrollTodoIntoView(nextTodo.id);
        } else if (e.key === 'ArrowLeft') {
          // Navigate to previous day with todos
          const currentTodo = orderedTodos[currentIndex];
          const currentDateIndex = datesWithTodos.indexOf(currentTodo.date);
          if (currentDateIndex > 0) {
            const prevDate = datesWithTodos[currentDateIndex - 1];
            const todosOnPrevDate = orderedTodos.filter(t => t.date === prevDate);
            if (todosOnPrevDate.length > 0) {
              setSelectedTodoId(todosOnPrevDate[0].id);
              scrollTodoIntoView(todosOnPrevDate[0].id);
            }
          }
        } else if (e.key === 'ArrowRight') {
          // Navigate to next day with todos
          const currentTodo = orderedTodos[currentIndex];
          const currentDateIndex = datesWithTodos.indexOf(currentTodo.date);
          if (currentDateIndex < datesWithTodos.length - 1) {
            const nextDate = datesWithTodos[currentDateIndex + 1];
            const todosOnNextDate = orderedTodos.filter(t => t.date === nextDate);
            if (todosOnNextDate.length > 0) {
              setSelectedTodoId(todosOnNextDate[0].id);
              scrollTodoIntoView(todosOnNextDate[0].id);
            }
          }
        }
        return;
      }

      // Handle ESC to deselect
      if (e.key === 'Escape') {
        setSelectedTodoId(null);
        return;
      }

      // Handle action keys (E, T, DEL, SPACE) when todo is selected
      if (!selectedTodoId) return;

      if (e.key === 'e' || e.key === 'E') {
        setEditModeTodoId(selectedTodoId);
      } else if (e.key === 'f' || e.key === 'F') {
        // Don't allow focusing another todo if there's already an active focus
        if (focusTodo) return;
        const todo = todos.find(t => t.id === selectedTodoId);
        if (todo && !todo.completed) {
          handleOpenFocus(todo);
        }
      } else if (e.key === ' ') {
        e.preventDefault(); // Prevent page scroll
        const todo = todos.find(t => t.id === selectedTodoId);
        if (todo) {
          onToggleTodoComplete(selectedTodoId);
        }
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        onDeleteTodo(selectedTodoId);
        // Find next todo to select after deletion
        const currentIndex = orderedTodos.findIndex(t => t.id === selectedTodoId);
        if (currentIndex >= 0 && currentIndex < orderedTodos.length - 1) {
          // Select next todo if available
          setSelectedTodoId(orderedTodos[currentIndex + 1].id);
        } else {
          // No next todo available, deselect
          setSelectedTodoId(null);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedTodoId, orderedTodos, datesWithTodos, todos, focusTodo, handleOpenFocus, onDeleteTodo, onToggleTodoComplete, onCopyTodo, scrollTodoIntoView]);

  // Keyboard shortcut for 'n' to add new todo
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check for 'n' or 'N'
      if (e.key === 'n' || e.key === 'N') {
        // Skip if currently editing
        if (document.activeElement?.hasAttribute('contenteditable')) return;
        if (['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName || '')) return;

        e.preventDefault();

        // Get today's date
        const today = new Date();
        const dayOfWeek = today.getDay();
        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

        let targetDate: Date;
        if (isWeekend) {
          // If it's weekend, target next Monday (first visible day)
          const daysUntilMonday = dayOfWeek === 0 ? 1 : 2; // Sunday: 1 day, Saturday: 2 days
          targetDate = new Date(today);
          targetDate.setDate(today.getDate() + daysUntilMonday);
        } else {
          // Otherwise, target today
          targetDate = today;
        }

        const targetDateString = targetDate.toISOString().split('T')[0];
        const dayCellHandle = dayCellRefs.current.get(targetDateString);
        if (dayCellHandle) {
          dayCellHandle.startAddingTodo();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

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

    const handleWindowFocus = () => {
      if (isWeekend() && authentication.user && profile?.isOnboarded) {
        setShowWeekendDialog(true);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleWindowFocus);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleWindowFocus);
    };
  }, [authentication.user, profile?.isOnboarded]);

  // Restore focus dialog when app loses focus (if minimized)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && isFocusMinimized && focusTodoId) {
        setIsFocusMinimized(false);
      }
    };

    const handleBlur = () => {
      if (isFocusMinimized && focusTodoId) {
        setIsFocusMinimized(false);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleBlur);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleBlur);
    };
  }, [isFocusMinimized, focusTodoId]);

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
      collisionDetection={pointerWithin}
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
          className={`grid grid-cols-5 ${viewMode === "two-weeks" ? "grid-rows-2" : "grid-rows-1"
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
                onAddTodo={handleAddTodo}
                onToggleTodoComplete={onToggleTodoComplete}
                onUpdateTodo={onUpdateTodo}
                onDeleteTodo={onDeleteTodo}
                onOpenFocus={handleOpenFocus}
                onOpenBreakDown={onOpenBreakDown}
                onMoveIncompleteTodosToToday={onMoveIncompleteTodosToToday}
                hasOldUncompletedTodos={hasOldUncompletedTodos}
                selectedTodoId={selectedTodoId}
                onSelectTodo={setSelectedTodoId}
                editModeTodoId={editModeTodoId}
                onEditModeEntered={() => setEditModeTodoId(null)}
                onEditingChange={handleEditingChange}
                todoRefs={todoRefs}
                ref={(el) => {
                  if (el) {
                    dayCellRefs.current.set(date.toISOString().split('T')[0], el);
                  } else {
                    dayCellRefs.current.delete(date.toISOString().split('T')[0]);
                  }
                }}
              />
            );
          })}
        </div>
      </div>
      <DragOverlay dropAnimation={null}>
        {activeTodo && (
          <div className="bg-[var(--color-bg-secondary)] px-3 py-2 shadow-xl rotate-3">
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
                className={`flex-1 min-w-0 ${activeTodo.completed
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
      <FocusDialog
        open={!!focusTodo && !isFocusMinimized}
        todo={focusTodo}
        onClose={handleCloseFocus}
        onMinimize={handleMinimizeFocus}
        onAddSession={onAddSession}
        onToggleTodoComplete={onToggleTodoComplete}
      />
      <WeekendDialog
        open={showWeekendDialog}
        onClose={() => setShowWeekendDialog(false)}
      />
    </DndContext>
  );
}
