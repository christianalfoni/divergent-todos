import { pipe } from "pipesy";
import { todosCollection } from "../firebase";
import { doc, serverTimestamp, setDoc } from "firebase/firestore";
import { useAuthentication } from "./useAuthentication";
import { useRef } from "react";
import { generateKeyBetween } from "fractional-indexing";

export type AddTodoState =
  | {
      isAdding: true;
      error: null;
    }
  | {
      isAdding: false;
      error: null;
    }
  | {
      isAdding: false;
      error: string;
    };

export function useAddTodo() {
  const [authentication] = useAuthentication();
  const userRef = useRef(authentication.user);

  userRef.current = authentication.user;

  return pipe<
    AddTodoState,
    { description: string; date: Date; lastPosition: string | null }
  >()
    .setState({ isAdding: true, error: null })
    .async(({ description, date, lastPosition }) => {
      const todoDoc = doc(todosCollection);

      if (!userRef.current) {
        throw new Error("can not add todo without a user");
      }

      // Generate position for new todo at the end of the day
      const position = generateKeyBetween(lastPosition, null);

      // Bypass converter to use serverTimestamp() directly
      return setDoc(doc(todosCollection.firestore, "todos", todoDoc.id), {
        userId: userRef.current.uid,
        description,
        completed: false,
        date,
        position,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    })
    .map(() => ({ isAdding: false, error: null } as const))
    .catch((err) => ({ isAdding: false, error: String(err) }))
    .use({ isAdding: false, error: null } as const);
}
