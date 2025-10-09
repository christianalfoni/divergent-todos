import { pipe } from "pipesy";
import { todosCollection, type Todo } from "../firebase";
import { doc, updateDoc } from "firebase/firestore";
import { useAuthentication } from "./useAuthentication";
import { useTodos } from "./useTodos";
import { useRef } from "react";

export type EditTodoState =
  | {
      isEditing: true;
      error: null;
    }
  | {
      isEditing: false;
      error: null;
    }
  | {
      isEditing: false;
      error: string;
    };

export function useEditTodo() {
  const [authentication] = useAuthentication();
  const userRef = useRef(authentication.user);
  const { setTodos } = useTodos();

  userRef.current = authentication.user;

  return pipe<
    EditTodoState,
    Pick<Todo, "id" | "completed" | "date" | "description"> & {
      position?: string;
    }
  >()
    .setState({ isEditing: true, error: null })
    .map((updates) => {
      // Optimistic update
      setTodos((todos) =>
        todos.map((todo) =>
          todo.id === updates.id
            ? { ...todo, ...updates }
            : todo
        )
      );
      return updates;
    })
    .async(({ id, description, completed, date, position }) => {
      const todoDoc = doc(todosCollection, id);

      if (!userRef.current) {
        throw new Error("can not edit todo without a user");
      }

      return updateDoc(todoDoc, {
        completed,
        description,
        date,
        ...(position ? { position } : {}),
      });
    })
    .map(() => ({ isEditing: false, error: null }))
    .catch((err) => ({ isEditing: false, error: String(err) }))
    .use({ isEditing: false, error: null });
}
