import { pipe } from "pipesy";
import { todosCollection, type Todo } from "../firebase";
import { doc, writeBatch } from "firebase/firestore";
import { useAuthentication } from "./useAuthentication";
import { useTodos } from "./useTodos";
import { useRef } from "react";
import { db } from "../firebase";

export type BatchEditTodosState =
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

export function useBatchEditTodos() {
  const [authentication] = useAuthentication();
  const userRef = useRef(authentication.user);
  const { setTodos } = useTodos();

  userRef.current = authentication.user;

  return pipe<
    Array<
      Pick<Todo, "id" | "completed" | "date" | "description"> & {
        position?: string;
      }
    >,
    BatchEditTodosState
  >()
    .setState({ isEditing: true, error: null })
    .map((updates) => {
      // Optimistic update - apply all changes at once
      setTodos(({ data }) => ({
        isLoading: false,
        data: data.map((todo) => {
          const update = updates.find((u) => u.id === todo.id);
          return update ? { ...todo, ...update } : todo;
        }),
      }));
      return updates;
    })
    .async((updates) => {
      if (!userRef.current) {
        throw new Error("can not edit todos without a user");
      }

      // Create a batch
      const batch = writeBatch(db);

      // Add all updates to the batch
      updates.forEach(({ id, description, completed, date, position }) => {
        const todoDoc = doc(todosCollection, id);
        batch.update(todoDoc, {
          completed,
          description,
          date,
          ...(position ? { position } : {}),
        });
      });

      // Commit the batch
      return batch.commit();
    })
    .map(() => ({ isEditing: false, error: null }))
    .catch((err) => ({ isEditing: false, error: String(err) }))
    .use({ isEditing: false, error: null });
}
