import { useEffect, useState } from "react";
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
  const [addTodoState, addTodo] = useAddTodo();
  const [editTodoState, editTodo] = useEditTodo();
  const [deleteTodoState, deleteTodo] = useDeleteTodo();
  const hittingWood = useHittingWood();

  // Convert Firebase todos to App todos format
  const todos: Todo[] = firebaseTodos.map((todo) => ({
    id: todo.id,
    text: todo.description,
    url: undefined, // URL not yet supported in Firebase schema
    completed: todo.completed,
    date: todo.date.toISOString().split("T")[0],
  }));

  const handleAddTodo = (todo: Omit<Todo, "id">) => {
    const dateObj = new Date(todo.date);

    // Find last position for this date
    const todosForDate = firebaseTodos
      .filter((t) => t.date.toISOString().split("T")[0] === todo.date)
      .sort((a, b) => a.position.localeCompare(b.position));

    const lastPosition = todosForDate.length > 0
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
      .filter((t) => t.date.toISOString().split("T")[0] === newDate && t.id !== todoId)
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

  return (
    <Calendar
      todos={todos}
      onAddTodo={handleAddTodo}
      onToggleTodoComplete={toggleTodoComplete}
      onMoveTodo={moveTodo}
      onUpdateTodo={updateTodo}
      onDeleteTodo={handleDeleteTodo}
    />
  );
}

function AppContent() {
  const [version, setVersion] = useState<string>("");
  const [authentication] = useAuthentication();

  // Initialize theme system
  useTheme();

  useEffect(() => {
    // Works only when running inside Electron
    window.native
      ?.getVersion?.()
      .then(setVersion)
      .catch(() => {});
  }, []);

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <TopBar />
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
