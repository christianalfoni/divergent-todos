import { useEffect, useState } from "react";
import { CacheProvider } from "pipesy";
import Calendar from "./Calendar";
import AuthModal from "./AuthModal";
import { useAuthentication } from "./hooks/useAuthentication";
import { useTodos } from "./hooks/useTodos";
import { useAddTodo } from "./hooks/useAddTodo";
import { useEditTodo } from "./hooks/useEditTodo";

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

  // Convert Firebase todos to App todos format
  const todos: Todo[] = firebaseTodos.map((todo) => ({
    id: todo.id,
    text: todo.description,
    url: undefined, // URL not yet supported in Firebase schema
    completed: todo.completed,
    date: todo.date.toISOString().split("T")[0],
  }));

  console.log("WTF", todos);

  const handleAddTodo = (todo: Omit<Todo, "id">) => {
    const dateObj = new Date(todo.date);
    addTodo({ description: todo.text, date: dateObj });
  };

  const toggleTodoComplete = (todoId: string) => {
    const todo = firebaseTodos.find((t) => t.id === todoId);
    if (!todo) return;

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

    // Convert string date to Date object
    const dateObj = new Date(newDate);

    editTodo({
      id: todoId,
      description: todo.description,
      completed: todo.completed,
      date: dateObj,
    });
  };

  return (
    <Calendar
      todos={todos}
      onAddTodo={handleAddTodo}
      onToggleTodoComplete={toggleTodoComplete}
      onMoveTodo={moveTodo}
    />
  );
}

function AppContent() {
  const [version, setVersion] = useState<string>("");
  const [authentication] = useAuthentication();

  useEffect(() => {
    // Works only when running inside Electron
    window.native
      ?.getVersion?.()
      .then(setVersion)
      .catch(() => {});
  }, []);

  return (
    <>
      {authentication.user ? (
        <AuthenticatedApp />
      ) : (
        <Calendar
          todos={[]}
          onAddTodo={() => {}}
          onToggleTodoComplete={() => {}}
          onMoveTodo={() => {}}
        />
      )}
      <AuthModal
        open={!authentication.isAuthenticating && !authentication.user}
      />
    </>
  );
}

export default function App() {
  return (
    <CacheProvider>
      <AppContent />
    </CacheProvider>
  );
}
