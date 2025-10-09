import { useMemo } from "react";
import { useTodos } from "./useTodos";
import { useOnboarding } from "../contexts/OnboardingContext";
import { convertFirebaseTodoToAppTodo } from "../utils/todos";
import type { Todo } from "../App";

export function useTodosData() {
  const { isLoading: todosLoading, data: firebaseTodos } = useTodos();
  const onboarding = useOnboarding();

  const todos: Todo[] = useMemo(() => {
    if (onboarding.isOnboarding) {
      return onboarding.todos
        .slice()
        .sort((a, b) => {
          const dateCompare = a.date.toISOString().localeCompare(b.date.toISOString());
          if (dateCompare !== 0) return dateCompare;
          // Use standard string comparison, not localeCompare, to match fractional-indexing library
          if (a.position < b.position) return -1;
          if (a.position > b.position) return 1;
          return 0;
        })
        .map((todo) => ({
          id: todo.id,
          text: todo.description,
          url: undefined,
          completed: todo.completed,
          date: todo.date.toISOString().split("T")[0],
          position: todo.position,
        }));
    }

    return firebaseTodos.map(convertFirebaseTodoToAppTodo);
  }, [onboarding.isOnboarding, onboarding.todos, firebaseTodos]);

  const isLoading = !onboarding.isOnboarding && todosLoading;

  return {
    todos,
    isLoading,
  };
}
