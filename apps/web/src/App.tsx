import {} from "react";
import { CacheProvider } from "pipesy";
import Calendar from "./Calendar";
import AuthModal from "./AuthModal";
import TopBar from "./TopBar";
import { useAuthentication } from "./hooks/useAuthentication";
import { useTodos } from "./hooks/useTodos";
import { useAddTodo } from "./hooks/useAddTodo";
import { useEditTodo } from "./hooks/useEditTodo";
import { useDeleteTodo } from "./hooks/useDeleteTodo";
import { generateKeyBetween } from "fractional-indexing";
import { useHittingWood } from "./hooks/useHittingWood";
import { useTheme } from "./hooks/useTheme";

export interface Todo {
  id: string;
  text: string;
  url?: string;
  completed: boolean;
  date: string; // ISO date string (YYYY-MM-DD)
}

function AuthenticatedApp() {
  const firebaseTodos = useTodos();
  const [, addTodo] = useAddTodo();
  const [, editTodo] = useEditTodo();
  const [, deleteTodo] = useDeleteTodo();
  const hittingWood = useHittingWood();

  // Convert Firebase todos to App todos format
  const todos: Todo[] = firebaseTodos.map((todo) => ({
    id: todo.id,
    text: todo.description,
    url: undefined, // URL not yet supported in Firebase schema
    completed: todo.completed,
    date: todo.date.toISOString().split("T")[0],
  }));

  // Get Monday of current week
  const getCurrentWeekMonday = () => {
    const today = new Date();
    const currentDay = today.getDay();
    const daysToMonday = currentDay === 0 ? 6 : currentDay - 1;
    const monday = new Date(today);
    monday.setDate(today.getDate() - daysToMonday);
    monday.setHours(0, 0, 0, 0);
    return monday;
  };

  // Count uncompleted todos from before current week
  const getOldUncompletedTodos = () => {
    const currentWeekMonday = getCurrentWeekMonday();
    return todos.filter((todo) => {
      if (todo.completed) return false;
      const todoDate = new Date(todo.date);
      return todoDate < currentWeekMonday;
    });
  };

  const oldUncompletedTodos = getOldUncompletedTodos();

  const handleAddTodo = (todo: Omit<Todo, "id">) => {
    const dateObj = new Date(todo.date);

    // Find last position for this date
    const todosForDate = firebaseTodos
      .filter((t) => t.date.toISOString().split("T")[0] === todo.date)
      .sort((a, b) => a.position.localeCompare(b.position));

    const lastPosition =
      todosForDate.length > 0
        ? todosForDate[todosForDate.length - 1].position
        : null;

    addTodo({ description: todo.text, date: dateObj, lastPosition });
  };

  const toggleTodoComplete = (todoId: string) => {
    const todo = firebaseTodos.find((t) => t.id === todoId);
    if (!todo) return;

    // Play sound when completing a todo
    if (!todo.completed) {
      hittingWood.play();
    }

    editTodo({
      id: todoId,
      description: todo.description,
      completed: !todo.completed,
      date: todo.date,
    });
  };

  const moveTodo = (todoId: string, newDate: string, newIndex?: number) => {
    const todo = firebaseTodos.find((t) => t.id === todoId);
    if (!todo) return;

    // Get todos for target date, sorted by position (excluding the dragged todo)
    const todosInTargetDate = firebaseTodos
      .filter(
        (t) => t.date.toISOString().split("T")[0] === newDate && t.id !== todoId
      )
      .sort((a, b) => a.position.localeCompare(b.position));

    let newPosition: string;

    if (newIndex === undefined) {
      // Moving to a date without specific position - place at end
      const lastTodo = todosInTargetDate[todosInTargetDate.length - 1];
      newPosition = generateKeyBetween(lastTodo?.position || null, null);
    } else {
      // Moving to specific position
      const beforeTodo = todosInTargetDate[newIndex - 1];
      const afterTodo = todosInTargetDate[newIndex];
      newPosition = generateKeyBetween(
        beforeTodo?.position || null,
        afterTodo?.position || null
      );
    }

    // Convert string date to Date object
    const dateObj = new Date(newDate);

    editTodo({
      id: todoId,
      description: todo.description,
      completed: todo.completed,
      date: dateObj,
      position: newPosition,
    });
  };

  const updateTodo = (todoId: string, text: string) => {
    const todo = firebaseTodos.find((t) => t.id === todoId);
    if (!todo) return;

    editTodo({
      id: todoId,
      description: text,
      completed: todo.completed,
      date: todo.date,
    });
  };

  const handleDeleteTodo = (todoId: string) => {
    deleteTodo({ id: todoId });
  };

  const moveOldTodosToNextWorkday = () => {
    const today = new Date();
    const dayOfWeek = today.getDay();

    let targetDate = new Date(today);

    // If it's Saturday (6), move to Monday (+2 days)
    // If it's Sunday (0), move to Monday (+1 day)
    // Otherwise, use today
    if (dayOfWeek === 6) {
      targetDate.setDate(today.getDate() + 2);
    } else if (dayOfWeek === 0) {
      targetDate.setDate(today.getDate() + 1);
    }

    const targetDateString = targetDate.toISOString().split("T")[0];
    oldUncompletedTodos.forEach((todo) => {
      moveTodo(todo.id, targetDateString);
    });
  };

  return (
    <>
      <TopBar
        oldTodoCount={oldUncompletedTodos.length}
        onMoveOldTodos={moveOldTodosToNextWorkday}
      />
      <Calendar
        todos={todos}
        onAddTodo={handleAddTodo}
        onToggleTodoComplete={toggleTodoComplete}
        onMoveTodo={moveTodo}
        onUpdateTodo={updateTodo}
        onDeleteTodo={handleDeleteTodo}
      />
    </>
  );
}

function AppContent() {
  const authentication = useAuthentication();

  // Initialize theme system
  useTheme();

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <div className="flex-1 overflow-hidden">
        {authentication.user ? (
          <AuthenticatedApp />
        ) : (
          <Calendar
            todos={[]}
            onAddTodo={() => {}}
            onToggleTodoComplete={() => {}}
            onMoveTodo={() => {}}
            onUpdateTodo={() => {}}
            onDeleteTodo={() => {}}
          />
        )}
      </div>
      <AuthModal
        open={!authentication.isAuthenticating && !authentication.user}
      />
    </div>
  );
}

export default function App() {
  return (
    <CacheProvider>
      <AppContent />
    </CacheProvider>
  );
}
