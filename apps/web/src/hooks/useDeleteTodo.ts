import { pipe } from "pipesy";
import { todosCollection } from "../firebase";
import { doc, deleteDoc } from "firebase/firestore";
import { useAuthentication } from "./useAuthentication";
import { useRef } from "react";

export type DeleteTodoState =
  | {
      isDeleting: true;
      error: null;
    }
  | {
      isDeleting: false;
      error: null;
    }
  | {
      isDeleting: false;
      error: string;
    };

export function useDeleteTodo() {
  const [authentication] = useAuthentication();
  const userRef = useRef(authentication.user);

  userRef.current = authentication.user;

  return pipe<DeleteTodoState, { id: string }>()
    .setState({ isDeleting: true, error: null })
    .async(({ id }) => {
      const todoDoc = doc(todosCollection, id);

      if (!userRef.current) {
        throw new Error("can not delete todo without a user");
      }

      return deleteDoc(todoDoc);
    })
    .map(() => ({ isDeleting: false, error: null }))
    .catch((err) => ({ isDeleting: false, error: String(err) }))
    .use({ isDeleting: false, error: null });
}
