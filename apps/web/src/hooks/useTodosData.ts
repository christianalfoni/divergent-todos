import { useTodos } from "./useTodos";
import { convertFirebaseTodoToAppTodo } from "../utils/todos";
import { useDerived } from "rask-ui";

export function useTodosData() {
  const firebaseTodos = useTodos();

  return useDerived({
    todos: () => firebaseTodos.data.map(convertFirebaseTodoToAppTodo),
    isLoading: () => firebaseTodos.isLoading,
  });
}
