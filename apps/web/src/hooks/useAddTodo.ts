import { pipe } from "pipesy";
import { todosCollection } from "../firebase";
import { doc, serverTimestamp, setDoc } from "firebase/firestore";
import { useAuthentication } from "./useAuthentication";
import { useRef } from "react";

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

  return pipe<AddTodoState, { description: string; date: Date }>()
    .setState({ isAdding: true, error: null })
    .async(({ description, date }) => {
      const todoDoc = doc(todosCollection);

      if (!userRef.current) {
        throw new Error("can not add todo without a user");
      }

      return setDoc(todoDoc, {
        completed: false,
        createdAt: serverTimestamp(),
        date,
        updatedAt: serverTimestamp(),
        description,
        id: todoDoc.id,
        userId: userRef.current.uid,
      });
    })
    .map(() => ({ isAdding: false, error: null }))
    .catch((err) => ({ isAdding: false, error: String(err) }))
    .use({ isAdding: false, error: null });
}
