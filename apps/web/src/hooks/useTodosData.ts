import { useMemo } from "react";
import { useTodos } from "./useTodos";
import { convertFirebaseTodoToAppTodo } from "../utils/todos";
import type { Todo } from "../App";

export function useTodosData() {
  const { isLoading: todosLoading, data: firebaseTodos, connectionStatus, connectionError } = useTodos();

  const todos: Todo[] = useMemo(() => {
    return firebaseTodos.map(convertFirebaseTodoToAppTodo);
  }, [firebaseTodos]);

  return {
    todos,
    isLoading: todosLoading,
    connectionStatus,
    connectionError,
  };
}
